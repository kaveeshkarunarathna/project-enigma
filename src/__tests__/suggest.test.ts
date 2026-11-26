/// <reference types="jest" />
import { CATALOGUE, THEMES } from '@/content/catalogue';
import { CLASSICS } from '@/content/classics';
import { CURATED_PATHS } from '@/content/paths';
import { makeBackup } from '@/data/backup';
import { clearDismissedSuggestions, dismissedSuggestions, dismissSuggestion } from '@/data/suggestions';
import {
  bookKey,
  catalogueText,
  closestEntries,
  journalThemes,
  reasonLine,
  suggestBooks,
  type CuratedPath,
  type ShelfBook,
} from '@/domain/suggest';

import { createTestDb } from './testDb';

const paths: CuratedPath[] = CURATED_PATHS.map((p) => ({
  id: p.id,
  title: p.title,
  genre: p.genre ?? null,
  books: p.books.map((b) => ({ title: b.title })),
}));

const date = (iso: string) => iso.slice(0, 10);
const titles = (s: { book: { title: string } }[]) => s.map((x) => x.book.title);

function suggest(over: Partial<Parameters<typeof suggestBooks>[0]> = {}) {
  return suggestBooks({ catalogue: CATALOGUE, shelf: [], journal: [], paths, limit: 6, ...over });
}

