import { addBook, getBook } from './books';
import { nowIso, type Db } from './db';
import { notifyChanged } from './live';
import type { Classic } from '@/content/classics';
import type { ParsedBook } from '@/domain/gutenberg';

export type ClassicText = {
  classicId: string;
  bookId: string | null;
  title: string;
  chapterCount: number;
  wordCount: number;
  downloadedAt: string;
  positionChapter: number;
  /** How far down the chapter the reader was, 0 to 1. */
  positionFraction: number;
  /** Chapters finished, counted from the start. */
  chaptersRead: number;
};

export type ClassicChapter = { idx: number; title: string; paragraphs: string[]; words: number };

type TextRow = {
  classic_id: string;
  book_id: string | null;
  title: string;
  chapter_count: number;
  word_count: number;
  downloaded_at: string;
  position_chapter: number;
  position_fraction: number;
  chapters_read: number;
};

function toText(r: TextRow): ClassicText {
  return {
    classicId: r.classic_id,
    bookId: r.book_id,
    title: r.title,
    chapterCount: r.chapter_count,
    wordCount: r.word_count,
    downloadedAt: r.downloaded_at,
    positionChapter: r.position_chapter,
    positionFraction: r.position_fraction,
    chaptersRead: r.chapters_read,
  };
}

/**
 * Stores a downloaded classic and puts it on the shelf (format "classic",
 * one bead per chapter). Saving again replaces the text but keeps the place.
 */
export async function saveClassic(db: Db, classic: Classic, parsed: ParsedBook): Promise<ClassicText> {
  const chapters = parsed.chapters;
  if (!chapters.length) throw new Error('This book has no chapters.');
  const wordCount = chapters.reduce((n, c) => n + c.words, 0);
  const existing = await getClassicText(db, classic.id);
  let bookId = existing?.bookId && (await getBook(db, existing.bookId)) ? existing.bookId : null;
  if (!bookId) {
    const book = await addBook(db, {
      title: classic.title,
      author: classic.author,
      firstPublished: classic.year > 0 ? classic.year : null,
      chapterCount: chapters.length,
      format: 'classic',
      status: 'want',
    });
    bookId = book.id;
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM classic_chapters WHERE classic_id = ?', [classic.id]);
    await db.runAsync(
      `INSERT INTO classic_texts (classic_id, book_id, title, chapter_count, word_count, downloaded_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(classic_id) DO UPDATE SET book_id = excluded.book_id, title = excluded.title,
         chapter_count = excluded.chapter_count, word_count = excluded.word_count,
         downloaded_at = excluded.downloaded_at,
         position_chapter = MIN(position_chapter, excluded.chapter_count - 1),
         chapters_read = MIN(chapters_read, excluded.chapter_count)`,
      [classic.id, bookId, classic.title, chapters.length, wordCount, nowIso()],
    );
    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i];
      await db.runAsync(
        'INSERT INTO classic_chapters (classic_id, idx, title, body, words) VALUES (?, ?, ?, ?, ?)',
        [classic.id, i, c.title, c.paragraphs.join('\n\n'), c.words],
      );
    }
    await db.runAsync('UPDATE books SET chapter_count = ? WHERE id = ?', [chapters.length, bookId]);
  });
  notifyChanged('classics', 'books');
  return (await getClassicText(db, classic.id))!;
}

export async function getClassicText(db: Db, classicId: string): Promise<ClassicText | null> {
  const row = await db.getFirstAsync<TextRow>('SELECT * FROM classic_texts WHERE classic_id = ?', [
    classicId,
  ]);
  return row ? toText(row) : null;
}

export async function getClassicTextForBook(db: Db, bookId: string): Promise<ClassicText | null> {
  const row = await db.getFirstAsync<TextRow>('SELECT * FROM classic_texts WHERE book_id = ?', [bookId]);
  return row ? toText(row) : null;
}

export async function listClassicTexts(db: Db): Promise<ClassicText[]> {
  const rows = await db.getAllAsync<TextRow>('SELECT * FROM classic_texts', []);
  return rows.map(toText);
}

export async function listChapterTitles(db: Db, classicId: string) {
  return db.getAllAsync<{ idx: number; title: string; words: number }>(
    'SELECT idx, title, words FROM classic_chapters WHERE classic_id = ? ORDER BY idx',
    [classicId],
  );
}

export async function getChapter(db: Db, classicId: string, idx: number): Promise<ClassicChapter | null> {
  const row = await db.getFirstAsync<{ idx: number; title: string; body: string; words: number }>(
    'SELECT idx, title, body, words FROM classic_chapters WHERE classic_id = ? AND idx = ?',
    [classicId, idx],
  );
  return row
    ? { idx: row.idx, title: row.title, paragraphs: row.body.split('\n\n'), words: row.words }
    : null;
}

/** Remembers where the reader is. Called often while scrolling, so it does not notify. */
export async function savePosition(db: Db, classicId: string, chapter: number, fraction: number) {
  await db.runAsync(
    'UPDATE classic_texts SET position_chapter = ?, position_fraction = ? WHERE classic_id = ?',
    [chapter, Math.min(1, Math.max(0, fraction)), classicId],
  );
}

/**
 * Marks chapters up to and including `idx` as read. Returns how many chapters
 * this newly finished, so the session can light that many beads.
 */
export async function markChapterRead(db: Db, classicId: string, idx: number): Promise<number> {
  const text = await getClassicText(db, classicId);
  if (!text) return 0;
  const reached = Math.min(idx + 1, text.chapterCount);
  const added = Math.max(0, reached - text.chaptersRead);
  if (added) {
    await db.runAsync('UPDATE classic_texts SET chapters_read = ? WHERE classic_id = ?', [
      reached,
      classicId,
    ]);
    notifyChanged('classics');
  }
  return added;
}

/** Frees the space. The shelf book, its sessions and journal entries stay. */
export async function removeClassicText(db: Db, classicId: string): Promise<void> {
  await db.runAsync('DELETE FROM classic_texts WHERE classic_id = ?', [classicId]);
  notifyChanged('classics');
}
