/// <reference types="jest" />
import { makeBackup, restoreBackup } from '@/data/backup';
import { addEntry, deleteEntry, updateEntry } from '@/data/journal';
import {
  clearVectors,
  indexJournal,
  loadVectors,
  pendingEntries,
  saveVectors,
  searchJournal,
} from '@/data/meaning';
import {
  centroid,
  chunkText,
  dot,
  embeddableText,
  normalize,
  packVector,
  rankEntries,
  searchTerms,
  textHash,
  unpackVector,
  wordScore,
  type SearchableEntry,
} from '@/domain/meaning';

import { createTestDb } from './testDb';

/**
 * A stand-in for the on-device model: words that mean alike share a
 * dimension, so "small" and "stars" land close together, like a real
 * sentence embedding would put them.
 */
const CONCEPTS: string[][] = [
  ['stars', 'sky', 'cosmos', 'universe', 'small', 'tiny', 'vast', 'night'],
  ['grief', 'loss', 'mourning', 'sad', 'father', 'death', 'missing'],
  ['sand', 'desert', 'dune', 'water', 'spice'],
  ['time', 'clock', 'memory', 'remember', 'past'],
];
const seen: string[] = [];
async function fakeEmbed(text: string): Promise<Float32Array> {
  seen.push(text);
  const v = new Float32Array(CONCEPTS.length + 1);
  for (const w of searchTerms(text)) {
    const k = CONCEPTS.findIndex((c) => c.includes(w));
    v[k >= 0 ? k : CONCEPTS.length] += k >= 0 ? 1 : 0.05;
  }
  return normalize(v);
}

const at = (day: number) => new Date(2026, 10, day, 21);

const entry = (over: Partial<SearchableEntry>): SearchableEntry => ({
  id: 'e',
  kind: 'note',
  createdAt: '2026-11-20T21:00:00.000Z',
  body: '',
  quoteText: null,
  bookTitle: null,
  ...over,
});

describe('meaning rules', () => {
  test('only the reader’s own words are given to the model', () => {
    expect(embeddableText({ body: '  I felt  small tonight. ' })).toBe('I felt small tonight.');
    // A quote entry's passage is not part of what is embedded.
    expect(embeddableText(entry({ kind: 'quote', quoteText: 'It was the best of times', body: '' }))).toBe('');
  });

  test('long writing is split into overlapping pieces', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('one two three')).toEqual(['one two three']);
    const words = Array.from({ length: 250 }, (_, i) => `w${i}`).join(' ');
    const pieces = chunkText(words, 120, 20);
    expect(pieces).toHaveLength(3);
    expect(pieces[0].split(' ')).toHaveLength(120);
    expect(pieces[1].startsWith('w100 ')).toBe(true);
    expect(pieces[2].endsWith('w249')).toBe(true);
  });

  test('text hashes change with the words', () => {
    expect(textHash('a quiet night')).toBe(textHash('a quiet night'));
    expect(textHash('a quiet night')).not.toBe(textHash('a quiet nights'));
  });

  test('packed vectors keep their direction', () => {
    const v = normalize(Array.from({ length: 384 }, (_, i) => Math.sin(i * 1.7) * (i % 7)));
    const packed = packVector(v);
    expect(packed.length).toBeLessThan(600);
    const back = unpackVector(packed)!;
    expect(back).toHaveLength(384);
    expect(dot(v, back)).toBeGreaterThan(0.999);
    expect(unpackVector('nonsense')).toBeNull();
    expect(unpackVector('1:@@@@')).toBeNull();
  });

  test('centroid is the normalized mean', () => {
    const c = centroid([
      [1, 0],
      [0, 1],
    ])!;
    expect(c[0]).toBeCloseTo(Math.SQRT1_2);
    expect(centroid([])).toBeNull();
  });

  test('search terms drop accents, case and small words', () => {
    expect(searchTerms('The Théo’s DREAMS of a sky')).toEqual(['theo', 'dreams', 'sky']);
  });

  test('word score counts query words, prefixes and the whole phrase', () => {
    const e = entry({ body: 'Dreaming of the desert again', bookTitle: 'Dune' });
    expect(wordScore('dream', e)).toBe(1);
    expect(wordScore('desert dune', e)).toBe(1);
    expect(wordScore('desert ocean', e)).toBe(0.5);
    expect(wordScore('ocean', e)).toBe(0);
    expect(wordScore('the', e)).toBe(0);
    expect(wordScore('of the desert', entry({ body: 'Of the desert, nothing.' }))).toBe(1);
  });

  test('a quote is found by its words, though never embedded', () => {
    const q = entry({ kind: 'quote', quoteText: 'Fear is the mind-killer.', body: '' });
    expect(rankEntries('mind killer', [q], null, new Map())).toEqual([
      { id: 'e', score: 1, matchedBy: 'words' },
    ]);
  });

  test('ranking: meaning leads when there is a query vector, words alone otherwise', async () => {
    const a = entry({ id: 'a', body: 'I felt tiny under the vast sky', createdAt: '2026-11-01' });
    const b = entry({ id: 'b', body: 'Feeling small at work today', createdAt: '2026-11-02' });
    const c = entry({ id: 'c', body: 'Bought groceries', createdAt: '2026-11-03' });
    const vectors = new Map([
      ['a', [await fakeEmbed(a.body)]],
      ['b', [await fakeEmbed(b.body)]],
      ['c', [await fakeEmbed(c.body)]],
    ]);
    // Words only: just the entry that says "small".
    expect(rankEntries('small', [a, b, c], null, vectors).map((h) => h.id)).toEqual(['b']);
    // With meaning: the sky entry is found too, and both words and meaning put b first.
    const hits = rankEntries('feeling small', [a, b, c], await fakeEmbed('feeling small'), vectors);
    expect(hits.map((h) => [h.id, h.matchedBy])).toEqual([
      ['b', 'both'],
      ['a', 'meaning'],
    ]);
  });
});

