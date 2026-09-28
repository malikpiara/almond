import type { UserData, Board, Entry, PersonLog, PersonSummary } from '@/types';
import {
  dayKey,
  generateBoardId,
  generateEntryId,
  generatePersonLogId,
} from '@/utils/utils';
import { migrate, wrap } from '@/lib/schema';

/**
 * The single persistence seam for Almond.
 *
 * Every read/write of journal data goes through here — no component touches
 * localStorage directly. The API is intentionally **async** and
 * **query-oriented** so the backing engine can move from localStorage to
 * SQLite-WASM / IndexedDB (or gain a Drive-sync layer) without changing a
 * single call site.
 *
 * On disk the value is a versioned {@link Envelope} (see schema.ts). Reads
 * migrate-on-read so legacy unversioned data upgrades transparently.
 */

const KEY = 'user-data';

const DEFAULT_PROMPT = 'What are you grateful for today?';
// Fixed id so the first-run default board seeded independently on each device
// converges to ONE board after a sync merge (instead of duplicating).
const DEFAULT_BOARD_ID = 'board_default';

/** Full dataset including soft-deleted tombstones (needed for sync merges). */
function readRaw(): UserData {
  const raw = localStorage.getItem(KEY);
  if (raw == null) return { boards: [], entries: [], personLogs: [] };
  return migrate(raw).data;
}

function writeRaw(data: UserData): void {
  localStorage.setItem(KEY, JSON.stringify(wrap(data)));
}

/** Fire a debounced background sync after a local mutation. Dynamically
 *  imported to avoid a static store↔drive import cycle, and a no-op until the
 *  user has connected Google Drive. */
function triggerSync(): void {
  void import('@/lib/drive')
    .then((m) => m.requestSync())
    .catch(() => {});
}

