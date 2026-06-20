import type { UserData, Board, Entry } from '@/types';
import { generateBoardId, generateEntryId } from '@/utils/utils';
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

/** Full dataset including soft-deleted tombstones (needed for sync merges). */
function readRaw(): UserData {
  const raw = localStorage.getItem(KEY);
  if (raw == null) return { boards: [], entries: [] };
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
            id: generateBoardId(),
            prompt: DEFAULT_PROMPT,
            createdAt: Date.now(),
            isDeleted: false,
          },
        ],
        entries: [],
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
