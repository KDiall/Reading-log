export type ReadingStatus =
  | "WANT_TO_READ"
  | "CURRENTLY_READING"
  | "FINISHED"
  | "DNF"
  | "RE_READING";

export type BookFormat = "EBOOK" | "AUDIOBOOK";

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  WANT_TO_READ: "Want to Read",
  CURRENTLY_READING: "Currently Reading",
  FINISHED: "Finished",
  DNF: "Did Not Finish",
  RE_READING: "Re-Reading",
};

export const BOOK_FORMAT_LABELS: Record<BookFormat, string> = {
  EBOOK: "eBook",
  AUDIOBOOK: "Audiobook",
};

export interface SessionUser {
  userId: string;
}
