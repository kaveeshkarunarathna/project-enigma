/**
 * Progress rules for Night Atlas. Pure functions, so they are easy to test
 * and the same numbers show everywhere.
 *
 * Reward rhythm:
 * - every session adds stardust to its book and brightens the book's star;
 * - every chapter (or every 20 logged pages when chapters are unknown) lights
 *   a bead on the ring around the book's star;
 * - a finished book ignites its star;
 * - every night with reading adds a star to the reader's sky.
 */

export const PAGES_PER_BEAD = 20;
export const STARDUST_PER_MINUTE = 1;
export const STARDUST_PER_BEAD = 5;
export const MAX_RING_BEADS = 24;

export type BookProgressInput = {
  pageCount: number | null;
  chapterCount: number | null;
  currentPage: number;
  chaptersDone: number;
  finished: boolean;
};

/** How many beads sit on the ring around a book's star. */
export function ringSize(book: Pick<BookProgressInput, 'pageCount' | 'chapterCount'>): number {
  if (book.chapterCount && book.chapterCount > 0) return Math.min(book.chapterCount, MAX_RING_BEADS);
  if (book.pageCount && book.pageCount > 0) {
    return Math.min(Math.max(Math.ceil(book.pageCount / PAGES_PER_BEAD), 1), MAX_RING_BEADS);
  }
  return 12;
}

/** How many of the ring's beads are lit. */
export function litBeads(book: BookProgressInput): number {
  const size = ringSize(book);
  if (book.finished) return size;
  if (book.chapterCount && book.chapterCount > 0) {
    const ratio = Math.min(book.chaptersDone / book.chapterCount, 1);
    return Math.min(Math.floor(ratio * size + 1e-9), size);
  }
  if (book.pageCount && book.pageCount > 0) {
    const ratio = Math.min(book.currentPage / book.pageCount, 1);
    return Math.min(Math.floor(ratio * size + 1e-9), size);
  }
  return Math.min(Math.floor(book.currentPage / PAGES_PER_BEAD), size);
}

/** 0..1 completion of a book, used for the star's brightness. */
export function bookCompletion(book: BookProgressInput): number {
  if (book.finished) return 1;
  if (book.chapterCount && book.chapterCount > 0) return clamp01(book.chaptersDone / book.chapterCount);
  if (book.pageCount && book.pageCount > 0) return clamp01(book.currentPage / book.pageCount);
  return 0;
}

/**
 * Star brightness: never fully dark once a book is started, so the first
 * session already makes a visible difference.
 */
export function starBrightness(completion: number, started: boolean): number {
  if (!started) return 0.25;
  return 0.45 + 0.55 * clamp01(completion);
}

/** Stardust earned by one session. */
export function sessionStardust(seconds: number, beadsLit: number): number {
  const minutes = Math.floor(Math.max(seconds, 0) / 60);
  return minutes * STARDUST_PER_MINUTE + Math.max(beadsLit, 0) * STARDUST_PER_BEAD;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}
