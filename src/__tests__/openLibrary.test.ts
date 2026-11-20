/// <reference types="jest" />
import { CatalogError, coverUrl, parseSearch, searchCatalog } from '@/services/openLibrary';

const sample = {
  numFound: 3,
  docs: [
    {
      key: '/works/OL1W',
      title: 'Meditations',
      author_name: ['Marcus Aurelius'],
      cover_i: 123,
      first_publish_year: 180,
      number_of_pages_median: 254,
      edition_count: 900,
    },
    { key: '/works/OL1W', title: 'Meditations (duplicate)' },
    { key: '/books/OL9M', title: 'An edition, not a work' },
    { key: '/works/OL2W', title: '  ', author_name: ['Nobody'] },
    {
      key: '/works/OL3W',
      title: 'Good Omens',
      author_name: ['Terry Pratchett', 'Neil Gaiman', 'Extra'],
      cover_i: -1,
    },
  ],
};

describe('Open Library parsing', () => {
  it('keeps valid works only, once each', () => {
    const books = parseSearch(sample);
    expect(books.map((b) => b.workKey)).toEqual(['/works/OL1W', '/works/OL3W']);
    expect(books[0]).toEqual({
      workKey: '/works/OL1W',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      firstPublished: 180,
      pageCount: 254,
      coverId: 123,
      editions: 900,
    });
  });

  it('joins up to two authors and drops bad numbers', () => {
    const [, omens] = parseSearch(sample);
    expect(omens.author).toBe('Terry Pratchett & Neil Gaiman');
    expect(omens.coverId).toBeNull();
  });

  it('survives junk', () => {
    expect(parseSearch(null)).toEqual([]);
    expect(parseSearch({ docs: 'nope' })).toEqual([]);
  });

  it('builds cover URLs', () => {
    expect(coverUrl(123, 'L')).toBe('https://covers.openlibrary.org/b/id/123-L.jpg');
    expect(coverUrl(null)).toBeNull();
  });
});

describe('searchCatalog', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('skips very short queries without a request', async () => {
    global.fetch = jest.fn();
    expect(await searchCatalog('a')).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('asks only for catalog fields', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify(sample))) as unknown as typeof fetch;
    const books = await searchCatalog('meditations');
    expect(books).toHaveLength(2);
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('fields=key,title,author_name');
    expect(url).not.toMatch(/text|content|ia=/);
  });

  it('turns network failures into a friendly offline error', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(searchCatalog('dune')).rejects.toBeInstanceOf(CatalogError);
    await expect(searchCatalog('dune')).rejects.toMatchObject({ kind: 'offline' });
  });

  it('reports server errors', async () => {
    global.fetch = jest.fn(async () => new Response('busy', { status: 503 })) as unknown as typeof fetch;
    await expect(searchCatalog('dune')).rejects.toMatchObject({ kind: 'server' });
  });
});