export const store = {
  /**
   * First-run seeding + sticky migration. Creates a default board the very
   * first time, and rewrites any legacy unversioned data into the current
   * envelope on load.
   */
  async init(): Promise<UserData> {
    const raw = localStorage.getItem(KEY);
    if (raw == null) {
      const seeded: UserData = {
        boards: [
          {
            id: DEFAULT_BOARD_ID,
            prompt: DEFAULT_PROMPT,
            createdAt: Date.now(),
            isDeleted: false,
          },
        ],
        entries: [],
        personLogs: [],
      };
      writeRaw(seeded);
      return seeded;
    }
    const data = migrate(raw).data;
    writeRaw(data); // sticky upgrade to the current envelope shape
    return data;
  },

  async getBoards(): Promise<Board[]> {
    return readRaw()
      .boards.filter((b) => !b.isDeleted)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  async getBoard(id: string): Promise<Board | undefined> {
    return readRaw().boards.find((b) => b.id === id && !b.isDeleted);
  },

  async getEntries(boardId: string): Promise<Entry[]> {
    return readRaw()
      .entries.filter((e) => e.boardId === boardId && !e.isDeleted)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  /**
   * Every person mentioned in a live entry or logged on Today, most recently
   * seen first. Names are raw strings (no merging yet), counted once per entry.
   * Entries of deleted boards are skipped: board tombstones don't cascade.
   */
  async getPeople(): Promise<PersonSummary[]> {
    const data = readRaw();
    const liveBoards = new Set(
      data.boards.filter((b) => !b.isDeleted).map((b) => b.id)
    );
    const byName = new Map<string, PersonSummary>();
    const see = (name: string, at: number, kind: 'entry' | 'log') => {
      if (!name.trim()) return;
      let person = byName.get(name);
      if (!person) {
        person = { name, entryCount: 0, logCount: 0, lastSeenAt: at };
        byName.set(name, person);
      }
      if (kind === 'entry') person.entryCount += 1;
      else person.logCount += 1;
      person.lastSeenAt = Math.max(person.lastSeenAt, at);
    };
    for (const entry of data.entries) {
      if (entry.isDeleted || !liveBoards.has(entry.boardId)) continue;
      for (const name of new Set(entry.entities?.people ?? [])) {
        see(name, entry.timestamp, 'entry');
      }
    }
    for (const log of data.personLogs) {
      if (!log.isDeleted) see(log.person, log.createdAt, 'log');
    }
    return [...byName.values()].sort(
      (a, b) => b.lastSeenAt - a.lastSeenAt || a.name.localeCompare(b.name)
    );
  },

  /** Live entries mentioning this exact extracted name, newest first, each
   *  with the board it belongs to. */
  async getPersonEntries(name: string): Promise<{ entry: Entry; board: Board }[]> {
    const data = readRaw();
    const liveBoards = new Map(
      data.boards.filter((b) => !b.isDeleted).map((b) => [b.id, b])
    );
    return data.entries
      .filter(
        (e) =>
          !e.isDeleted &&
          liveBoards.has(e.boardId) &&
          (e.entities?.people ?? []).includes(name)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((entry) => ({ entry, board: liveBoards.get(entry.boardId)! }));
  },

  /** Names in live entries written on this day, for one-tap logging. */
  async getPeopleMentionedOn(day: string): Promise<string[]> {
    const data = readRaw();
    const liveBoards = new Set(
      data.boards.filter((b) => !b.isDeleted).map((b) => b.id)
    );
    const names = new Set<string>();
    for (const e of data.entries) {
      if (e.isDeleted || !liveBoards.has(e.boardId)) continue;
      if (dayKey(e.timestamp) !== day) continue;
      for (const name of e.entities?.people ?? []) if (name.trim()) names.add(name);
    }
    return [...names];
  },

  // --- Person logs (the Today screen) ---------------------------------------

  /** Every live log, newest first. */
  async getPersonLogs(): Promise<PersonLog[]> {
    return readRaw()
      .personLogs.filter((l) => !l.isDeleted)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getPersonLogsFor(name: string): Promise<PersonLog[]> {
    return (await store.getPersonLogs()).filter((l) => l.person === name);
  },

  async getPersonLog(id: string): Promise<PersonLog | undefined> {
    return readRaw().personLogs.find((l) => l.id === id && !l.isDeleted);
  },

  /** Log a person for a day. One card per person per day: logging them again
   *  returns the existing card. */
  async logPerson(person: string, day: string): Promise<PersonLog> {
    const data = readRaw();
    const existing = data.personLogs.find(
      (l) => !l.isDeleted && l.person === person && l.day === day
    );
    if (existing) return existing;
    const now = Date.now();
    const log: PersonLog = {
      id: generatePersonLogId(),
      person,
      day,
      theirShare: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    writeRaw({ ...data, personLogs: [...data.personLogs, log] });
    triggerSync();
    return log;
  },

  async updatePersonLog(
    id: string,
    patch: Partial<Pick<PersonLog, 'theirShare' | 'notes'>>
  ): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      personLogs: data.personLogs.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l
      ),
    });
    triggerSync();
  },

  async deletePersonLog(id: string): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      personLogs: data.personLogs.map((l) =>
        l.id === id ? { ...l, isDeleted: true, updatedAt: Date.now() } : l
      ),
    });
    triggerSync();
  },

  async createBoard(prompt: string): Promise<Board> {
    const data = readRaw();
    const board: Board = {
      id: generateBoardId(),
      prompt,
      createdAt: Date.now(),
      isDeleted: false,
    };
    writeRaw({ ...data, boards: [...data.boards, board] });
    triggerSync();
    return board;
  },

  async createEntry(
    boardId: string,
    content: string,
    entities?: Entry['entities']
  ): Promise<Entry> {
    const data = readRaw();
    const entry: Entry = {
      id: generateEntryId(),
      boardId,
      content,
      timestamp: Date.now(),
      isDeleted: false,
      entities,
    };
    writeRaw({ ...data, entries: [entry, ...data.entries] });
    triggerSync();
    return entry;
  },

  /** Patch an existing entry's extracted entities (save-first / extract-after). */
  async setEntryEntities(id: string, entities: Entry['entities']): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      entries: data.entries.map((e) => (e.id === id ? { ...e, entities } : e)),
    });
    triggerSync();
  },

  async deleteEntry(id: string): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      entries: data.entries.map((e) =>
        e.id === id ? { ...e, isDeleted: true } : e
      ),
    });
    triggerSync();
  },

  /** Soft-delete a board (tombstone propagates across devices via sync). */
  async deleteBoard(id: string): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      boards: data.boards.map((b) =>
        b.id === id ? { ...b, isDeleted: true } : b
      ),
    });
    triggerSync();
  },

  // --- Sync hooks (used by src/lib/drive.ts) --------------------------------

  /** Full dataset including tombstones — the merge input for sync. */
  async snapshot(): Promise<UserData> {
    return readRaw();
  },

  /** Overwrite local data with a merged result. Does NOT re-trigger sync. */
  async replaceData(data: UserData): Promise<void> {
    writeRaw(data);
  },

  // --- Encrypted file backup/restore (used by utils.ts) ---------------------

  /** Current versioned envelope as a JSON string, or null when empty. */
  async exportRaw(): Promise<string | null> {
    if (localStorage.getItem(KEY) == null) return null;
    return JSON.stringify(wrap(readRaw()));
  },

  /** Migrate + persist an imported payload (may throw ForwardCompatError). */
  async importRaw(json: string): Promise<void> {
    writeRaw(migrate(json).data);
    triggerSync();
  },
};
