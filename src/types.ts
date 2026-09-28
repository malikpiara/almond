export type UserData = {
  boards: Board[];
  entries: Entry[];
  personLogs: PersonLog[];
};

/** One person you spent time with on one day, logged from the Today screen.
 *  Unlike entries these are edited after creation, so sync merges them by
 *  `updatedAt`. */
export type PersonLog = {
  id: string;
  person: string; // raw name, same identity rules as extracted people
  day: string; // local calendar day, yyyy-MM-dd
  theirShare: number | null; // 0–100: how much of the talking they did; null = not set
  notes: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
};

export type Board = {
  id: string;
  prompt: string;
  createdAt: number; // This is essentially just a timestamp.
  isDeleted: boolean;
};

/** A name as extracted from entries or logged on Today, aggregated across the
 *  journal. Not yet a stable identity: "Ana" and "Ana Silva" are two summaries
 *  until people can be merged. */
export type PersonSummary = {
  name: string;
  entryCount: number;
  logCount: number;
  lastSeenAt: number; // latest entry mentioning them, or latest log
};

export type Entry = {
  id: string;
  boardId: string;
  content: string;
  timestamp: number;
  isDeleted: boolean;
  entities?: {
    people: string[];
    places: string[];
  };
};
