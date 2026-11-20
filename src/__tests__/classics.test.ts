/// <reference types="jest" />
import { getBook } from '@/data/books';
import {
  getChapter,
  getClassicText,
  getClassicTextForBook,
  listChapterTitles,
  markChapterRead,
  removeClassicText,
  saveClassic,
  savePosition,
} from '@/data/classics';
import { getClassic } from '@/content/classics';
import type { ParsedBook } from '@/domain/gutenberg';

import { createTestDb } from './testDb';

const parsed: ParsedBook = {
  title: 'Candide',
  author: 'Voltaire',
  chapters: [
    { title: 'Chapter I', paragraphs: ['First paragraph.', 'Second paragraph.'], words: 4 },
    { title: 'Chapter II', paragraphs: ['Third.'], words: 1 },
    { title: 'Chapter III', paragraphs: ['Fourth.'], words: 1 },
  ],
};

describe('classics storage', () => {
  it('saves a classic, shelves it, and reads chapters back', async () => {
    const db = await createTestDb();
    const classic = getClassic('candide')!;
    const text = await saveClassic(db, classic, parsed);
    expect(text.chapterCount).toBe(3);
    expect(text.wordCount).toBe(6);
    const book = await getBook(db, text.bookId!);
    expect(book).toMatchObject({ title: 'Candide', format: 'classic', chapterCount: 3, status: 'want' });
    expect((await getClassicTextForBook(db, book!.id))?.classicId).toBe('candide');
    expect((await listChapterTitles(db, 'candide')).map((c) => c.title)).toEqual([
      'Chapter I',
      'Chapter II',
      'Chapter III',
    ]);
    expect((await getChapter(db, 'candide', 0))?.paragraphs).toEqual([
      'First paragraph.',
      'Second paragraph.',
    ]);
  });

  it('keeps place and progress, counting each chapter once', async () => {
    const db = await createTestDb();
    const classic = getClassic('candide')!;
    await saveClassic(db, classic, parsed);
    await savePosition(db, 'candide', 1, 0.4);
    expect(await markChapterRead(db, 'candide', 0)).toBe(1);
    expect(await markChapterRead(db, 'candide', 0)).toBe(0);
    expect(await markChapterRead(db, 'candide', 2)).toBe(2);
    expect(await getClassicText(db, 'candide')).toMatchObject({
      positionChapter: 1,
      positionFraction: 0.4,
      chaptersRead: 3,
    });

    // Downloading again keeps the same shelf book and the place.
    const again = await saveClassic(db, classic, parsed);
    const first = await getClassicText(db, 'candide');
    expect(again.bookId).toBe(first?.bookId);
    expect(again.positionChapter).toBe(1);
  });

  it('removes the text but leaves the shelf book', async () => {
    const db = await createTestDb();
    const text = await saveClassic(db, getClassic('candide')!, parsed);
    await removeClassicText(db, 'candide');
    expect(await getClassicText(db, 'candide')).toBeNull();
    expect(await getChapter(db, 'candide', 0)).toBeNull();
    expect(await getBook(db, text.bookId!)).not.toBeNull();
  });
});
