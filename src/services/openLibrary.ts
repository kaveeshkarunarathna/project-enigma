/**
 * Open Library catalog search (https://openlibrary.org/developers/api).
 *
 * Only catalog facts are fetched: title, author, first published year, a
 * typical page count and a cover image. No book text is ever requested.
 * Requests carry the app name in the User-Agent, as Open Library asks.
 */

import { pagesFromPagination } from '@/domain/isbn';

export const OPEN_LIBRARY = 'https://openlibrary.org';
const USER_AGENT = 'NightAtlas/0.1 (reading companion app)';
const FIELDS = 'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,edition_count';

export type CatalogBook = {
  /** Open Library work key, e.g. `/works/OL27448W`. */
  workKey: string;
  title: string;
  author: string | null;
  firstPublished: number | null;
  pageCount: number | null;
  coverId: number | null;
  editions: number;
};

type SearchDoc = {
  key?: unknown;
  title?: unknown;
  author_name?: unknown;
  cover_i?: unknown;
  first_publish_year?: unknown;
  number_of_pages_median?: unknown;
  edition_count?: unknown;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/** Turns a search.json response into clean results. Malformed entries are skipped. */
export function parseSearch(json: unknown): CatalogBook[] {
  const docs = (json as { docs?: unknown })?.docs;
  if (!Array.isArray(docs)) return [];
  const seen = new Set<string>();
  const out: CatalogBook[] = [];
  for (const d of docs as SearchDoc[]) {
    if (typeof d?.key !== 'string' || !d.key.startsWith('/works/')) continue;
    if (typeof d.title !== 'string' || !d.title.trim()) continue;
    if (seen.has(d.key)) continue;
    seen.add(d.key);
    const authors = Array.isArray(d.author_name) ? d.author_name.filter((a) => typeof a === 'string') : [];
    out.push({
      workKey: d.key,
      title: d.title.trim(),
      author: authors.length ? authors.slice(0, 2).join(' & ') : null,
      firstPublished: num(d.first_publish_year),
      pageCount: num(d.number_of_pages_median),
      coverId: num(d.cover_i),
      editions: num(d.edition_count) ?? 0,
    });
  }
  return out;
}

export function coverUrl(coverId: number | null, size: 'S' | 'M' | 'L' = 'M'): string | null {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

export function workUrl(workKey: string): string {
  return `${OPEN_LIBRARY}${workKey}`;
}

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'server' | 'timeout',
  ) {
    super(message);
  }
}

/** Searches the catalog. Throws `CatalogError` with a reader-friendly message. */
export async function searchCatalog(
  query: string,
  opts: { signal?: AbortSignal; limit?: number; timeoutMs?: number } = {},
): Promise<CatalogBook[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${OPEN_LIBRARY}/search.json?q=${encodeURIComponent(q)}&fields=${FIELDS}&limit=${opts.limit ?? 20}`;

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? 12_000);
  const onAbort = () => timeout.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: timeout.signal,
    });
    if (!res.ok) throw new CatalogError('The library catalog is resting. Try again in a moment.', 'server');
    return parseSearch(await res.json());
  } catch (e) {
    if (e instanceof CatalogError) throw e;
    if (opts.signal?.aborted) throw e;
    if (timeout.signal.aborted) throw new CatalogError('The catalog took too long to answer.', 'timeout');
    throw new CatalogError('No connection. You can still add the book by hand.', 'offline');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

/** One printed edition, found by the ISBN on its barcode. */
export type EditionBook = {
  isbn: string;
  workKey: string | null;
  title: string;
  author: string | null;
  firstPublished: number | null;
  /** Pages in this edition, which is what a paper reader's page numbers refer to. */
  pageCount: number | null;
  coverId: number | null;
  publisher: string | null;
};

type EditionJson = {
  title?: unknown;
  subtitle?: unknown;
  number_of_pages?: unknown;
  pagination?: unknown;
  covers?: unknown;
  works?: unknown;
  publishers?: unknown;
};

/**
 * Combines `/isbn/<isbn>.json` (the edition: pages, cover, publisher) with a
 * `search.json?isbn=` result (the author's name and the year first published).
 */
export function parseEdition(isbn: string, edition: unknown, search: unknown): EditionBook | null {
  const e = edition as EditionJson | null;
  if (!e || typeof e.title !== 'string' || !e.title.trim()) return null;
  const works = Array.isArray(e.works) ? (e.works as { key?: unknown }[]) : [];
  const workKey = typeof works[0]?.key === 'string' ? works[0].key : null;
  const covers = Array.isArray(e.covers)
    ? e.covers.filter((c): c is number => typeof c === 'number' && c > 0)
    : [];
  const publishers = Array.isArray(e.publishers) ? e.publishers.filter((p) => typeof p === 'string') : [];
  const doc = ((search as { docs?: SearchDoc[] } | null)?.docs ?? [])[0];
  const authors = Array.isArray(doc?.author_name) ? doc.author_name.filter((a) => typeof a === 'string') : [];
  return {
    isbn,
    workKey: workKey ?? (typeof doc?.key === 'string' && doc.key.startsWith('/works/') ? doc.key : null),
    title: e.title.trim(),
    author: authors.length ? authors.slice(0, 2).join(' & ') : null,
    firstPublished: num(doc?.first_publish_year),
    pageCount:
      num(e.number_of_pages) ?? pagesFromPagination(typeof e.pagination === 'string' ? e.pagination : null),
    coverId: covers[0] ?? null,
    publisher: publishers[0] ?? null,
  };
}

/**
 * Looks up the edition behind a scanned barcode. Returns null when the
 * catalog does not know this ISBN, so the reader can add it by hand.
 */
export async function lookupIsbn(
  isbn: string,
  opts: { timeoutMs?: number } = {},
): Promise<EditionBook | null> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? 12_000);
  const get = (url: string) =>
    fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: timeout.signal });
  try {
    const [editionRes, searchRes] = await Promise.all([
      get(`${OPEN_LIBRARY}/isbn/${isbn}.json`),
      get(`${OPEN_LIBRARY}/search.json?isbn=${isbn}&fields=key,author_name,first_publish_year&limit=1`).catch(
        () => null,
      ),
    ]);
    if (editionRes.status === 404) return null;
    if (!editionRes.ok)
      throw new CatalogError('The library catalog is resting. Try again in a moment.', 'server');
    const search = searchRes?.ok ? await searchRes.json().catch(() => null) : null;
    return parseEdition(isbn, await editionRes.json(), search);
  } catch (e) {
    if (e instanceof CatalogError) throw e;
    if (timeout.signal.aborted) throw new CatalogError('The catalog took too long to answer.', 'timeout');
    throw new CatalogError('No connection. You can still add the book by hand.', 'offline');
  } finally {
    clearTimeout(timer);
  }
}
