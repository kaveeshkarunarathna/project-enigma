/// <reference types="jest" />
import { addBook, currentBook, getBook, listBooks, setBookStatus } from '@/data/books';
import { addEntry, listEntries } from '@/data/journal';
import {
  addBookToUserPath,
  createUserPath,
  deleteUserPath,
  getPath,
  joinPath,
  listPaths,
  moveBookInUserPath,
  syncCuratedPaths,
} from '@/data/paths';
import { logSession, nightRecords, recordSessionProgress, skyStats } from '@/data/sessions';
import { getSettings, setSetting } from '@/data/settings';

import { createTestDb } from './testDb';

const at = (h: number, m = 0, day = 19) => new Date(2026, 10, day, h, m);

describe('books', () => {
  it('adds a book once per Open Library work', async () => {
    const db = await createTestDb();
    const a = await addBook(db, {
      olWorkKey: '/works/OL1W',
      title: 'Meditations',
      author: 'Marcus Aurelius',
    });
    const b = await addBook(db, { olWorkKey: '/works/OL1W', title: 'Meditations' });
    expect(b.id).toBe(a.id);
    expect(await listBooks(db)).toHaveLength(1);
  });

  it('rejects an empty title', async () => {
    const db = await createTestDb();
    await expect(addBook(db, { title: '   ' })).rejects.toThrow();
  });

  it('finishing a book fills its pages', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Candide', pageCount: 120 });
    await setBookStatus(db, book.id, 'finished');
    const done = await getBook(db, book.id);
    expect(done).toMatchObject({ status: 'finished', currentPage: 120 });
    expect(done?.finishedAt).toBeTruthy();
  });
});

describe('sessions and the moon log', () => {
  it('saves a session, starts the book and lights beads', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'The Hobbit', pageCount: 300 });
    const result = await logSession(db, {
      bookId: book.id,
      startedAt: at(21),
      endedAt: at(21, 20),
      seconds: 1200,
      pageTo: 42,
    });
    expect(result.firstOfNight).toBe(true);
    expect(result.beadsLit).toBe(2);
    expect(result.session.stardust).toBe(20 + 2 * 5);
    const updated = await getBook(db, book.id);
    expect(updated).toMatchObject({ status: 'reading', currentPage: 42, stardust: 30 });
    expect(await currentBook(db)).toMatchObject({ id: book.id });
  });

  it('never moves the page backwards', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Dune', pageCount: 600 });
    await logSession(db, {
      bookId: book.id,
      startedAt: at(20),
      endedAt: at(20, 10),
      seconds: 600,
      pageTo: 80,
    });
    await logSession(db, {
      bookId: book.id,
      startedAt: at(22),
      endedAt: at(22, 5),
      seconds: 300,
      pageTo: 10,
    });
    expect((await getBook(db, book.id))?.currentPage).toBe(80);
  });

  it('counts a 1 AM session towards the evening before', async () => {
    const db = await createTestDb();
    const r = await logSession(db, {
      bookId: null,
      startedAt: at(1, 0, 20),
      endedAt: at(1, 10, 20),
      seconds: 600,
    });
    expect(r.session.night).toBe('2026-11-19');
  });

  it('keeps the goal each night was read with', async () => {
    const db = await createTestDb();
    await setSetting(db, 'goalMinutes', 5);
    await logSession(db, { bookId: null, startedAt: at(21, 0, 17), endedAt: at(21, 6, 17), seconds: 360 });
    await setSetting(db, 'goalMinutes', 30);
    await logSession(db, { bookId: null, startedAt: at(21, 0, 18), endedAt: at(21, 6, 18), seconds: 360 });
    await addEntry(db, { kind: 'reflection', body: 'Brave and quiet.', at: at(21, 30, 18) });

    const records = await nightRecords(db, '2026-11-16', '2026-11-22');
    expect(records).toEqual([
      { night: '2026-11-17', goalMinutes: 5, seconds: 360, reflected: false },
      { night: '2026-11-18', goalMinutes: 30, seconds: 360, reflected: true },
    ]);
    expect((await getSettings(db)).goalMinutes).toBe(30);
  });

  it('records where the reader stopped after the lamp saved the session', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Candide', pageCount: 100 });
    const { session } = await logSession(db, {
      bookId: book.id,
      startedAt: at(21),
      endedAt: at(21, 15),
      seconds: 900,
    });
    expect(session.stardust).toBe(15);
    const progress = await recordSessionProgress(db, session.id, { pageTo: 100 });
    expect(progress).toEqual({ beadsLit: 5, stardust: 25, reachedEnd: true });
    expect(await getBook(db, book.id)).toMatchObject({ currentPage: 100, stardust: 40 });
  });

  it('adds up lifetime stats', async () => {
    const db = await createTestDb();
    await logSession(db, { bookId: null, startedAt: at(21, 0, 17), endedAt: at(21, 10, 17), seconds: 600 });
    await logSession(db, { bookId: null, startedAt: at(21, 0, 18), endedAt: at(21, 10, 18), seconds: 600 });
    expect(await skyStats(db)).toMatchObject({ nightsRead: 2, minutesRead: 20 });
  });
});

