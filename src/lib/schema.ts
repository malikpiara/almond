import type { UserData, Board, Entry } from '@/types';

/**
 * The versioned envelope that wraps Almond's journal data everywhere it's
 * persisted — local storage, the Google Drive blob, and the encrypted `.almond`
 * export. Versioning here is what lets future data-shape changes migrate
 * cleanly instead of corrupting older payloads.
 */

// Bump only when the *shape* of UserData changes; each bump needs a migration
// step below. Distinct from APP_VERSION, which is diagnostics-only.
export const CURRENT_SCHEMA_VERSION = 1;

// Diagnostics only — never drives migration logic.
export const APP_VERSION = '0.1.0';

export type Envelope = {
  kind: 'almond-journal';
  schemaVersion: number;
  appVersion: string;
  updatedAt: number;
  data: UserData;
};

/** Thrown when a payload was written by a newer Almond than this one understands. */
export class ForwardCompatError extends Error {
  constructor() {
    super(
      'This journal was written by a newer version of Almond. Please update Almond to continue.'
    );
    this.name = 'ForwardCompatError';
  }
}

const EMPTY: UserData = { boards: [], entries: [] };

function isEnvelope(v: unknown): v is Envelope {
  return (
    !!v &&
    typeof v === 'object' &&
    (v as Envelope).kind === 'almond-journal' &&
    typeof (v as Envelope).schemaVersion === 'number'
  );
}

function isBareUserData(v: unknown): v is UserData {
  return (
    !!v &&
    typeof v === 'object' &&
    Array.isArray((v as UserData).boards) &&
    Array.isArray((v as UserData).entries)
  );
}

// Forward migrations keyed by source version → next version's data shape.
// None yet (v1 is the baseline). Future: `{ 1: (v1) => v2Shape }`.
const MIGRATIONS: Record<number, (data: UserData) => UserData> = {};

export function wrap(data: UserData): Envelope {
  return {
    kind: 'almond-journal',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    updatedAt: Date.now(),
    data,
  };
}

/**
 * Normalize any stored / synced / imported payload to the current envelope.
 * Accepts a current Envelope, today's bare `{boards,entries}` (pre-envelope),
 * or a JSON string of either. Throws ForwardCompatError if the payload's
 * schemaVersion is newer than this build; throws on unrecognized data.
 */
export function migrate(raw: unknown): Envelope {
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (isEnvelope(value)) {
    if (value.schemaVersion > CURRENT_SCHEMA_VERSION) throw new ForwardCompatError();
    let data = value.data ?? EMPTY;
    for (let v = value.schemaVersion; v < CURRENT_SCHEMA_VERSION; v++) {
      const step = MIGRATIONS[v];
      if (step) data = step(data);
    }
    return {
      kind: 'almond-journal',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      updatedAt: value.updatedAt ?? Date.now(),
      data,
    };
  }

  // Pre-envelope bare data → treat as the v1 baseline.
  if (isBareUserData(value)) return wrap(value);

  throw new Error('Unrecognized Almond data.');
}

// --- Merge (last-write-wins, single-user device sync) -----------------------

function hasEntities(e?: Entry['entities']): boolean {
  return !!e && ((e.people?.length ?? 0) > 0 || (e.places?.length ?? 0) > 0);
}

/** Prefer the newer entry, but keep whichever side actually has entities
 *  (so the save-first / extract-after race converges). */
function combineEntry(winner: Entry, loser: Entry): Entry {
  if (!hasEntities(winner.entities) && hasEntities(loser.entities)) {
    return { ...winner, entities: loser.entities };
  }
  return winner;
}

function mergeRecords<T extends { id: string; isDeleted: boolean }>(
  a: T[],
  b: T[],
  ts: (x: T) => number,
  combine?: (winner: T, loser: T) => T
): T[] {
  const byId = new Map<string, T>();
  const consider = (item: T) => {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }
    // A deletion (tombstone) always wins, so deletes propagate across devices.
    if (existing.isDeleted !== item.isDeleted) {
      byId.set(item.id, existing.isDeleted ? existing : item);
      return;
    }
    const winner = ts(item) >= ts(existing) ? item : existing;
    const loser = winner === item ? existing : item;
    byId.set(item.id, combine ? combine(winner, loser) : winner);
  };
  a.forEach(consider);
  b.forEach(consider);
  return [...byId.values()];
}

/**
 * Merge two journals into one. Correct because records are immutable today
 * (create + soft-delete only). Editable entries will require a v2 bump adding
 * per-record `updatedAt` — keep this signature stable so that change stays here.
 */
export function merge(a: UserData, b: UserData): UserData {
  return {
    boards: mergeRecords(a.boards, b.boards, (x: Board) => x.createdAt),
    entries: mergeRecords(
      a.entries,
      b.entries,
      (x: Entry) => x.timestamp,
      combineEntry
    ),
  };
}
