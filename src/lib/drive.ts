import type { UserData } from '@/types';
import { store } from '@/lib/store';
import { encryptData, decryptData } from '@/lib/crypto';
import { migrate, wrap, merge, hasEntities, ForwardCompatError } from '@/lib/schema';

/**
 * End-to-end-encrypted sync of the journal to the user's own Google Drive
 * (the hidden per-app `appDataFolder`). Drive only ever stores ciphertext —
 * the passphrase never leaves the device. Auth is Google's OAuth token flow by
 * full-page redirect (no refresh token): a user action (Connect / Sync now /
 * pairing) acquires an hour-long token, and background syncs ride it while it
 * lasts.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'almond.enc';

const CONNECTED_KEY = 'almond-drive-connected';
const PASS_KEY = 'almond-drive-passphrase';
const LAST_SYNC_KEY = 'almond-drive-last-sync';
// The connected account's email, used as the token request's `login_hint` so
// an already-connected device re-acquires tokens without the account chooser
// even when several Google accounts are signed in.
const EMAIL_KEY = 'almond-drive-email';

export type SyncResult = {
  ok: boolean;
  reason?:
    | 'not-configured'
    | 'no-passphrase'
    | 'auth'
    | 'bad-passphrase'
    | 'needs-pairing'
    | 'forward-compat'
    | 'error';
  // True when the pull merged in remote changes the open UI isn't showing yet
  // (a new/edited/deleted record from another device). Lets passive syncs
  // decide whether the screen needs refreshing.
  changed?: boolean;
};

export function isConfigured(): boolean {
  return !!CLIENT_ID;
}

function getPassphrase(): string | null {
  return localStorage.getItem(PASS_KEY);
}

export function isConnected(): boolean {
  return localStorage.getItem(CONNECTED_KEY) === '1' && !!getPassphrase();
}

export function lastSync(): number | null {
  const v = localStorage.getItem(LAST_SYNC_KEY);
  return v ? Number(v) : null;
}

export function disconnect(): void {
  localStorage.removeItem(CONNECTED_KEY);
  localStorage.removeItem(PASS_KEY);
  localStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

function markConnected(passphrase: string): void {
  localStorage.setItem(PASS_KEY, passphrase);
  localStorage.setItem(CONNECTED_KEY, '1');
}

/** A high-entropy random sync key (the secret, transferred device-to-device
 *  via the pairing QR — never typed by the user). */
function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Apply a sync key received from another device (via the /link QR/deep-link). */
export function applyPairingKey(key: string): void {
  markConnected(key);
}

/** Deep link that carries the sync key in the URL fragment (never sent to any
 *  server). Encoded as a QR on a connected device so a new device can pair by
 *  scanning it with its native camera. Null when not connected. */
export function getLinkUrl(): string | null {
  const key = getPassphrase();
  if (!key) return null;
  return `${location.origin}/link#k=${encodeURIComponent(key)}`;
}

function markSynced(): void {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}

// --- Google OAuth token (full-page redirect, no popup) ----------------------
//
// Google Identity Services' token client only ever works through a popup
// window, and on macOS Chrome (151–154) a popup opened from the installed
// Almond window crashes the whole browser: with or without a user gesture. So
// we run the same OAuth token flow by navigating the app's own window to
// Google and back. It needs `${origin}/auth` registered as an authorized
// redirect URI on the OAuth client.

const TOKEN_KEY = 'almond-drive-token';
const REDIRECT_KEY = 'almond-drive-redirect';
const REDIRECT_PATH = '/auth';

/** What the user was doing when we left for Google, resumed on return. */
export type AuthIntent = 'connect' | 'sync';
export type AuthReturn = { intent: AuthIntent; ok: boolean };

let authReturn: AuthReturn | null = null;

// sessionStorage, not memory: the token has to survive our own reloads (the
// round trip to Google, the refresh after a sync). It's scoped to this window
// and gone when it closes.
function readToken(): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null');
    return saved && Date.now() < saved.expiry ? saved.token : null;
  } catch {
    return null;
  }
}

function saveToken(token: string, expiresInSec: number): void {
  const expiry = Date.now() + expiresInSec * 1000 - 60_000;
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiry }));
}

function redirectToGoogle(intent: AuthIntent): Promise<never> {
  const state = generateKey(); // CSRF guard: the token must answer our request
  const returnTo = location.pathname + location.search;
  sessionStorage.setItem(REDIRECT_KEY, JSON.stringify({ state, intent, returnTo }));
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: location.origin + REDIRECT_PATH,
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  const email = localStorage.getItem(EMAIL_KEY);
  if (email) params.set('login_hint', email);
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  return new Promise(() => {}); // never settles: the page is navigating away
}

/**
 * Run once at startup, before the router reads the URL. If Google just sent us
 * back to /auth, keep the token, put the URL back where the user was, and
 * remember what they were doing (read later via takeAuthReturn).
 */
export function consumeAuthRedirect(): void {
  if (location.pathname !== REDIRECT_PATH) return;
  const params = new URLSearchParams(location.hash.slice(1));
  let saved: { state: string; intent: AuthIntent; returnTo: string } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(REDIRECT_KEY) ?? 'null');
  } catch {
    // corrupted: treat as unsolicited
  }
  sessionStorage.removeItem(REDIRECT_KEY);
  history.replaceState(null, '', saved?.returnTo ?? '/');
  if (!saved || params.get('state') !== saved.state) return;
  const token = params.get('access_token');
  let ok = false;
  if (token) {
    try {
      saveToken(token, Number(params.get('expires_in') ?? 3600));
      ok = true; // ok ⇒ a stored token, so resuming can't bounce back to Google
    } catch {
      // storage unavailable: report it as a failed sign-in
    }
  }
  authReturn = { intent: saved.intent, ok };
}

