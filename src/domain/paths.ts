import { hash } from './sky';

export type PathStarState = 'finished' | 'reading' | 'shelf' | 'none';

type ShelfBook = {
  id: string;
  olWorkKey: string | null;
  title: string;
  author: string | null;
  status: string;
  /** For page-by-page glow. Missing means the book counts only when finished. */
  currentPage?: number;
  pageCount?: number | null;
};
type PathEntry = { olWorkKey: string | null; title: string; author: string | null };

/** Lowercase, no punctuation, no leading article, so "The Hobbit" matches "Hobbit". */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/^(the|a|an) /, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function surname(author: string | null): string {
  const parts = normalizeTitle(author ?? '').split(' ');
  return parts[parts.length - 1] ?? '';
}

/** Finds the shelf book that is this path entry, by catalog key or by title and author. */
export function matchShelfBook<T extends ShelfBook>(entry: PathEntry, shelf: T[]): T | null {
  if (entry.olWorkKey) {
    const byKey = shelf.find((b) => b.olWorkKey === entry.olWorkKey);
    if (byKey) return byKey;
  }
  const title = normalizeTitle(entry.title);
  const candidates = shelf.filter((b) => normalizeTitle(b.title) === title);
  if (candidates.length <= 1 || !entry.author) return candidates[0] ?? null;
  return candidates.find((b) => surname(b.author) === surname(entry.author)) ?? candidates[0];
}

export function starState(book: ShelfBook | null): PathStarState {
  if (!book) return 'none';
  if (book.status === 'finished') return 'finished';
  if (book.status === 'reading') return 'reading';
  return 'shelf';
}

/**
 * How far a star has filled, 0..1: a finished book is a whole star, a book
 * being read fills page by page, anything else has not begun.
 */
export function starFill(book: ShelfBook | null): number {
  if (!book) return 0;
  if (book.status === 'finished') return 1;
  if (!book.currentPage || !book.pageCount || book.pageCount <= 0) return 0;
  // Just short of whole until the reader marks it finished.
  return Math.min(book.currentPage / book.pageCount, 0.99);
}

export type PathProgress = {
  states: PathStarState[];
  /** 0..1 per star, page by page. */
  fills: number[];
  finished: number;
  total: number;
  /** 0..1 of the whole constellation, counting pages in books being read. */
  fraction: number;
  complete: boolean;
};

export function pathProgress(entries: PathEntry[], shelf: ShelfBook[]): PathProgress {
  const books = entries.map((e) => matchShelfBook(e, shelf));
  const states = books.map(starState);
  const fills = books.map(starFill);
  const finished = states.filter((s) => s === 'finished').length;
  return {
    states,
    fills,
    finished,
    total: entries.length,
    fraction: entries.length ? fills.reduce((a, b) => a + b, 0) / entries.length : 0,
    complete: entries.length > 0 && finished === entries.length,
  };
}

/**
 * How much of the line from star `i` to star `i + 1` is drawn, 0..1. A line
 * starts drawing once its first star is whole, and reaches the next star as
 * that book is read, so the shape traces itself in, page by page.
 */
export function lineFill(fills: number[], i: number): number {
  if ((fills[i] ?? 0) < 1) return 0;
  return Math.min(Math.max(fills[i + 1] ?? 0, 0), 1);
}

/**
 * Where each star of a path's constellation sits, in a unit box (0..1).
 * A seeded wandering line from left to right, so every path has its own
 * recognisable shape, and the same shape on every phone.
 */
export function constellationPoints(pathId: string, count: number): { x: number; y: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0.5, y: 0.5 }];
  const points: { x: number; y: number }[] = [];
  let y = 0.25 + hash(`${pathId}:start`) * 0.5;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const jitterX = (hash(`${pathId}:x${i}`) - 0.5) * (0.5 / count);
    if (i > 0) {
      // Each star climbs or falls a clear amount, bouncing off the edges,
      // so the shape zigzags instead of drifting in a near-straight line.
      const dir = hash(`${pathId}:d${i}`) < 0.5 ? -1 : 1;
      y += dir * (0.18 + hash(`${pathId}:y${i}`) * 0.3);
      if (y > 0.88) y = 1.76 - y;
      if (y < 0.12) y = 0.24 - y;
      y = Math.min(0.88, Math.max(0.12, y));
    }
    points.push({ x: 0.1 + t * 0.8 + jitterX, y });
  }
  return points;
}

const PROMPT_GENRES = ['philosophy', 'classics', 'fantasy', 'scifi'] as const;
type ReaderGenre = (typeof PROMPT_GENRES)[number];
type FollowedPath = { genre: string | null; joinedAt: string | null; source: string; books: PathEntry[] };

/**
 * The kind of book the reader is in tonight, so prompts can lean that way.
 * A followed path that holds the book being read wins; otherwise the most
 * recently followed path with a genre. Null means any prompt will do.
 */
export function readerGenre(paths: FollowedPath[], current: ShelfBook | null): ReaderGenre | null {
  const followed = paths
    .filter((p) => (p.joinedAt || p.source === 'user') && PROMPT_GENRES.includes(p.genre as ReaderGenre))
    .sort((a, b) => (b.joinedAt ?? '').localeCompare(a.joinedAt ?? ''));
  if (current) {
    const holding = followed.find((p) => p.books.some((e) => matchShelfBook(e, [current]) === current));
    if (holding) return holding.genre as ReaderGenre;
  }
  return (followed[0]?.genre as ReaderGenre | undefined) ?? null;
}

type ShownPath = { joinedAt: string | null; source: string; books: PathEntry[] };

/**
 * The constellation to show under tonight's sky: a followed path that holds
 * the book being read, else the most recently followed path still to finish.
 */
export function tonightsPath<P extends ShownPath>(
  paths: P[],
  shelf: ShelfBook[],
  current: ShelfBook | null,
): P | null {
  const followed = paths
    .filter((p) => (p.joinedAt || p.source === 'user') && p.books.length)
    .sort((a, b) => (b.joinedAt ?? '').localeCompare(a.joinedAt ?? ''));
  if (current) {
    const holding = followed.find((p) => p.books.some((e) => matchShelfBook(e, [current]) === current));
    if (holding) return holding;
  }
  return followed.find((p) => !pathProgress(p.books, shelf).complete) ?? null;
}
