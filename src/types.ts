export type UserData = {
  boards: Board[];
  entries: Entry[];
};

export type Board = {
  id: string;
  prompt: string;
  createdAt: number; // This is essentially just a timestamp.
  isDeleted: boolean;
};

/** A name as extracted from entries, aggregated across the journal. Not yet a
 *  stable identity: "Ana" and "Ana Silva" are two summaries until people can
 *  be merged. */
export type PersonSummary = {
  name: string;
  entryCount: number;
  lastMentionedAt: number;
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
