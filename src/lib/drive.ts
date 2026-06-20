import type { UserData } from '@/types';
import { store } from '@/lib/store';
import { encryptData, decryptData } from '@/lib/crypto';
import { migrate, wrap, merge, ForwardCompatError } from '@/lib/schema';

/**
 * End-to-end-encrypted sync of the journal to the user's own Google Drive
 * (the hidden per-app `appDataFolder`). Drive only ever stores ciphertext —
 * the passphrase never leaves the device. Auth uses Google Identity Services'
 * token model (no refresh token), so we acquire tokens silently while the
 * Google session is active and fall back to interactive consent.
 */

declare global {
  interface Window {
    // GIS is loaded via a <script> in index.html; typed loosely on purpose.
     
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'almond.enc';

const CONNECTED_KEY = 'almond-drive-connected';
const PASS_KEY = 'almond-drive-passphrase';
const LAST_SYNC_KEY = 'almond-drive-last-sync';
// The connected account's email, used as a token-request `hint` so an
// already-connected device re-acquires tokens silently (no account chooser)
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
  accessToken = null;
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

// --- Google Identity Services token (in-memory only) ------------------------

 
let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiry = 0;
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null =
  null;

function ensureClient(): void {
  if (tokenClient) return;
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('gis-unavailable');
  tokenClient = oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
     
    callback: (resp: any) => {
      if (resp.error) {
        pending?.reject(new Error(resp.error));
      } else {
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + Number(resp.expires_in ?? 3600) * 1000 - 60_000;
        pending?.resolve(accessToken!);
      }
      pending = null;
    },
     
    error_callback: (err: any) => {
      pending?.reject(new Error(err?.type ?? 'oauth_error'));
      pending = null;
    },
  });
}

function requestToken(interactive: boolean): Promise<string> {
  ensureClient();
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    const email = localStorage.getItem(EMAIL_KEY);
    tokenClient.requestAccessToken({
      prompt: interactive ? 'consent' : '',
      ...(email ? { hint: email } : {}),
    });
  });
}

async function getToken(interactive: boolean): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  return requestToken(interactive);
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
    token = await getToken(interactive);
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
    await store.replaceData(merged);
    const out = await encryptData(JSON.stringify(wrap(merged)), passphrase);
    if (id) await updateFile(token, id, out);
    else await createFile(token, out);
    markSynced();
    return { ok: true };
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
    token = await getToken(true);
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