describe('meaning index', () => {
  beforeEach(() => {
    seen.length = 0;
  });

  test('indexes new entries once, and again only when their words change', async () => {
    const db = await createTestDb();
    const first = await addEntry(db, { kind: 'reflection', body: 'Missing my father tonight', at: at(1) });
    await addEntry(db, {
      kind: 'quote',
      quoteText: 'He who controls the spice controls the universe.',
      body: '',
      at: at(2),
    });
    await addEntry(db, { kind: 'quote', quoteText: 'Fear is the mind-killer.', body: 'So true of exams', at: at(3) });

    expect((await pendingEntries(db)).map((p) => p.text)).toEqual(['Missing my father tonight', 'So true of exams']);
    expect(await indexJournal(db, fakeEmbed)).toBe(2);
    // The model never saw a quoted passage.
    expect(seen.some((t) => /spice|mind-killer/i.test(t))).toBe(false);
    expect(await pendingEntries(db)).toEqual([]);
    expect(await indexJournal(db, fakeEmbed)).toBe(0);

    await updateEntry(db, first.id, { body: 'Missing my father, and the sea' });
    expect((await pendingEntries(db)).map((p) => p.id)).toEqual([first.id]);
    await indexJournal(db, fakeEmbed);
    expect((await loadVectors(db)).size).toBe(2);
  });

  test('long entries keep one vector per piece', async () => {
    const db = await createTestDb();
    const body = Array.from({ length: 300 }, () => 'night').join(' ');
    const e = await addEntry(db, { kind: 'note', body });
    await indexJournal(db, fakeEmbed);
    expect((await loadVectors(db)).get(e.id)).toHaveLength(3);
  });

  test('stops when asked and carries on next time', async () => {
    const db = await createTestDb();
    for (let i = 0; i < 4; i++) await addEntry(db, { kind: 'note', body: `night ${i}`, at: at(i + 1) });
    let calls = 0;
    const progress: number[] = [];
    expect(
      await indexJournal(db, fakeEmbed, {
        shouldStop: () => calls++ >= 2,
        onProgress: (p) => progress.push(p.done),
      }),
    ).toBe(2);
    expect(progress).toEqual([0, 1, 2]);
    expect(await pendingEntries(db)).toHaveLength(2);
    expect(await indexJournal(db, fakeEmbed)).toBe(2);
  });

  test('a new model re-indexes everything', async () => {
    const db = await createTestDb();
    await addEntry(db, { kind: 'note', body: 'the sky' });
    await indexJournal(db, fakeEmbed, { model: 'old-model' });
    expect(await pendingEntries(db)).toHaveLength(1);
    await indexJournal(db, fakeEmbed);
    expect((await loadVectors(db, 'old-model')).size).toBe(0);
    expect((await loadVectors(db)).size).toBe(1);
  });

  test('deleting an entry deletes its vectors', async () => {
    const db = await createTestDb();
    const e = await addEntry(db, { kind: 'note', body: 'the sky' });
    await indexJournal(db, fakeEmbed);
    await deleteEntry(db, e.id);
    expect((await loadVectors(db)).size).toBe(0);
  });

  test('vectors stay out of backups and are rebuilt after a restore', async () => {
    const db = await createTestDb();
    await addEntry(db, { kind: 'note', body: 'sand and spice' });
    await indexJournal(db, fakeEmbed);
    const backup = await makeBackup(db);
    expect(JSON.stringify(backup)).not.toContain('journal_vectors');

    const other = await createTestDb();
    await addEntry(other, { kind: 'note', body: 'old phone note' });
    await indexJournal(other, fakeEmbed);
    await restoreBackup(other, JSON.parse(JSON.stringify(backup)));
    // The old entry's vectors went with it; the restored entry waits to be indexed.
    expect((await loadVectors(other)).size).toBe(0);
    expect((await pendingEntries(other)).map((p) => p.text)).toEqual(['sand and spice']);
  });

  test('clearing removes the whole index', async () => {
    const db = await createTestDb();
    const e = await addEntry(db, { kind: 'note', body: 'the sky' });
    await saveVectors(db, e.id, 'h', [[1, 0]]);
    await clearVectors(db);
    expect((await loadVectors(db)).size).toBe(0);
  });

  test('search finds entries by meaning, with filters', async () => {
    const db = await createTestDb();
    await addEntry(db, { kind: 'reflection', body: 'I felt tiny under the vast night sky', at: at(1) });
    await addEntry(db, { kind: 'note', body: 'Grocery list: milk', at: at(2) });
    await addEntry(db, { kind: 'quote', quoteText: 'The stars are not afraid', body: '', at: at(3) });
    await indexJournal(db, fakeEmbed);

    expect(await searchJournal(db, '   ')).toEqual([]);
    const byWords = await searchJournal(db, 'feeling small');
    expect(byWords).toEqual([]);

    const byMeaning = await searchJournal(db, 'feeling small', { queryVector: await fakeEmbed('feeling small') });
    expect(byMeaning.map((h) => [h.entry.body, h.matchedBy])).toEqual([
      ['I felt tiny under the vast night sky', 'meaning'],
    ]);

    const quotes = await searchJournal(db, 'stars', { queryVector: await fakeEmbed('stars'), kind: 'quote' });
    expect(quotes.map((h) => [h.entry.quoteText, h.matchedBy])).toEqual([['The stars are not afraid', 'words']]);
  });
});