describe('journal', () => {
  it('stores reflections and short quotes, and searches them', async () => {
    const db = await createTestDb();
    const book = await addBook(db, { title: 'Meditations' });
    await addEntry(db, { kind: 'reflection', body: 'On patience', bookId: book.id });
    await addEntry(db, {
      kind: 'quote',
      bookId: book.id,
      quoteText: 'You have power over your mind, not outside events.',
      quotePage: 12,
      quoteSource: 'scanned',
    });
    const quotes = await listEntries(db, { kind: 'quote' });
    expect(quotes[0]).toMatchObject({ quotePage: 12, quoteSource: 'scanned', bookTitle: 'Meditations' });
    expect(await listEntries(db, { search: 'power' })).toHaveLength(1);
    expect(await listEntries(db, { search: '100%' })).toHaveLength(0);
  });

  it('refuses long passages', async () => {
    const db = await createTestDb();
    await expect(addEntry(db, { kind: 'quote', quoteText: 'word '.repeat(200) })).rejects.toThrow();
  });
});

describe('paths', () => {
  const seed = {
    id: 'curated-stoics',
    version: 1,
    title: 'First Steps with the Stoics',
    genre: 'philosophy',
    books: [
      { olWorkKey: '/works/A', title: 'Letters from a Stoic', author: 'Seneca' },
      { olWorkKey: '/works/B', title: 'Meditations', author: 'Marcus Aurelius' },
    ],
  };

  it('installs curated paths and only updates them for newer versions', async () => {
    const db = await createTestDb();
    expect(await syncCuratedPaths(db, [seed])).toBe(1);
    expect(await syncCuratedPaths(db, [seed])).toBe(0);
    await joinPath(db, seed.id);
    expect(await syncCuratedPaths(db, [{ ...seed, version: 2, title: 'The Stoics' }])).toBe(1);
    const path = await getPath(db, seed.id);
    expect(path?.title).toBe('The Stoics');
    expect(path?.joinedAt).toBeTruthy();
  });

  it('lets readers build their own paths with the same structure', async () => {
    const db = await createTestDb();
    await syncCuratedPaths(db, [seed]);
    const mine = await createUserPath(db, { title: 'Winter fantasy' });
    await addBookToUserPath(db, mine.id, {
      olWorkKey: '/works/X',
      title: 'A Wizard of Earthsea',
      author: 'Ursula K. Le Guin',
      coverUrl: null,
      note: null,
    });
    await addBookToUserPath(db, mine.id, {
      olWorkKey: '/works/Y',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      coverUrl: null,
      note: null,
    });
    await addBookToUserPath(db, mine.id, {
      olWorkKey: '/works/X',
      title: 'duplicate',
      author: null,
      coverUrl: null,
      note: null,
    });
    await moveBookInUserPath(db, mine.id, 1, 0);
    const path = await getPath(db, mine.id);
    expect(path?.books.map((b) => b.title)).toEqual(['The Hobbit', 'A Wizard of Earthsea']);
    expect((await listPaths(db)).map((p) => p.source)).toEqual(['user', 'curated']);
  });

  it('protects curated paths from edits', async () => {
    const db = await createTestDb();
    await syncCuratedPaths(db, [seed]);
    await expect(deleteUserPath(db, seed.id)).rejects.toThrow('Curated');
  });
});
