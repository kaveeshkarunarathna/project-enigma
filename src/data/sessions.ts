import { getBook } from './books';
import { newId, type Db } from './db';
import { notifyChanged } from './live';
import { getSettings } from './settings';
import type { NightRecord } from '@/domain/moonlog';
import type { PaceSession } from '@/domain/pace';
import type { CardSession } from '@/domain/skyCard';
import { litBeads, sessionStardust, STARDUST_PER_BEAD, STARDUST_PER_MINUTE } from '@/domain/progress';
import { nightKey } from '@/domain/time';

export type Session = {
  id: string;
  bookId: string | null;
  night: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
  pageFrom: number | null;
  pageTo: number | null;
  chaptersCompleted: number;
  stardust: number;
};

type SessionRow = {
  id: string;
  book_id: string | null;
  night: string;
  started_at: string;
  ended_at: string;
  seconds: number;
  page_from: number | null;
  page_to: number | null;
  chapters_completed: number;
  stardust: number;
};

function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    bookId: r.book_id,
    night: r.night,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    seconds: r.seconds,
    pageFrom: r.page_from,
    pageTo: r.page_to,
    chaptersCompleted: r.chapters_completed,
    stardust: r.stardust,
  };
}

export type NewSession = {
  bookId: string | null;
  startedAt: Date;
  endedAt: Date;
  /** Time actually read. Pauses are already left out. */
  seconds: number;
  /** Page the reader stopped on, if they told us. */
  pageTo?: number | null;
  chaptersCompleted?: number;
};

export type SessionResult = {
  session: Session;
  /** Ring beads newly lit by this session. */
  beadsLit: number;
  /** True when this was the first reading of the night (a new star in the sky). */
  firstOfNight: boolean;
};

/**
 * Saves a reading session. Every session counts, however short: it adds
 * minutes to tonight's moon and stardust to its book.
 */
