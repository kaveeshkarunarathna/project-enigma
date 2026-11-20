import type { Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { tonightsPath } from '@/domain/paths';

/** The followed path to draw under tonight's sky, if there is one. */
export function useTonightsPath(shelf: Book[] | undefined, current: Book | null | undefined) {
  const db = useDb();
  const { data: followed } = useLiveQuery(async () => {
    const list = await listPaths(db);
    return (
      await Promise.all(list.filter((p) => p.joinedAt || p.source === 'user').map((p) => getPath(db, p.id)))
    ).filter((p): p is ReadingPathWithBooks => !!p);
  }, ['paths']);
  if (!followed || !shelf) return null;
  return tonightsPath(followed, shelf, current ?? null);
}
