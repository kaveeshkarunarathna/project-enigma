/**
 * Book suggestions: which books from the bundled catalogue to offer next,
 * and the one calm line that says why. Pure rules, no React, no SQL.
 *
 * What it listens to, all on the phone:
 * - the books the reader finished, is reading or paused (their catalogue
 *   genre, themes, authors, and the curated paths they sit in)
 * - the reader's own journal words: theme words, and, when search by meaning
 *   is on, how close each catalogue book's description is to an entry
 * - books they set aside ("not for me")
 *
 * What it never uses: book text. The catalogue holds only our own short
 * descriptions, and nothing is generated.
 */
import { THEME_PHRASE, THEME_WORDS, THEMES, type CatalogueBook, type Theme } from '@/content/catalogue';

import { searchTerms } from './meaning';
import { normalizeTitle } from './paths';

export type ShelfBook = { title: string; author: string | null; status: string };
export type JournalWords = { body: string };
export type CuratedPath = { id: string; title: string; genre: string | null; books: { title: string }[] };

export type Reason =
  | { kind: 'author'; author: string; title: string; status: string }
  | { kind: 'path'; pathTitle: string; after: string }
  | { kind: 'meaning'; entryAt: string }
  | { kind: 'journal-theme'; theme: Theme }
  | { kind: 'book-theme'; theme: Theme; title: string }
  | { kind: 'genre'; genre: string }
  | { kind: 'start'; genre: string };

export type Suggestion = {
  book: CatalogueBook;
  key: string;
  score: number;
  reason: Reason;
  /** A curated path this book belongs to, to open from the suggestion. */
  pathId: string | null;
};

/** For each catalogue book (by key), its closest journal entry when search by meaning is on. */
export type MeaningMatches = Map<string, { similarity: number; entryAt: string }>;

const READ_WEIGHT: Record<string, number> = { finished: 1, reading: 0.7, paused: 0.3 };

const GENRE_WORD: Record<string, string> = {
  philosophy: 'philosophy',
  classics: 'classics',
  fantasy: 'fantasy',
  scifi: 'science fiction',
};

export function bookKey(title: string): string {
  return normalizeTitle(title);
}

/** The text that stands for a catalogue book when it is embedded: our own words only. */
export function catalogueText(b: CatalogueBook): string {
  return `${b.title} by ${b.author}. About ${b.themes.map((t) => THEME_PHRASE[t]).join(', ')}. ${b.note}`;
}

