import { useMemo } from 'react';

import type { Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { chartPaths, layoutStarChart, type StarChart } from '@/domain/starChart';

/** The reader's star chart for a viewport, kept live as books and paths change. */
export function useStarChart(
  shelf: Book[] | undefined,
  viewport: { width: number; height: number },
): StarChart | null {
  const db = useDb();
  const { data: paths } = useLiveQuery(async () => {
    const list = await listPaths(db);
    return (await Promise.all(list.map((p) => getPath(db, p.id)))).filter(
      (p): p is ReadingPathWithBooks => !!p,
    );
  }, ['paths']);
  return useMemo(() => {
    if (!paths || !shelf) return null;
    return layoutStarChart(chartPaths(paths, shelf), shelf, viewport);
  }, [paths, shelf, viewport.width, viewport.height]); // eslint-disable-line react-hooks/exhaustive-deps
}
