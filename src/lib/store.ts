import type { UserData, Board, Entry } from '@/types';
import { generateBoardId, generateEntryId } from '@/utils/utils';

/**
 * The single persistence seam for Almond.
 *
 * Every read/write of journal data goes through here — no component touches
 * localStorage directly. The API is intentionally **async** and
 * **query-oriented** so the backing engine can move from localStorage to
 * SQLite-WASM / IndexedDB (or gain a Drive-sync layer) without changing a
 * single call site. An async interface is a superset of a sync one, so
 * localStorage today wraps trivially in resolved promises.
 *
 * Tonight the implementation is still one `user-data` JSON object in
 * localStorage. The *interface* is what's future-proofed.
 */

const KEY = 'user-data';

const DEFAULT_PROMPT = 'What are you grateful for today?';

function readRaw(): UserData {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as UserData) : { boards: [], entries: [] };
}

function writeRaw(data: UserData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export const store = {
  /**
   * First-run seeding. Returns the full dataset, creating a default board the
   * very first time the app is opened. Replaces the duplicated useEffect logic
   * that previously lived in both pages.
   */
  async init(): Promise<UserData> {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as UserData;

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
  },

  async getBoards(): Promise<Board[]> {
    return readRaw().boards.filter((b) => !b.isDeleted);
  },

  async getBoard(id: string): Promise<Board | undefined> {
    return readRaw().boards.find((b) => b.id === id && !b.isDeleted);
  },

  async getEntries(boardId: string): Promise<Entry[]> {
    return readRaw().entries.filter(
      (e) => e.boardId === boardId && !e.isDeleted
    );
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
    return entry;
  },

  async deleteEntry(id: string): Promise<void> {
    const data = readRaw();
    writeRaw({
      ...data,
      entries: data.entries.map((e) =>
        e.id === id ? { ...e, isDeleted: true } : e
      ),
    });
  },

  /** Raw passthroughs used by the encrypted export/import in utils/utils.ts. */
  async exportRaw(): Promise<string | null> {
    return localStorage.getItem(KEY);
  },

  async importRaw(json: string): Promise<void> {
    localStorage.setItem(KEY, json);
  },
};