/** The result of a redirect that completed on this page load, if any. */
export function takeAuthReturn(): AuthReturn | null {
  const r = authReturn;
  authReturn = null;
  return r;
}

/** A valid token, or a redirect to Google for one. Passive syncs pass no intent:
 *  leaving the page is only ever a response to the user doing something. */
async function getToken(intent: AuthIntent | null): Promise<string> {
  const token = readToken();
  if (token) return token;
  if (!intent) throw new Error('needs-interaction');
  return redirectToGoogle(intent);
}

// --- Drive v3 REST (bare fetch, appDataFolder space) ------------------------

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

async function findFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await fetch(
    `${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`drive-list-${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function downloadCipher(token: string, id: string): Promise<string> {
  const res = await fetch(`${API}/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`drive-download-${res.status}`);
  return res.text();
}

async function createFile(token: string, content: string): Promise<void> {
  const boundary = 'almondsync';
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })}\r\n` +
    `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n` +
    `${content}\r\n--${boundary}--`;
  const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`drive-create-${res.status}`);
}

async function updateFile(
  token: string,
  id: string,
  content: string
): Promise<void> {
  const res = await fetch(`${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  });
  if (!res.ok) throw new Error(`drive-update-${res.status}`);
}

/** Capture the connected account's email once (via the Drive `about` endpoint,
 *  no extra scope) so future token requests can hint it and stay silent. */
async function ensureEmail(token: string): Promise<void> {
  if (localStorage.getItem(EMAIL_KEY)) return;
  try {
    const res = await fetch(`${API}/about?fields=user(emailAddress)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const email = data.user?.emailAddress;
    if (email) localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // best-effort; without it we just fall back to the account chooser
  }
}

// --- Sync orchestration -----------------------------------------------------

/**
 * A stable, order-independent fingerprint of a journal's *observable* state.
 * Records are immutable (create + soft-delete) so the only changes that matter
 * are: a record appearing, a deletion (tombstone), or entities arriving. Two
 * journals with the same signature look identical on screen — so comparing
 * signatures tells us whether a pull changed anything (→ refresh the UI) and
 * whether our merged view differs from the remote blob (→ worth re-uploading).
 */
function signature(d: UserData): string {
  const boards = d.boards.map((b) => `${b.id}:${b.isDeleted ? 1 : 0}`).sort();
  const entries = d.entries
    .map((e) => `${e.id}:${e.isDeleted ? 1 : 0}:${hasEntities(e.entities) ? 1 : 0}`)
    .sort();
  return boards.join(',') + '|' + entries.join(',');
}

/**
 * Pull → merge → push. Correctness comes from the merge (union by id, tombstone
 * wins), so even a lost upload race converges on the next sync. `interactive`
 * controls whether a missing token may prompt the user for consent.
 */
export async function sync(interactive = false): Promise<SyncResult> {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' };
  const passphrase = getPassphrase();
  if (!passphrase) return { ok: false, reason: 'no-passphrase' };

  let token: string;
  try {
    token = await getToken(interactive ? 'sync' : null);
  } catch {
    return { ok: false, reason: 'auth' };
  }

  try {
    await ensureEmail(token);
    const id = await findFileId(token);
    let remote: UserData | null = null;
    if (id) {
      const cipher = await downloadCipher(token, id);
      remote = migrate(await decryptData(cipher, passphrase)).data;
    }
    const local = await store.snapshot();
    const merged = remote ? merge(local, remote) : local;
    const mergedSig = signature(merged);
    // Did the pull bring in anything the open UI isn't showing yet?
    const changed = remote ? mergedSig !== signature(local) : false;
    await store.replaceData(merged);
    // Only re-upload when our merged view differs from the remote blob, so a
    // passive open/focus sync doesn't rewrite an already-current file.
    const needsUpload = id ? mergedSig !== signature(remote!) : true;
    if (needsUpload) {
      const out = await encryptData(JSON.stringify(wrap(merged)), passphrase);
      if (id) await updateFile(token, id, out);
      else await createFile(token, out);
    }
    markSynced();
    return { ok: true, changed };
  } catch (e) {
    if (e instanceof ForwardCompatError) return { ok: false, reason: 'forward-compat' };
    if (e instanceof Error && e.name === 'OperationError') {
      return { ok: false, reason: 'bad-passphrase' }; // remote blob won't decrypt
    }
    return { ok: false, reason: 'error' };
  }
}

/**
 * Connect this device. First device (no remote file): generate a fresh sync key
 * and push. Already-keyed device: just sync. A device that finds an existing
 * remote journal but has no key must PAIR instead (returns `needs-pairing`) —
 * so we never create a divergent key or clobber the existing journal.
 */
export async function connect(): Promise<SyncResult> {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' };

  let token: string;
  try {
    token = await getToken('connect');
  } catch {
    return { ok: false, reason: 'auth' };
  }

  let id: string | null;
  try {
    id = await findFileId(token);
  } catch {
    return { ok: false, reason: 'error' };
  }

  const existingKey = getPassphrase();
  if (id && !existingKey) return { ok: false, reason: 'needs-pairing' };

  markConnected(existingKey ?? generateKey());
  const result = await sync(true);
  if (!result.ok && !existingKey) disconnect(); // roll back a fresh, failed setup
  return result;
}

// --- Debounced background sync (called from store mutations) ----------------

let timer: ReturnType<typeof setTimeout> | undefined;

export function requestSync(): void {
  if (!isConnected()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void sync(false).catch(() => {});
  }, 1500);
}
