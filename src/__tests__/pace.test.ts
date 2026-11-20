/// <reference types="jest" />
import { addBook } from '@/data/books';
import { logSession, paceSessions } from '@/data/sessions';
import { finishLine, readingPace, weeksToFinish } from '@/domain/pace';

import { createTestDb } from './testDb';

describe('reading pace', () => {
  const tonight = '2026-11-20';

  it('adds up this week and averages the last four', () => {
    const pace = readingPace(
      [
        { night: '2026-11-20', seconds: 1800, pages: 20 },
        { night: '2026-11-14', seconds: 1200, pages: 10 },
        { night: '2026-11-13', seconds: 600, pages: 30 }, // last week
        { night: '2026-10-20', seconds: 600, pages: 100 }, // too old
        { night: '2026-11-21', seconds: 600, pages: 100 }, // not yet
      ],
      tonight,
    );
    expect(pace.pagesThisWeek).toBe(30);
    expect(pace.minutesThisWeek).toBe(50);
    expect(pace.pagesPerWeek).toBe(15);
    // 60 pages in an hour of timed reading with pages.
    expect(pace.pagesPerHour).toBe(60);
  });

  it('waits for enough timed reading before saying a speed', () => {
    expect(readingPace([{ night: tonight, seconds: 600, pages: 15 }], tonight).pagesPerHour).toBeNull();
    expect(readingPace([], tonight)).toEqual({
      pagesThisWeek: 0,
      minutesThisWeek: 0,
      pagesPerWeek: 0,
      pagesPerHour: null,
    });
  });

  it('says roughly how long a book has left, gently', () => {
    expect(weeksToFinish(0, 50)).toBe(0);
    expect(weeksToFinish(120, 0)).toBeNull();
    expect(weeksToFinish(10, 50)).toBe(1);
    expect(weeksToFinish(240, 80)).toBe(3);
    expect(finishLine(null, 80)).toBeNull();
    expect(finishLine(0, 80)).toBe('The last page is close');
    expect(finishLine(60, 80)).toBe('About a week to go at your pace');
    expect(finishLine(240, 80)).toBe('About 3 weeks to go at your pace');
  });
});

describe('pages per session', () => {
  it('counts the pages between where a session began and where it stopped', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Dune', pageCount: 600, status: 'reading' });
    const at = (day: number, h: number) => new Date(2026, 10, day, h);
    await logSession(db, {
      bookId: book.id,
      startedAt: at(18, 21),
      endedAt: at(18, 22),
      seconds: 3600,
      pageTo: 40,
    });
    await logSession(db, {
      bookId: book.id,
      startedAt: at(19, 21),
      endedAt: at(19, 22),
      seconds: 1800,
      pageTo: 65,
    });
    await logSession(db, { bookId: book.id, startedAt: at(20, 21), endedAt: at(20, 22), seconds: 900 });
    const rows = await paceSessions(db, '2026-11-01');
    expect(rows.map((r) => r.pages)).toEqual([40, 25, 0]);
    expect(readingPace(rows, '2026-11-20').pagesThisWeek).toBe(65);
  });
});
