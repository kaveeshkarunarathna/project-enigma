import { addBook, setBookStatus } from '@/data/books';
import type { Db } from '@/data/db';
import { addEntry } from '@/data/journal';
import { logSession, recordSessionProgress } from '@/data/sessions';

/** Dev tools are on in development builds, or when built with EXPO_PUBLIC_DEV_TOOLS=1. */
export const DEV_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

/**
 * Fills the app with a believable month of reading, so every screen can be
 * seen without waiting weeks. Only reachable from the dev tools screen.
 */
export async function loadSampleSky(db: Db, now = new Date()): Promise<void> {
  const prince = await addBook(db, {
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    pageCount: 96,
    chapterCount: 27,
    firstPublished: 1943,
    status: 'reading',
  });
  const meditations = await addBook(db, {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    pageCount: 254,
    firstPublished: 180,
    status: 'reading',
  });
  const hobbit = await addBook(db, { title: 'The Hobbit', author: 'J. R. R. Tolkien', pageCount: 310 });
  const candide = await addBook(db, {
    title: 'Candide',
    author: 'Voltaire',
    pageCount: 120,
    status: 'reading',
  });

  // Minutes read on each of the last 24 nights (0 = a quiet night).
  const pattern = [12, 0, 18, 9, 0, 15, 22, 0, 0, 11, 16, 6, 0, 25, 14, 0, 10, 13, 0, 20, 8, 0, 17, 12];
  let page = 0;
  for (let i = pattern.length - 1; i >= 1; i--) {
    const minutes = pattern[i];
    if (!minutes) continue;
    const start = new Date(now);
    start.setDate(start.getDate() - i);
    start.setHours(21, 30, 0, 0);
    const end = new Date(start.getTime() + minutes * 60_000);
    const bookId = i > 14 ? candide.id : i % 3 === 0 ? meditations.id : prince.id;
    const { session } = await logSession(db, {
      bookId,
      startedAt: start,
      endedAt: end,
      seconds: minutes * 60,
    });
    if (bookId === prince.id) {
      page = Math.min(page + Math.round(minutes * 0.9), 70);
      await recordSessionProgress(db, session.id, { pageTo: page, chaptersCompleted: minutes > 12 ? 2 : 1 });
    }
    if (bookId === meditations.id) await recordSessionProgress(db, session.id, { pageTo: 40 + i * 2 });
    if (i % 4 === 2) {
      await addEntry(db, {
        kind: 'reflection',
        body: 'What would change if I treated this evening as enough?',
        bookId,
        promptId: 'sample',
        at: new Date(end.getTime() + 60_000),
      });
    }
  }
  await setBookStatus(db, candide.id, 'finished');
  await addEntry(db, {
    kind: 'quote',
    bookId: prince.id,
    quoteText: 'It is the time you have wasted for your rose that makes your rose so important.',
    quotePage: 64,
    quoteSource: 'typed',
  });
  void hobbit;
}