export async function logSession(db: Db, input: NewSession): Promise<SessionResult> {
  const seconds = Math.max(0, Math.round(input.seconds));
  const night = nightKey(input.startedAt);
  const id = newId('ss');
  let beadsLit = 0;
  let stardust = 0;
  let pageFrom: number | null = null;
  let firstOfNight = false;

  await db.withTransactionAsync(async () => {
    const settings = await getSettings(db);
    const existingNight = await db.getFirstAsync<{ night: string }>(
      'SELECT night FROM nights WHERE night = ?',
      [night],
    );
    if (!existingNight) {
      firstOfNight = true;
      await db.runAsync('INSERT INTO nights (night, goal_minutes) VALUES (?, ?)', [
        night,
        settings.goalMinutes,
      ]);
    }

    const book = input.bookId ? await getBook(db, input.bookId) : null;
    if (book) {
      pageFrom = book.currentPage || null;
      const pageTo =
        input.pageTo != null && input.pageTo > 0
          ? Math.min(Math.round(input.pageTo), book.pageCount ?? Number.MAX_SAFE_INTEGER)
          : book.currentPage;
      const chaptersDone = Math.min(
        book.chaptersDone + Math.max(0, input.chaptersCompleted ?? 0),
        book.chapterCount ?? Number.MAX_SAFE_INTEGER,
      );
      const before = litBeads({ ...book, finished: false });
      const after = litBeads({
        ...book,
        currentPage: Math.max(pageTo, book.currentPage),
        chaptersDone,
        finished: false,
      });
      beadsLit = Math.max(0, after - before);
      stardust = sessionStardust(seconds, beadsLit);

      await db.runAsync(
        `UPDATE books SET
           current_page = MAX(current_page, ?),
           chapters_done = ?,
           stardust = stardust + ?,
           status = CASE WHEN status IN ('want', 'paused') THEN 'reading' ELSE status END,
           started_at = COALESCE(started_at, ?)
         WHERE id = ?`,
        [pageTo, chaptersDone, stardust, input.startedAt.toISOString(), book.id],
      );
    } else {
      stardust = sessionStardust(seconds, 0);
    }

    await db.runAsync(
      `INSERT INTO sessions (id, book_id, night, started_at, ended_at, seconds, page_from, page_to,
         chapters_completed, stardust)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        book?.id ?? null,
        night,
        input.startedAt.toISOString(),
        input.endedAt.toISOString(),
        seconds,
        pageFrom,
        input.pageTo ?? null,
        Math.max(0, input.chaptersCompleted ?? 0),
        stardust,
      ],
    );
  });

  notifyChanged('sessions', 'nights', 'books');
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return { session: toSession(row!), beadsLit, firstOfNight };
}

export type ProgressResult = { beadsLit: number; stardust: number; reachedEnd: boolean };

/**
 * Records where the reader stopped, after the session was already saved by
 * the lamp. Lights any new beads and adds their stardust to both the session
 * and the book. Pages never move backwards.
 */
export async function recordSessionProgress(
  db: Db,
  sessionId: string,
  input: { pageTo?: number | null; chaptersCompleted?: number },
): Promise<ProgressResult> {
  let result: ProgressResult = { beadsLit: 0, stardust: 0, reachedEnd: false };
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!row?.book_id) return;
    const book = await getBook(db, row.book_id);
    if (!book) return;
    const cap = book.pageCount ?? Number.MAX_SAFE_INTEGER;
    const pageTo =
      input.pageTo != null && input.pageTo > 0 ? Math.min(Math.round(input.pageTo), cap) : book.currentPage;
    const added = Math.max(0, Math.round(input.chaptersCompleted ?? 0));
    const chaptersDone = Math.min(book.chaptersDone + added, book.chapterCount ?? Number.MAX_SAFE_INTEGER);
    const currentPage = Math.max(pageTo, book.currentPage);
    const before = litBeads({ ...book, finished: false });
    const after = litBeads({ ...book, currentPage, chaptersDone, finished: false });
    const beadsLit = Math.max(0, after - before);
    const stardust = beadsLit * STARDUST_PER_BEAD;

    await db.runAsync(
      'UPDATE books SET current_page = ?, chapters_done = ?, stardust = stardust + ? WHERE id = ?',
      [currentPage, chaptersDone, stardust, book.id],
    );
    await db.runAsync(
      `UPDATE sessions SET page_to = COALESCE(?, page_to), chapters_completed = chapters_completed + ?,
         stardust = stardust + ? WHERE id = ?`,
      [input.pageTo != null && input.pageTo > 0 ? pageTo : null, added, stardust, sessionId],
    );
    const reachedEnd =
      (book.pageCount != null && currentPage >= book.pageCount) ||
      (book.chapterCount != null && chaptersDone >= book.chapterCount);
    result = { beadsLit, stardust, reachedEnd };
  });
  notifyChanged('sessions', 'books');
  return result;
}

export async function listSessions(db: Db, opts: { bookId?: string; night?: string; limit?: number } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.bookId) {
    where.push('book_id = ?');
    params.push(opts.bookId);
  }
  if (opts.night) {
    where.push('night = ?');
    params.push(opts.night);
  }
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY started_at DESC LIMIT ?`,
    [...params, opts.limit ?? 200],
  );
  return rows.map(toSession);
}

export type SessionWithBook = Session & { bookTitle: string | null };

/** One night's sessions, oldest first, with their book's title. */
export async function nightSessions(db: Db, night: string): Promise<SessionWithBook[]> {
  const rows = await db.getAllAsync<SessionRow & { book_title: string | null }>(
    `SELECT s.*, b.title AS book_title FROM sessions s LEFT JOIN books b ON b.id = s.book_id
     WHERE s.night = ? ORDER BY s.started_at`,
    [night],
  );
  return rows.map((r) => ({ ...toSession(r), bookTitle: r.book_title }));
}

export async function getSession(db: Db, id: string): Promise<SessionWithBook | null> {
  const row = await db.getFirstAsync<SessionRow & { book_title: string | null }>(
    `SELECT s.*, b.title AS book_title FROM sessions s LEFT JOIN books b ON b.id = s.book_id WHERE s.id = ?`,
    [id],
  );
  return row ? { ...toSession(row), bookTitle: row.book_title } : null;
}

/**
 * True when this is the book's latest session with a stopping page, so its
 * page is where the book stands now and a correction should move the book.
 */
async function isLatestPaged(db: Db, row: SessionRow): Promise<boolean> {
  if (!row.book_id || row.page_to == null) return false;
  const later = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sessions
     WHERE book_id = ? AND id != ? AND page_to IS NOT NULL AND started_at > ?`,
    [row.book_id, row.id, row.started_at],
  );
  return !later?.n;
}

/**
 * Corrects a session: how long it was, and the page the reader stopped on.
 * Minutes change the session's stardust (and its book's) by the same rule
 * as when it was saved. A new page on the book's latest session moves the
 * book there, even backwards, since this is a correction.
 */
export async function updateSession(
  db: Db,
  id: string,
  input: { seconds: number; pageTo: number | null },
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!row) return;
    const seconds = Math.max(0, Math.round(input.seconds));
    const book = row.book_id ? await getBook(db, row.book_id) : null;
    const cap = book?.pageCount ?? Number.MAX_SAFE_INTEGER;
    const pageTo = input.pageTo != null && input.pageTo > 0 ? Math.min(Math.round(input.pageTo), cap) : null;
    const delta = (Math.floor(seconds / 60) - Math.floor(row.seconds / 60)) * STARDUST_PER_MINUTE;
    const stardust = Math.max(0, row.stardust + delta);
    const latest = await isLatestPaged(db, { ...row, page_to: pageTo ?? row.page_to });

    await db.runAsync('UPDATE sessions SET seconds = ?, page_to = ?, stardust = ? WHERE id = ?', [
      seconds,
      pageTo,
      stardust,
      id,
    ]);
    if (book) {
      // Only when the book still stands where this session left it.
      const follows = latest && pageTo != null && (row.page_to == null || book.currentPage === row.page_to);
      // A page added to a session that had none only ever moves the book on.
      const page = !follows
        ? book.currentPage
        : row.page_to == null
          ? Math.max(book.currentPage, pageTo)
          : pageTo;
      await db.runAsync('UPDATE books SET stardust = MAX(0, stardust + ?), current_page = ? WHERE id = ?', [
        stardust - row.stardust,
        page,
        book.id,
      ]);
    }
  });
  notifyChanged('sessions', 'nights', 'books');
}

/**
 * Deletes a session. Its stardust leaves its book, and when it was the
 * book's latest stopping page, the book goes back to where it was before.
 */
export async function deleteSession(db: Db, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!row) return;
    const latest = await isLatestPaged(db, row);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
    if (!row.book_id) return;
    await db.runAsync('UPDATE books SET stardust = MAX(0, stardust - ?) WHERE id = ?', [
      row.stardust,
      row.book_id,
    ]);
    const book = await getBook(db, row.book_id);
    if (latest && book?.currentPage === row.page_to) {
      const prev = await db.getFirstAsync<{ page: number | null }>(
        `SELECT page_to AS page FROM sessions WHERE book_id = ? AND page_to IS NOT NULL
         ORDER BY started_at DESC LIMIT 1`,
        [row.book_id],
      );
      await db.runAsync('UPDATE books SET current_page = ? WHERE id = ?', [
        prev?.page ?? row.page_from ?? 0,
        row.book_id,
      ]);
    }
  });
  notifyChanged('sessions', 'nights', 'books');
}

/** Moon Log records for nights in `[from, to]` (inclusive `YYYY-MM-DD`). */
export async function nightRecords(db: Db, from: string, to: string): Promise<NightRecord[]> {
  const rows = await db.getAllAsync<{
    night: string;
    goal_minutes: number;
    seconds: number;
    reflected: number;
  }>(
    `SELECT n.night, n.goal_minutes,
       COALESCE((SELECT SUM(seconds) FROM sessions s WHERE s.night = n.night), 0) AS seconds,
       EXISTS (SELECT 1 FROM journal_entries j WHERE j.night = n.night AND j.kind = 'reflection') AS reflected
     FROM nights n
     WHERE n.night BETWEEN ? AND ?
     ORDER BY n.night`,
    [from, to],
  );
  return rows.map((r) => ({
    night: r.night,
    goalMinutes: r.goal_minutes,
    seconds: r.seconds,
    reflected: !!r.reflected,
  }));
}

export type SkyStats = { nightsRead: number; minutesRead: number; booksFinished: number; stardust: number };

/** Lifetime totals. These only ever go up. */
export async function skyStats(db: Db): Promise<SkyStats> {
  const row = await db.getFirstAsync<{ nights: number; seconds: number; finished: number; stardust: number }>(
    `SELECT
       (SELECT COUNT(DISTINCT night) FROM sessions WHERE seconds > 0) AS nights,
       (SELECT COALESCE(SUM(seconds), 0) FROM sessions) AS seconds,
       (SELECT COUNT(*) FROM books WHERE status = 'finished') AS finished,
       (SELECT COALESCE(SUM(stardust), 0) FROM sessions) AS stardust`,
    [],
  );
  return {
    nightsRead: row?.nights ?? 0,
    minutesRead: Math.floor((row?.seconds ?? 0) / 60),
    booksFinished: row?.finished ?? 0,
    stardust: row?.stardust ?? 0,
  };
}

/**
 * Every night that has reading, oldest first, for drawing the sky. `wrote`
 * marks nights with a journal entry, which glow teal.
 */
export async function readingNights(db: Db): Promise<{ night: string; seconds: number; wrote: boolean }[]> {
  const rows = await db.getAllAsync<{ night: string; seconds: number; wrote: number }>(
    `SELECT s.night, SUM(s.seconds) AS seconds,
       EXISTS (SELECT 1 FROM journal_entries j WHERE j.night = s.night) AS wrote
     FROM sessions s GROUP BY s.night HAVING SUM(s.seconds) > 0 ORDER BY s.night`,
    [],
  );
  return rows.map((r) => ({ night: r.night, seconds: r.seconds, wrote: !!r.wrote }));
}

/**
 * Sessions from `from` (a night key) on, with the pages each one covered,
 * for the pace numbers. A session without a stopping page counts no pages.
 */
export async function paceSessions(db: Db, from: string): Promise<PaceSession[]> {
  return db.getAllAsync<PaceSession>(
    `SELECT night, seconds,
       CASE WHEN page_to IS NULL THEN 0 ELSE MAX(0, page_to - COALESCE(page_from, 0)) END AS pages
     FROM sessions WHERE night >= ? ORDER BY night`,
    [from],
  );
}

/**
 * Sessions for the shareable sky card: night, time, pages and book only.
 * Notes and journal text are never read here. `from` is a night key, or null
 * for every session.
 */
export async function cardSessions(db: Db, from: string | null): Promise<CardSession[]> {
  return db.getAllAsync<CardSession>(
    `SELECT night, seconds, book_id AS bookId,
       CASE WHEN page_to IS NULL THEN 0 ELSE MAX(0, page_to - COALESCE(page_from, 0)) END AS pages
     FROM sessions WHERE night >= ? ORDER BY night`,
    [from ?? ''],
  );
}
