import { getBook } from './books';
import { newId, type Db } from './db';
import { notifyChanged } from './live';
import { getSettings } from './settings';
import type { NightRecord } from '@/domain/moonlog';
import { litBeads, sessionStardust } from '@/domain/progress';
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

export async function deleteSession(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
  notifyChanged('sessions', 'nights');
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

/** Every night that has reading, oldest first, for drawing the sky. */
export async function readingNights(db: Db): Promise<{ night: string; seconds: number }[]> {
  return db.getAllAsync(
    `SELECT night, SUM(seconds) AS seconds FROM sessions GROUP BY night HAVING SUM(seconds) > 0 ORDER BY night`,
    [],
  );
}
