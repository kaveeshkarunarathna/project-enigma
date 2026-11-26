import { addBook, setBookStatus } from '@/data/books';
import type { Db } from '@/data/db';
import { addEntry } from '@/data/journal';
import { joinPath } from '@/data/paths';
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
  // Follow the stoics, so the sky shows a constellation filling with Meditations' pages.
  await joinPath(db, 'stoics', true).catch(() => {});
  void hobbit;
}

/** Books read, in order, for the full sample sky. `path` is the curated path each belongs to. */
const FULL_SKY_BOOKS: { title: string; author: string; pages: number; path: string; stopAt?: number }[] = [
  { title: 'The Enchiridion', author: 'Epictetus', pages: 80, path: 'stoics' },
  { title: 'On the Shortness of Life', author: 'Seneca', pages: 64, path: 'stoics' },
  { title: 'Meditations', author: 'Marcus Aurelius', pages: 254, path: 'stoics' },
  { title: 'Letters from a Stoic', author: 'Seneca', pages: 254, path: 'stoics' },
  { title: 'The Metamorphosis', author: 'Franz Kafka', pages: 70, path: 'short-classics' },
  { title: 'The Old Man and the Sea', author: 'Ernest Hemingway', pages: 127, path: 'short-classics' },
  { title: 'Of Mice and Men', author: 'John Steinbeck', pages: 107, path: 'short-classics' },
  { title: 'The Death of Ivan Ilyich', author: 'Leo Tolstoy', pages: 86, path: 'short-classics' },
  { title: 'Candide', author: 'Voltaire', pages: 120, path: 'short-classics' },
  { title: 'Coraline', author: 'Neil Gaiman', pages: 162, path: 'other-worlds' },
  { title: 'The Lion, the Witch and the Wardrobe', author: 'C. S. Lewis', pages: 172, path: 'other-worlds' },
  { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', pages: 183, path: 'other-worlds' },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', pages: 310, path: 'other-worlds' },
  { title: 'The Time Machine', author: 'H. G. Wells', pages: 104, path: 'classic-scifi' },
  // Left part-read, so one constellation is still filling in.
  { title: 'Fahrenheit 451', author: 'Ray Bradbury', pages: 158, path: 'classic-scifi', stopAt: 92 },
];

const FULL_SKY_QUOTES: Record<string, { text: string; page: number }> = {
  'The Enchiridion': { text: 'Some things are in our control and others not.', page: 1 },
  'On the Shortness of Life': {
    text: 'It is not that we have a short time to live, but that we waste a lot of it.',
    page: 3,
  },
  Meditations: { text: 'The happiness of your life depends upon the quality of your thoughts.', page: 41 },
  Candide: { text: 'We must cultivate our garden.', page: 120 },
};

const FULL_SKY_REFLECTIONS = [
  'Read slowly tonight. The quiet helped more than I expected.',
  'Kept thinking about what I can actually control this week.',
  'A short chapter, but it stayed with me through dinner.',
  'Finished later than planned. Worth it.',
  'Noticed I read better without my phone in the room.',
  'This one made me want to call an old friend.',
];

/**
 * Fills about five months of nightly reading: three curated paths read
 * end to end, a fourth half done, a sky of well over a hundred stars, and a
 * journal to go with it. Only reachable from the dev tools screen.
 */
export async function loadFullSky(db: Db, now = new Date()): Promise<void> {
  const days = 165;
  const shelf: { id: string; pages: number; page: number; firstNight: Date | null }[] = [];
  for (const b of FULL_SKY_BOOKS) {
    // Reuse a copy already on the shelf, so loading twice never doubles a book.
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM books WHERE lower(title) = lower(?)',
      [b.title],
    );
    const id = existing
      ? existing.id
      : (await addBook(db, { title: b.title, author: b.author, pageCount: b.pages, status: 'want' })).id;
    if (existing) await db.runAsync('UPDATE books SET page_count = ? WHERE id = ?', [b.pages, id]);
    shelf.push({ id, pages: b.pages, page: 0, firstNight: null });
  }
  await addBook(db, { title: 'Dune', author: 'Frank Herbert', pageCount: 412 });
  await addBook(db, { title: 'Circe', author: 'Madeline Miller', pageCount: 393 });

  let current = 0;
  let wrote = 0;
  for (let i = days; i >= 1; i--) {
    // Skip roughly one night in five, in a fixed pattern, so the sky has gaps.
    if ((i * 7) % 11 === 3 || (i * 5) % 13 === 4) continue;
    const minutes = 12 + ((i * 17) % 24);
    const start = new Date(now);
    start.setDate(start.getDate() - i);
    start.setHours(21, 10 + (i % 4) * 10, 0, 0);
    const end = new Date(start.getTime() + minutes * 60_000);

    const spec = FULL_SKY_BOOKS[current];
    const book = shelf[current];
    const limit = spec?.stopAt ?? spec?.pages ?? 0;
    let pageTo: number | null = null;
    if (spec && book.page < limit) {
      book.firstNight ??= start;
      book.page = Math.min(book.page + Math.round(minutes * 0.85), limit);
      pageTo = book.page;
    }
    const { session } = await logSession(db, {
      bookId: book?.id ?? null,
      startedAt: start,
      endedAt: end,
      seconds: minutes * 60,
      pageTo,
    });

    if (spec && book.page >= spec.pages) {
      await setBookStatus(db, book.id, 'finished');
      await db.runAsync('UPDATE books SET started_at = ?, finished_at = ? WHERE id = ?', [
        book.firstNight!.toISOString(),
        end.toISOString(),
        book.id,
      ]);
      const quote = FULL_SKY_QUOTES[spec.title];
      if (quote) {
        await addEntry(db, {
          kind: 'quote',
          bookId: book.id,
          quoteText: quote.text,
          quotePage: quote.page,
          quoteSource: 'typed',
          at: new Date(end.getTime() + 60_000),
        });
      }
      current = Math.min(current + 1, FULL_SKY_BOOKS.length - 1);
    } else if (i % 5 === 0) {
      await addEntry(db, {
        kind: 'reflection',
        body: FULL_SKY_REFLECTIONS[wrote++ % FULL_SKY_REFLECTIONS.length],
        bookId: book?.id ?? null,
        sessionId: session.id,
        promptId: 'sample',
        at: new Date(end.getTime() + 60_000),
      });
    }
  }

  for (const id of ['stoics', 'short-classics', 'other-worlds', 'classic-scifi']) {
    await joinPath(db, id, true).catch(() => {});
  }
}
