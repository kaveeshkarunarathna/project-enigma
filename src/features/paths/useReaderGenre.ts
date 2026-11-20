import { currentBook, getBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { readerGenre } from '@/domain/paths';

/**
 * The genre tonight's prompts lean towards, from the paths the reader
 * follows. Pass a book id to ask about that book instead of the current one.
 */
export function useReaderGenre(bookId?: string | null) {
  const db = useDb();
  const { data } = useLiveQuery(
    async () => {
      const list = await listPaths(db);
      const followed = (
        await Promise.all(list.filter((p) => p.joinedAt || p.source === 'user').map((p) => getPath(db, p.id)))
      ).filter((p): p is ReadingPathWithBooks => !!p);
      const book = bookId ? await getBook(db, bookId) : await currentBook(db);
      return readerGenre(followed, book);
    },
    ['paths', 'books', 'sessions'],
    [bookId],
  );
  return data ?? null;
}
