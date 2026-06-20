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
