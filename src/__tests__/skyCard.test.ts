/// <reference types="jest" />
import { addBook } from '@/data/books';
import { cardSessions, logSession } from '@/data/sessions';
import {
  cardFigures,
  cardSummary,
  monthStart,
  periodLabel,
  periodStart,
  type CardBook,
  type CardSession,
} from '@/domain/skyCard';

import { createTestDb } from './testDb';

const today = '2026-11-21';

const sessions: CardSession[] = [
  { night: '2026-10-30', seconds: 1800, pages: 30, bookId: 'dune' },
  { night: '2026-11-02', seconds: 1200, pages: 20, bookId: 'dune' },
  { night: '2026-11-02', seconds: 600, pages: 10, bookId: 'dune' },
  { night: '2026-11-10', seconds: 2400, pages: 0, bookId: 'meditations' },
  { night: '2026-11-20', seconds: 900, pages: 15, bookId: 'hobbit' },
  { night: '2026-11-22', seconds: 900, pages: 99, bookId: 'hobbit' }, // not yet
];
const books: CardBook[] = [
  { id: 'dune', title: 'Dune', status: 'finished', finishedAt: new Date(2026, 10, 3, 22).toISOString() },
  { id: 'old', title: 'Old Book', status: 'finished', finishedAt: new Date(2026, 8, 3, 22).toISOString() },
  { id: 'meditations', title: 'Meditations', status: 'reading', finishedAt: null },
  { id: 'hobbit', title: 'The Hobbit', status: 'reading', finishedAt: null },
];

describe('sky card', () => {
  it('knows the month and its label', () => {
    expect(monthStart(today)).toBe('2026-11-01');
    expect(periodStart('month', today)).toBe('2026-11-01');
    expect(periodStart('all', today)).toBeNull();
    expect(periodLabel('month', today)).toBe('November 2026');
    expect(periodLabel('all', today)).toBe('All my nights');
  });

  it('adds up this month only', () => {
    const s = cardSummary(sessions, books, 'month', today);
    expect(s.nights).toBe(3);
    expect(s.pages).toBe(45);
    expect(s.minutes).toBe(85);
    expect(s.finished).toBe(1);
    // Finished first, then the most recently read.
    expect(s.titles).toEqual(['Dune', 'The Hobbit', 'Meditations']);
  });

  it('adds up all time', () => {
    const s = cardSummary(sessions, books, 'all', today);
    expect(s.nights).toBe(4);
    expect(s.pages).toBe(75);
    expect(s.finished).toBe(2);
    expect(s.titles).toHaveLength(3);
    expect(s.titles.slice(0, 2)).toEqual(['Dune', 'Old Book']);
  });

  it('shows at most three numbers and skips empty ones', () => {
    expect(cardFigures({ nights: 1, minutes: 30, pages: 0, finished: 0, titles: [] })).toEqual([
      { value: '1', unit: 'night' },
      { value: '30', unit: 'minutes' },
    ]);
    expect(cardFigures({ nights: 12, minutes: 600, pages: 1240, finished: 2, titles: [] })).toEqual([
      { value: '12', unit: 'nights' },
      { value: '1,240', unit: 'pages' },
      { value: '2', unit: 'books finished' },
    ]);
    expect(cardFigures({ nights: 0, minutes: 0, pages: 0, finished: 0, titles: [] })).toEqual([
      { value: '0', unit: 'nights' },
    ]);
  });

  it('reads only night, time, pages and book from the database', async () => {
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
    await logSession(db, { bookId: book.id, startedAt: at(19, 21), endedAt: at(19, 22), seconds: 1800 });
    const rows = await cardSessions(db, null);
    expect(rows).toEqual([
      { night: '2026-11-18', seconds: 3600, bookId: book.id, pages: 40 },
      { night: '2026-11-19', seconds: 1800, bookId: book.id, pages: 0 },
    ]);
    expect(await cardSessions(db, '2026-11-19')).toHaveLength(1);
  });
});
