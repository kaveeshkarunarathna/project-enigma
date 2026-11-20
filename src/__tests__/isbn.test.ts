/// <reference types="jest" />
import { addBook, getBookByIsbn } from '@/data/books';
import { formatIsbn, pagesFromPagination, toIsbn13 } from '@/domain/isbn';
import { parseEdition } from '@/services/openLibrary';

import { createTestDb } from './testDb';

describe('ISBN', () => {
  it('accepts EAN-13 barcodes and ISBN-13s with valid check digits', () => {
    expect(toIsbn13('9780141439518')).toBe('9780141439518');
    expect(toIsbn13('978-0-14-143951-8')).toBe('9780141439518');
    expect(toIsbn13('9780141439519')).toBeNull(); // wrong check digit
    expect(toIsbn13('5012345678900')).toBeNull(); // not a book
  });

  it('converts ISBN-10, including an X check digit', () => {
    expect(toIsbn13('0141439513')).toBe('9780141439518');
    expect(toIsbn13('0-8044-2957-X')).toBe('9780804429573');
    expect(toIsbn13('0141439512')).toBeNull();
  });

  it('formats and reads pagination', () => {
    expect(formatIsbn('9780141439518')).toBe('978 014143951 8');
    expect(pagesFromPagination('xii, 320 p.')).toBe(320);
    expect(pagesFromPagination('480 pages')).toBe(480);
    expect(pagesFromPagination(undefined)).toBeNull();
  });
});

describe('Open Library edition', () => {
  it('reads an edition record with its own page count', () => {
    const book = parseEdition(
      '9780141439518',
      {
        title: 'Pride and Prejudice',
        number_of_pages: 480,
        covers: [-1, 8091016],
        works: [{ key: '/works/OL66554W' }],
        publishers: ['Penguin Books'],
        publish_date: '2003',
      },
      { docs: [{ key: '/works/OL66554W', author_name: ['Jane Austen'], first_publish_year: 1813 }] },
    );
    expect(book).toEqual({
      isbn: '9780141439518',
      workKey: '/works/OL66554W',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      firstPublished: 1813,
      pageCount: 480,
      coverId: 8091016,
      publisher: 'Penguin Books',
    });
  });

  it('falls back to pagination and copes with a missing search', () => {
    const book = parseEdition('9780000000002', { title: 'Old Book', pagination: 'x, 212 p.' }, null);
    expect(book).toMatchObject({
      title: 'Old Book',
      pageCount: 212,
      author: null,
      workKey: null,
      coverId: null,
    });
    expect(parseEdition('9780000000002', { nope: true }, null)).toBeNull();
  });
});

describe('books by ISBN', () => {
  it('pins a shelf book to the scanned edition, and finds it again by ISBN', async () => {
    const db = await createTestDb();
    const first = await addBook(db, {
      olWorkKey: '/works/OL1W',
      title: 'Pride and Prejudice',
      pageCount: 432,
    });
    expect(first.isbn).toBeNull();
    const scanned = await addBook(db, {
      olWorkKey: '/works/OL1W',
      isbn: '9780141439518',
      title: 'Pride and Prejudice',
      pageCount: 480,
    });
    expect(scanned.id).toBe(first.id);
    expect(scanned).toMatchObject({ isbn: '9780141439518', pageCount: 480 });
    expect((await getBookByIsbn(db, '9780141439518'))?.id).toBe(first.id);
    const again = await addBook(db, { isbn: '9780141439518', title: 'Pride and Prejudice' });
    expect(again.id).toBe(first.id);
  });
});
