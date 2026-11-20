/// <reference types="jest" />
import { CURATED_PATHS } from '@/content/paths';
import {
  constellationPoints,
  lineFill,
  matchShelfBook,
  normalizeTitle,
  pathProgress,
  readerGenre,
  starFill,
  tonightsPath,
} from '@/domain/paths';

const shelf = [
  { id: '1', olWorkKey: null, title: 'Hobbit', author: 'J.R.R. Tolkien', status: 'finished' },
  { id: '2', olWorkKey: '/works/OL1W', title: 'Meditations', author: 'Marcus Aurelius', status: 'reading' },
  { id: '3', olWorkKey: null, title: 'Meditations', author: 'René Descartes', status: 'want' },
];

describe('path matching', () => {
  it('normalizes titles', () => {
    expect(normalizeTitle('The Lion, the Witch and the Wardrobe')).toBe('lion the witch and the wardrobe');
    expect(normalizeTitle('Sophie’s World')).toBe(normalizeTitle("Sophie's World"));
    expect(normalizeTitle('René')).toBe('rene');
  });

  it('matches by key, then by title and author surname', () => {
    expect(
      matchShelfBook({ olWorkKey: null, title: 'The Hobbit', author: 'J. R. R. Tolkien' }, shelf)?.id,
    ).toBe('1');
    expect(matchShelfBook({ olWorkKey: '/works/OL1W', title: 'x', author: null }, shelf)?.id).toBe('2');
    expect(matchShelfBook({ olWorkKey: null, title: 'Meditations', author: 'Descartes' }, shelf)?.id).toBe(
      '3',
    );
    expect(matchShelfBook({ olWorkKey: null, title: 'Dune', author: 'Frank Herbert' }, shelf)).toBeNull();
  });

  it('counts finished stars', () => {
    const p = pathProgress(
      [
        { olWorkKey: null, title: 'The Hobbit', author: 'Tolkien' },
        { olWorkKey: '/works/OL1W', title: 'Meditations', author: null },
        { olWorkKey: null, title: 'Dune', author: null },
      ],
      shelf,
    );
    expect(p).toMatchObject({
      states: ['finished', 'reading', 'none'],
      finished: 1,
      total: 3,
      complete: false,
    });
    // The book being read has no page count here, so it adds nothing yet.
    expect(p.fills).toEqual([1, 0, 0]);
    expect(p.fraction).toBeCloseTo(1 / 3);
  });
});

describe('filling page by page', () => {
  const book = (status: string, currentPage: number, pageCount: number | null) => ({
    id: 'b',
    olWorkKey: null,
    title: 'Dune',
    author: null,
    status,
    currentPage,
    pageCount,
  });

  it('fills a star with the pages read, whole only when finished', () => {
    expect(starFill(null)).toBe(0);
    expect(starFill(book('reading', 100, 400))).toBe(0.25);
    expect(starFill(book('reading', 400, 400))).toBe(0.99);
    expect(starFill(book('reading', 100, null))).toBe(0);
    expect(starFill(book('want', 0, 400))).toBe(0);
    expect(starFill(book('finished', 10, 400))).toBe(1);
  });

  it('counts pages toward the whole constellation', () => {
    const p = pathProgress(
      [
        { olWorkKey: null, title: 'The Hobbit', author: null },
        { olWorkKey: null, title: 'Dune', author: null },
      ],
      [{ ...shelf[0] }, book('reading', 200, 400)],
    );
    expect(p.fills).toEqual([1, 0.5]);
    expect(p.fraction).toBe(0.75);
  });

  it('draws a line in from a whole star as the next book is read', () => {
    expect(lineFill([1, 0.5, 0], 0)).toBe(0.5);
    expect(lineFill([1, 0.5, 0], 1)).toBe(0);
    expect(lineFill([1, 1], 0)).toBe(1);
    expect(lineFill([0.9, 1], 0)).toBe(0);
    expect(lineFill([1], 0)).toBe(0);
  });
});

describe("tonight's constellation", () => {
  const entry = (title: string) => ({ olWorkKey: null, title, author: null });
  const paths = [
    { id: 'old', joinedAt: '2026-01-01', source: 'curated', books: [entry('Meditations')] },
    { id: 'new', joinedAt: '2026-06-01', source: 'curated', books: [entry('The Hobbit')] },
    { id: 'idle', joinedAt: null, source: 'curated', books: [entry('Dune')] },
  ];

  it('prefers the followed path holding the book in hand', () => {
    expect(tonightsPath(paths, shelf, shelf[1])?.id).toBe('old');
  });

  it('else the newest followed path still to finish', () => {
    // "new" holds only the finished Hobbit, so it is complete.
    expect(tonightsPath(paths, shelf, null)?.id).toBe('old');
    expect(tonightsPath(paths.slice(1), shelf, null)).toBeNull();
  });
});

describe('constellations', () => {
  it('is stable and stays in the box', () => {
    expect(constellationPoints('stoics', 4)).toEqual(constellationPoints('stoics', 4));
    for (const p of constellationPoints('other-worlds', 8)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0.12);
      expect(p.y).toBeLessThanOrEqual(0.88);
    }
  });
});

describe('curated paths', () => {
  it('have unique ids, notes, and at least four books each', () => {
    expect(new Set(CURATED_PATHS.map((p) => p.id)).size).toBe(CURATED_PATHS.length);
    for (const p of CURATED_PATHS) {
      expect(p.books.length).toBeGreaterThanOrEqual(4);
      expect(p.books.every((b) => b.title && b.author && b.note)).toBe(true);
    }
  });
});

describe('readerGenre', () => {
  const book = { id: 'b1', olWorkKey: null, title: 'Dune', author: 'Frank Herbert', status: 'reading' };
  const fantasy = {
    genre: 'fantasy',
    joinedAt: '2026-11-02T00:00:00Z',
    source: 'curated',
    books: [{ olWorkKey: null, title: 'Coraline', author: 'Neil Gaiman' }],
  };
  const scifi = {
    genre: 'scifi',
    joinedAt: '2026-11-01T00:00:00Z',
    source: 'curated',
    books: [{ olWorkKey: null, title: 'Dune', author: 'Frank Herbert' }],
  };

  it('prefers the followed path that holds the current book', () => {
    expect(readerGenre([fantasy, scifi], book)).toBe('scifi');
  });

  it('falls back to the most recently followed path', () => {
    expect(readerGenre([scifi, fantasy], null)).toBe('fantasy');
  });

  it('ignores paths the reader does not follow, and the "any" genre', () => {
    expect(readerGenre([{ ...scifi, joinedAt: null }], book)).toBeNull();
    expect(readerGenre([{ ...fantasy, genre: 'any' }], null)).toBeNull();
  });
});