describe('catalogue', () => {
  test('holds every curated path book and every classic, once', () => {
    const keys = CATALOGUE.map((b) => bookKey(b.title));
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of CURATED_PATHS) for (const b of p.books) expect(keys).toContain(bookKey(b.title));
    for (const c of CLASSICS) expect(keys).toContain(bookKey(c.title));
  });

  test('each entry is short, our own words, with known themes', () => {
    for (const b of CATALOGUE) {
      expect(b.themes.length).toBeGreaterThan(0);
      for (const t of b.themes) expect(THEMES).toContain(t);
      expect(b.note.split(/\s+/).length).toBeLessThanOrEqual(16);
      expect(b.note).not.toMatch(/[“”"]/); // no quoting
    }
  });

  test('the text embedded for a book is only its metadata and our note', () => {
    const dune = CATALOGUE.find((b) => b.title === 'Dune')!;
    expect(catalogueText(dune)).toBe(
      'Dune by Frank Herbert. About the natural world, freedom, old myths. A desert planet, a family, and the price of power.',
    );
  });
});

describe('suggestions', () => {
  test('a new reader gets gentle first steps in their genre', () => {
    const s = suggest({ favouriteGenre: 'philosophy' });
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.book.genre === 'philosophy')).toBe(true);
    expect(titles(s)).toContain('The Enchiridion');
    expect(reasonLine(s[0].reason, date)).toBe('A gentle first step into philosophy.');
  });

  test('suggests the next book on a path, and never books already on the shelf', () => {
    const shelf: ShelfBook[] = [
      { title: 'The Enchiridion', author: 'Epictetus', status: 'finished' },
      { title: 'On the Shortness of Life', author: 'Seneca', status: 'finished' },
      { title: 'Letters from a Stoic', author: 'Seneca', status: 'want' },
    ];
    const s = suggest({ shelf });
    expect(titles(s)).not.toContain('The Enchiridion');
    expect(titles(s)).not.toContain('Letters from a Stoic');
    const meditations = s.find((x) => x.book.title === 'Meditations')!;
    expect(meditations).toBeDefined();
    expect(meditations.pathId).toBe('stoics');
    expect(reasonLine(meditations.reason, date)).toBe(
      'Next on First Steps with the Stoics, after On the Shortness of Life.',
    );
  });

  test('an author the reader finished brings their other books', () => {
    const s = suggest({ shelf: [{ title: 'Klara and the Sun', author: 'Kazuo Ishiguro', status: 'finished' }] });
    const never = s.find((x) => x.book.title === 'Never Let Me Go')!;
    expect(reasonLine(never.reason, date)).toBe('Also by Kazuo Ishiguro, whose Klara and the Sun you finished.');
  });

  test('journal words lead to books on the same themes', () => {
    const journal = [
      { body: 'Thinking about my grandmother and how much time we lost.' },
      { body: 'Grief comes in waves. I remember her garden.' },
    ];
    const themes = journalThemes(journal);
    expect(themes.get('time')).toBe(1);
    expect(themes.get('mortality')).toBe(0.5);
    const s = suggest({ journal });
    expect(s[0].book.themes).toContain('time');
    expect(reasonLine(s[0].reason, date)).toBe('You have been writing about time.');
  });

  test('a quote passage is not part of what suggestions read', () => {
    // The hook passes only `body`; a quote with no note of the reader's says nothing.
    expect(journalThemes([{ body: '' }]).size).toBe(0);
  });

  test('closeness in meaning to an entry can lead, with its date', () => {
    const solaris = bookKey('Solaris');
    const meaning = new Map([[solaris, { similarity: 0.62, entryAt: '2026-11-19T21:00:00.000Z' }]]);
    const s = suggest({ shelf: [{ title: 'Dune', author: 'Frank Herbert', status: 'finished' }], meaning });
    expect(s[0].book.title).toBe('Solaris');
    expect(reasonLine(s[0].reason, date)).toBe('Close to something you wrote on 2026-11-19.');
  });

  test('books set aside stay away, and one author fills at most two places', () => {
    const shelf: ShelfBook[] = [{ title: 'Coraline', author: 'Neil Gaiman', status: 'finished' }];
    const before = suggest({ shelf, limit: 10 });
    expect(before.filter((x) => x.book.author === 'Neil Gaiman').length).toBeLessThanOrEqual(2);
    const first = before[0];
    const after = suggest({ shelf, dismissed: [first.key], limit: 10 });
    expect(titles(after)).not.toContain(first.book.title);
  });

  test('every reason reads as one calm sentence', () => {
    const lines = [
      reasonLine({ kind: 'author', author: 'Seneca', title: 'Meditations', status: 'reading' }, date),
      reasonLine({ kind: 'book-theme', theme: 'humanity', title: 'Frankenstein' }, date),
      reasonLine({ kind: 'genre', genre: 'scifi' }, date),
    ];
    expect(lines).toEqual([
      'Also by Seneca, whose Meditations you are reading.',
      'Like Frankenstein, a book about what makes us human.',
      'More science fiction, a kind of book you come back to.',
    ]);
  });

  test('closest entries picks the best piece of the best entry', () => {
    const m = closestEntries(new Map([['x', [1, 0]]]), [
      { id: 'a', createdAt: '2026-11-01', vectors: [[0, 1]] },
      { id: 'b', createdAt: '2026-11-02', vectors: [[0.2, 0.98], [0.9, 0.44]] },
    ]);
    expect(m.get('x')).toEqual({ similarity: 0.9, entryAt: '2026-11-02' });
  });
});

describe('set aside', () => {
  test('is kept, travels with a backup, and can be cleared', async () => {
    const db = await createTestDb();
    await dismissSuggestion(db, 'dune');
    await dismissSuggestion(db, 'dune');
    await dismissSuggestion(db, 'solaris');
    expect(await dismissedSuggestions(db)).toEqual(['dune', 'solaris']);
    const backup = await makeBackup(db);
    expect(backup.tables.settings.some((r) => r.key === 'dismissedSuggestions')).toBe(true);
    await clearDismissedSuggestions(db);
    expect(await dismissedSuggestions(db)).toEqual([]);
  });
});

test('the same reason is not repeated when another true one exists', () => {
  const s = suggestBooks({
    catalogue: CATALOGUE,
    shelf: [{ title: 'Candide', author: 'Voltaire', status: 'finished' }],
    journal: [],
    paths,
    limit: 6,
  });
  const lines = s.map((x) => reasonLine(x.reason, date));
  const withAlternatives = lines.filter((l, i) => lines.indexOf(l) !== i);
  // Repeats only where a book had nothing else to say.
  expect(withAlternatives.length).toBeLessThan(lines.length - 1);
});
