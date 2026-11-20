import { newId, nowIso, type Db, type SqlValue } from './db';
import { notifyChanged } from './live';

export type BookFormat = 'paper' | 'ebook' | 'audio' | 'classic';
export type BookStatus = 'want' | 'reading' | 'finished' | 'paused';

export type Book = {
  id: string;
  olWorkKey: string | null;
  /** ISBN-13 of the reader's own edition, when they scanned its barcode. */
  isbn: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  firstPublished: number | null;
  pageCount: number | null;
  chapterCount: number | null;
  format: BookFormat;
  status: BookStatus;
  currentPage: number;
  chaptersDone: number;
  stardust: number;
  addedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type BookRow = {
  id: string;
  ol_work_key: string | null;
  isbn: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  first_published: number | null;
  page_count: number | null;
  chapter_count: number | null;
  format: BookFormat;
  status: BookStatus;
  current_page: number;
  chapters_done: number;
  stardust: number;
  added_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export function toBook(r: BookRow): Book {
  return {
    id: r.id,
    olWorkKey: r.ol_work_key,
    isbn: r.isbn ?? null,
    title: r.title,
    author: r.author,
    coverUrl: r.cover_url,
    firstPublished: r.first_published,
    pageCount: r.page_count,
    chapterCount: r.chapter_count,
    format: r.format,
    status: r.status,
    currentPage: r.current_page,
    chaptersDone: r.chapters_done,
    stardust: r.stardust,
    addedAt: r.added_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

export type NewBook = {
  olWorkKey?: string | null;
  isbn?: string | null;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  firstPublished?: number | null;
  pageCount?: number | null;
  chapterCount?: number | null;
  format?: BookFormat;
  status?: BookStatus;
};

/** Adds a book to the shelf. A book already on the shelf (same Open Library work) is returned as is. */
export async function addBook(db: Db, input: NewBook): Promise<Book> {
  const existing =
    (input.isbn ? await getBookByIsbn(db, input.isbn) : null) ??
    (input.olWorkKey ? await getBookByWorkKey(db, input.olWorkKey) : null);
  if (existing) {
    // Scanning the barcode of a book already on the shelf pins it to that edition.
    if (input.isbn && !existing.isbn) {
      await db.runAsync(
        `UPDATE books SET isbn = ?, page_count = COALESCE(?, page_count), cover_url = COALESCE(cover_url, ?)
         WHERE id = ?`,
        [input.isbn, positiveOrNull(input.pageCount), input.coverUrl ?? null, existing.id],
      );
      notifyChanged('books');
      return (await getBook(db, existing.id))!;
    }
    return existing;
  }
  const title = input.title.trim();
  if (!title) throw new Error('A book needs a title');
  const id = newId('bk');
  const now = nowIso();
  const status = input.status ?? 'want';
  await db.runAsync(
    `INSERT INTO books (id, ol_work_key, isbn, title, author, cover_url, first_published, page_count,
       chapter_count, format, status, added_at, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.olWorkKey ?? null,
      input.isbn ?? null,
      title,
      input.author?.trim() || null,
      input.coverUrl ?? null,
      input.firstPublished ?? null,
      positiveOrNull(input.pageCount),
      positiveOrNull(input.chapterCount),
      input.format ?? 'paper',
      status,
      now,
      status === 'reading' ? now : null,
    ],
  );
  notifyChanged('books');
  return (await getBook(db, id))!;
}

export async function getBook(db: Db, id: string): Promise<Book | null> {
  const row = await db.getFirstAsync<BookRow>('SELECT * FROM books WHERE id = ?', [id]);
  return row ? toBook(row) : null;
}

export async function getBookByIsbn(db: Db, isbn: string): Promise<Book | null> {
  const row = await db.getFirstAsync<BookRow>('SELECT * FROM books WHERE isbn = ?', [isbn]);
  return row ? toBook(row) : null;
}

export async function getBookByWorkKey(db: Db, key: string): Promise<Book | null> {
  const row = await db.getFirstAsync<BookRow>('SELECT * FROM books WHERE ol_work_key = ?', [key]);
  return row ? toBook(row) : null;
}

export async function listBooks(db: Db, status?: BookStatus | BookStatus[]): Promise<Book[]> {
  const statuses = status === undefined ? [] : Array.isArray(status) ? status : [status];
  const where = statuses.length ? `WHERE status IN (${statuses.map(() => '?').join(',')})` : '';
  const rows = await db.getAllAsync<BookRow>(
    `SELECT * FROM books ${where}
     ORDER BY CASE status WHEN 'reading' THEN 0 WHEN 'want' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
              COALESCE(finished_at, started_at, added_at) DESC`,
    statuses,
  );
  return rows.map(toBook);
}

/**
 * The book the reader is most likely to pick up tonight: the reading book
 * with the latest session, else the most recently started one.
 */
export async function currentBook(db: Db): Promise<Book | null> {
  const row = await db.getFirstAsync<BookRow>(
    `SELECT b.* FROM books b
     LEFT JOIN (SELECT book_id, MAX(ended_at) AS last FROM sessions GROUP BY book_id) s ON s.book_id = b.id
     WHERE b.status = 'reading'
     ORDER BY COALESCE(s.last, b.started_at, b.added_at) DESC
     LIMIT 1`,
    [],
  );
  return row ? toBook(row) : null;
}

export type BookPatch = Partial<
  Pick<
    Book,
    'title' | 'author' | 'pageCount' | 'chapterCount' | 'format' | 'currentPage' | 'chaptersDone' | 'coverUrl'
  >
>;

const PATCH_COLUMNS: Record<keyof BookPatch, string> = {
  title: 'title',
  author: 'author',
  pageCount: 'page_count',
  chapterCount: 'chapter_count',
  format: 'format',
  currentPage: 'current_page',
  chaptersDone: 'chapters_done',
  coverUrl: 'cover_url',
};

export async function updateBook(db: Db, id: string, patch: BookPatch): Promise<void> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined) as [keyof BookPatch, SqlValue][];
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${PATCH_COLUMNS[k]} = ?`).join(', ');
  await db.runAsync(`UPDATE books SET ${sets} WHERE id = ?`, [...entries.map(([, v]) => v), id]);
  notifyChanged('books');
}

/** Moves a book between want, reading, paused and finished, keeping dates right. */
export async function setBookStatus(db: Db, id: string, status: BookStatus): Promise<void> {
  const now = nowIso();
  if (status === 'reading') {
    await db.runAsync(
      `UPDATE books SET status = 'reading', started_at = COALESCE(started_at, ?), finished_at = NULL WHERE id = ?`,
      [now, id],
    );
  } else if (status === 'finished') {
    await db.runAsync(
      `UPDATE books SET status = 'finished', started_at = COALESCE(started_at, ?), finished_at = ?,
         current_page = COALESCE(page_count, current_page),
         chapters_done = COALESCE(chapter_count, chapters_done)
       WHERE id = ?`,
      [now, now, id],
    );
  } else {
    await db.runAsync(`UPDATE books SET status = ?, finished_at = NULL WHERE id = ?`, [status, id]);
  }
  notifyChanged('books');
}

export async function deleteBook(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
  notifyChanged('books', 'sessions', 'journal');
}

function positiveOrNull(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