/** How often each theme comes up in the reader's own words, 0 to 1 per theme. */
export function journalThemes(entries: JournalWords[]): Map<Theme, number> {
  const counts = new Map<Theme, number>();
  for (const e of entries) {
    const words = new Set(searchTerms(e.body));
    for (const t of THEMES) {
      if (THEME_WORDS[t].some((w) => words.has(w))) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return scaleToOne(counts);
}

function scaleToOne<K>(m: Map<K, number>): Map<K, number> {
  const max = Math.max(0, ...m.values());
  if (!max) return new Map();
  return new Map([...m].map(([k, v]) => [k, v / max]));
}

function surname(author: string | null | undefined): string {
  const parts = normalizeTitle(author ?? '').split(' ');
  return parts[parts.length - 1] ?? '';
}

/** Closeness in meaning spread over 0 to 1 (MiniLM: 0.25 is unrelated, 0.6 is close). */
function meaningScore(sim: number): number {
  return Math.max(0, Math.min(1, (sim - 0.25) / 0.35));
}

export function suggestBooks(input: {
  catalogue: CatalogueBook[];
  shelf: ShelfBook[];
  journal: JournalWords[];
  paths: CuratedPath[];
  favouriteGenre?: string | null;
  dismissed?: string[];
  meaning?: MeaningMatches | null;
  limit?: number;
}): Suggestion[] {
  const { catalogue, shelf, paths } = input;
  const byKey = new Map(catalogue.map((b) => [bookKey(b.title), b]));
  const onShelf = new Set(shelf.map((b) => bookKey(b.title)));
  const dismissed = new Set(input.dismissed ?? []);

  // What the reader has read, with how much it counts.
  const read = shelf
    .filter((b) => READ_WEIGHT[b.status])
    .map((b) => ({ ...b, key: bookKey(b.title), weight: READ_WEIGHT[b.status], cat: byKey.get(bookKey(b.title)) }));

  const bookThemes = new Map<Theme, number>();
  const genres = new Map<string, number>();
  for (const r of read) {
    if (!r.cat) continue;
    for (const t of r.cat.themes) bookThemes.set(t, (bookThemes.get(t) ?? 0) + r.weight);
    genres.set(r.cat.genre, (genres.get(r.cat.genre) ?? 0) + r.weight);
  }
  if (input.favouriteGenre && input.favouriteGenre !== 'any') {
    genres.set(input.favouriteGenre, (genres.get(input.favouriteGenre) ?? 0) + 0.5);
  }
  const bookThemeScale = scaleToOne(bookThemes);
  const journalThemeScale = journalThemes(input.journal);
  const genreScale = scaleToOne(genres);
  const readAuthors = new Map(read.filter((r) => r.weight >= 0.7).map((r) => [surname(r.author ?? r.cat?.author), r]));

  // Paths: the next book after the last one read, and books sharing a path with one read.
  const nextInPath = new Map<string, { pathTitle: string; after: string }>();
  const sharesPath = new Map<string, { pathTitle: string; after: string }>();
  const pathOf = new Map<string, string>();
  for (const p of paths) {
    const keys = p.books.map((b) => bookKey(b.title));
    keys.forEach((k) => pathOf.set(k, pathOf.get(k) ?? p.id));
    let last = -1;
    keys.forEach((k, i) => {
      if (read.some((r) => r.key === k)) last = i;
    });
    if (last < 0) continue;
    const after = p.books[last].title;
    const next = keys.slice(last + 1).find((k) => !onShelf.has(k));
    if (next && !nextInPath.has(next)) nextInPath.set(next, { pathTitle: p.title, after });
    for (const k of keys) if (!sharesPath.has(k)) sharesPath.set(k, { pathTitle: p.title, after });
  }

  const coldStart = !read.length && !input.journal.length;
  const out: (Suggestion & { reasons: Reason[] })[] = [];

  for (const book of catalogue) {
    const key = bookKey(book.title);
    if (onShelf.has(key) || dismissed.has(key)) continue;

    const parts: { value: number; reason: Reason }[] = [];

    const author = readAuthors.get(surname(book.author));
    if (author) {
      parts.push({
        value: 0.25,
        reason: { kind: 'author', author: book.author, title: author.cat?.title ?? author.title, status: author.status },
      });
    }

    const next = nextInPath.get(key);
    if (next) parts.push({ value: 0.3, reason: { kind: 'path', ...next } });
    else if (sharesPath.has(key)) parts.push({ value: 0.12, reason: { kind: 'path', ...sharesPath.get(key)! } });

    const match = input.meaning?.get(key);
    if (match) {
      const m = meaningScore(match.similarity);
      if (m > 0) parts.push({ value: 0.4 * m, reason: { kind: 'meaning', entryAt: match.entryAt } });
    }

    // Themes: the strongest theme this book shares, from journal words or from books read.
    let best: { value: number; reason: Reason } | null = null;
    for (const t of book.themes) {
      const j = 0.2 * (journalThemeScale.get(t) ?? 0);
      const b = 0.2 * (bookThemeScale.get(t) ?? 0);
      if (j > 0 && j >= b && (!best || j > best.value)) {
        best = { value: j, reason: { kind: 'journal-theme', theme: t } };
      } else if (b > j && (!best || b > best.value)) {
        const from = read.filter((r) => r.cat?.themes.includes(t)).sort((x, y) => y.weight - x.weight)[0];
        best = { value: b, reason: { kind: 'book-theme', theme: t, title: from.cat!.title } };
      }
    }
    if (best) parts.push(best);

    const g = genreScale.get(book.genre) ?? 0;
    if (g > 0) parts.push({ value: 0.15 * g, reason: { kind: 'genre', genre: book.genre } });

    if (coldStart) {
      const favourite = !input.favouriteGenre || input.favouriteGenre === 'any' || input.favouriteGenre === book.genre;
      const opensPath = paths.some((p) => p.books[0] && bookKey(p.books[0].title) === key);
      if (favourite && (opensPath || book.short)) {
        parts.push({ value: opensPath ? 0.3 : 0.15, reason: { kind: 'start', genre: book.genre } });
      }
    }

    if (!parts.length) continue;
    const score = parts.reduce((s, p) => s + p.value, 0) + (book.short ? 0.02 : 0);
    const reasons = [...parts].sort((a, b) => b.value - a.value).map((p) => p.reason);
    out.push({ book, key, score, reason: reasons[0], pathId: pathOf.get(key) ?? null, reasons });
  }

  out.sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title));

  // Variety: at most two books by one author, and the same reason is not
  // repeated word for word when a book has another true one to give.
  const perAuthor = new Map<string, number>();
  const usedReasons = new Set<string>();
  const picked: Suggestion[] = [];
  for (const { reasons, ...s } of out) {
    const a = surname(s.book.author);
    if ((perAuthor.get(a) ?? 0) >= 2) continue;
    perAuthor.set(a, (perAuthor.get(a) ?? 0) + 1);
    const reason = reasons.find((r) => !usedReasons.has(JSON.stringify(r))) ?? reasons[0];
    usedReasons.add(JSON.stringify(reason));
    picked.push({ ...s, reason });
    if (picked.length >= (input.limit ?? 6)) break;
  }
  return picked;
}

/** The one calm line under a suggestion. `date` formats an entry's date ("Thu 19 Nov"). */
export function reasonLine(r: Reason, date: (iso: string) => string): string {
  switch (r.kind) {
    case 'author':
      return `Also by ${r.author}, whose ${r.title} you ${r.status === 'finished' ? 'finished' : 'are reading'}.`;
    case 'path':
      return `Next on ${r.pathTitle}, after ${r.after}.`;
    case 'meaning':
      return `Close to something you wrote on ${date(r.entryAt)}.`;
    case 'journal-theme':
      return `You have been writing about ${THEME_PHRASE[r.theme]}.`;
    case 'book-theme':
      return `Like ${r.title}, a book about ${THEME_PHRASE[r.theme]}.`;
    case 'genre':
      return `More ${GENRE_WORD[r.genre] ?? r.genre}, a kind of book you come back to.`;
    case 'start':
      return `A gentle first step into ${GENRE_WORD[r.genre] ?? r.genre}.`;
  }
}

/**
 * For each catalogue book, the journal entry closest in meaning. Entry
 * vectors are the reader's own words; book vectors are our descriptions.
 */
export function closestEntries(
  books: Map<string, ArrayLike<number>>,
  entries: { id: string; createdAt: string; vectors: ArrayLike<number>[] }[],
): MeaningMatches {
  const out: MeaningMatches = new Map();
  for (const [key, bv] of books) {
    let best = { similarity: -1, entryAt: '' };
    for (const e of entries) {
      for (const v of e.vectors) {
        let s = 0;
        for (let i = 0; i < bv.length; i++) s += bv[i] * v[i];
        if (s > best.similarity) best = { similarity: s, entryAt: e.createdAt };
      }
    }
    if (best.entryAt) out.set(key, best);
  }
  return out;
}
