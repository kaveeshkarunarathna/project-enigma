/// <reference types="jest" />
import { addBook, getBook } from '@/data/books';
import { addEntry, listEntries } from '@/data/journal';
import {
  deleteSession,
  getSession,
  logSession,
  nightSessions,
  readingNights,
  updateSession,
} from '@/data/sessions';
import {
  clockTime,
  nearestStar,
  neighbourNights,
  nightTitle,
  pageSeries,
  sessionPages,
} from '@/domain/nights';

import { createTestDb } from './testDb';

describe('looking back at nights', () => {
  it('names a night, with the year only when it is not this year', () => {
    const now = new Date(2026, 10, 20);
    expect(nightTitle('2026-11-19', now)).toBe('Thursday 19 November');
    expect(nightTitle('2025-12-31', now)).toBe('Wednesday 31 December 2025');
  });

  it('reads clock times', () => {
    expect(clockTime(new Date(2026, 10, 19, 21, 5).toISOString())).toBe('9:05 PM');
    expect(clockTime(new Date(2026, 10, 19, 0, 30).toISOString())).toBe('12:30 AM');
  });

  it('finds the star a tap meant, or none', () => {
    const stars = [
      { night: 'a', x: 10, y: 10 },
      { night: 'b', x: 50, y: 50 },
    ];
    expect(nearestStar(stars, 14, 12)?.night).toBe('a');
    expect(nearestStar(stars, 40, 44)?.night).toBe('b');
    expect(nearestStar(stars, 200, 200)).toBeNull();
  });

  it('steps between reading nights', () => {
    const nights = ['2026-11-01', '2026-11-05', '2026-11-09'];
    expect(neighbourNights(nights, '2026-11-05')).toEqual({ prev: '2026-11-01', next: '2026-11-09' });
    expect(neighbourNights(nights, '2026-11-07')).toEqual({ prev: '2026-11-05', next: '2026-11-09' });
    expect(neighbourNights(nights, '2026-11-01')).toEqual({ prev: null, next: '2026-11-05' });
  });

  it('counts session pages and draws a trail that never goes back', () => {
    expect(sessionPages({ pageFrom: 40, pageTo: 58 })).toBe(18);
    expect(sessionPages({ pageFrom: null, pageTo: 12 })).toBe(12);
    expect(sessionPages({ pageFrom: 40, pageTo: null })).toBe(0);
    expect(
      pageSeries([
        { night: '2026-11-03', pageFrom: 20, pageTo: 35 },
        { night: '2026-11-01', pageFrom: 0, pageTo: 20 },
        { night: '2026-11-03', pageFrom: 35, pageTo: 50 },
        { night: '2026-11-04', pageFrom: 50, pageTo: 45 },
        { night: '2026-11-05', pageFrom: 50, pageTo: null },
      ]),
    ).toEqual([
      { night: '2026-11-01', page: 20 },
      { night: '2026-11-03', page: 50 },
      { night: '2026-11-04', page: 50 },
    ]);
  });
});

describe('fixing sessions', () => {
  const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);

  async function twoNights() {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Dune', pageCount: 600, status: 'reading' });
    const a = await logSession(db, {
      bookId: book.id,
      startedAt: at(18, 21),
      endedAt: at(18, 21, 30),
      seconds: 1800,
      pageTo: 40,
    });
    const b = await logSession(db, {
      bookId: book.id,
      startedAt: at(19, 21),
      endedAt: at(19, 21, 20),
      seconds: 1200,
      pageTo: 70,
    });
    return { db, book, a: a.session, b: b.session };
  }

  it("lists a night's sessions with their book", async () => {
    const { db } = await twoNights();
    const list = await nightSessions(db, '2026-11-19');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ bookTitle: 'Dune', pageFrom: 40, pageTo: 70 });
  });

  it('corrects minutes and stardust, and moves the book on its latest session', async () => {
    const { db, book, b } = await twoNights();
    const before = (await getBook(db, book.id))!;
    await updateSession(db, b.id, { seconds: 30 * 60, pageTo: 62 });
    const s = (await getSession(db, b.id))!;
    expect(s.seconds).toBe(1800);
    expect(s.pageTo).toBe(62);
    expect(s.stardust).toBe(b.stardust + 10);
    const after = (await getBook(db, book.id))!;
    expect(after.currentPage).toBe(62);
    expect(after.stardust).toBe(before.stardust + 10);
  });

  it('leaves the book alone when an older session is corrected', async () => {
    const { db, book, a } = await twoNights();
    await updateSession(db, a.id, { seconds: 1800, pageTo: 35 });
    expect((await getBook(db, book.id))!.currentPage).toBe(70);
  });

  it('deleting the latest session takes the book back and its stardust away', async () => {
    const { db, book, b } = await twoNights();
    const before = (await getBook(db, book.id))!;
    await deleteSession(db, b.id);
    expect(await getSession(db, b.id)).toBeNull();
    const after = (await getBook(db, book.id))!;
    expect(after.currentPage).toBe(40);
    expect(after.stardust).toBe(before.stardust - b.stardust);
  });

  it("finds a night's journal entries", async () => {
    const db = await createTestDb();
    await addEntry(db, { kind: 'reflection', body: 'Enough.', at: at(19, 22) });
    await addEntry(db, { kind: 'reflection', body: 'Other night.', at: at(17, 22) });
    const list = await listEntries(db, { night: '2026-11-19' });
    expect(list.map((e) => e.body)).toEqual(['Enough.']);
  });
});

describe('nights you wrote about', () => {
  it('marks reading nights that have a journal entry', async () => {
    const db = await createTestDb();
    const at = (day: number, h: number) => new Date(2026, 10, day, h);
    await logSession(db, { bookId: null, startedAt: at(18, 21), endedAt: at(18, 22), seconds: 600 });
    await logSession(db, { bookId: null, startedAt: at(19, 21), endedAt: at(19, 22), seconds: 600 });
    await addEntry(db, { kind: 'quote', body: '', quoteText: 'A line.', at: at(19, 22) });
    expect(await readingNights(db)).toEqual([
      { night: '2026-11-18', seconds: 600, wrote: false },
      { night: '2026-11-19', seconds: 600, wrote: true },
    ]);
  });
});
