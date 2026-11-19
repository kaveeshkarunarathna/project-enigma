import { addBook, setBookStatus, type Book, type BookStatus } from '@/data/books';
import type { Db } from '@/data/db';
import type { PathBook } from '@/data/paths';
import { normalizeTitle } from '@/domain/paths';
import { coverUrl, searchCatalog } from '@/services/openLibrary';

/**
 * Puts a path's book on the shelf. Tries the Open Library catalog first so
 * the book gets its cover and page count; without a connection it is added
 * with just the title and author.
 */
export async function addPathBookToShelf(db: Db, entry: PathBook, status: BookStatus): Promise<Book> {
  let fields: Parameters<typeof addBook>[1] = {
    olWorkKey: entry.olWorkKey,
    title: entry.title,
    author: entry.author,
    coverUrl: entry.coverUrl,
  };
  if (!entry.olWorkKey) {
    try {
      const results = await searchCatalog(`${entry.title} ${entry.author ?? ''}`, {
        limit: 5,
        timeoutMs: 6000,
      });
      const want = normalizeTitle(entry.title);
      const hit = results.find((r) => normalizeTitle(r.title) === want) ?? null;
      if (hit) {
        fields = {
          olWorkKey: hit.workKey,
          title: entry.title,
          author: hit.author ?? entry.author,
          coverUrl: coverUrl(hit.coverId, 'L'),
          firstPublished: hit.firstPublished,
          pageCount: hit.pageCount,
        };
      }
    } catch {
      // offline: fall back to title and author only
    }
  }
  const book = await addBook(db, { ...fields, status });
  if (status === 'reading' && book.status !== 'reading' && book.status !== 'finished') {
    await setBookStatus(db, book.id, 'reading');
  }
  return book;
}
