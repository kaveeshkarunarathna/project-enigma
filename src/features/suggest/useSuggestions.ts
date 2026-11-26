import { CATALOGUE } from '@/content/catalogue';
import { listBooks } from '@/data/books';
import type { Db } from '@/data/db';
import { useDb } from '@/data/DataProvider';
import { listEntries } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { loadVectors } from '@/data/meaning';
import { getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { dismissedSuggestions } from '@/data/suggestions';
import { MEANING_MODEL } from '@/domain/meaning';
import {
  bookKey,
  catalogueText,
  closestEntries,
  suggestBooks,
  type MeaningMatches,
  type Suggestion,
} from '@/domain/suggest';
import { embedQuery, useMeaning } from '@/features/meaning/meaning';
import { useReaderGenre } from '@/features/paths/useReaderGenre';

/**
 * Suggestions for the reader, from the bundled catalogue. Everything is
 * worked out on the phone. When search by meaning is on, each catalogue
 * description is embedded once per launch and compared with the reader's
 * journal vectors, so a book can be suggested because it is close to
 * something they wrote.
 */

let bookVectors: { model: string; vectors: Map<string, Float32Array> } | null = null;

async function catalogueVectors(db: Db): Promise<Map<string, Float32Array> | null> {
  if (bookVectors?.model === MEANING_MODEL) return bookVectors.vectors;
  const vectors = new Map<string, Float32Array>();
  for (const b of CATALOGUE) {
    const v = await embedQuery(db, catalogueText(b));
    if (!v) return null;
    vectors.set(bookKey(b.title), v);
  }
  bookVectors = { model: MEANING_MODEL, vectors };
  return vectors;
}

async function meaningMatches(db: Db): Promise<MeaningMatches | null> {
  const entryVectors = await loadVectors(db);
  if (!entryVectors.size) return null;
  const books = await catalogueVectors(db);
  if (!books) return null;
  const dates = await db.getAllAsync<{ id: string; created_at: string }>(
    'SELECT id, created_at FROM journal_entries',
    [],
  );
  const entries = dates
    .filter((d) => entryVectors.has(d.id))
    .map((d) => ({ id: d.id, createdAt: d.created_at, vectors: entryVectors.get(d.id)! }));
  return closestEntries(books, entries);
}

export function useSuggestions(limit = 6): Suggestion[] | undefined {
  const db = useDb();
  const meaning = useMeaning();
  const genre = useReaderGenre();
  const useMeaningNow = meaning.phase === 'ready';
  const { data } = useLiveQuery(
    async () => {
      const [shelf, entries, dismissed, list] = await Promise.all([
        listBooks(db),
        listEntries(db, { limit: 100000 }),
        dismissedSuggestions(db),
        listPaths(db),
      ]);
      const curated = (
        await Promise.all(list.filter((p) => p.source === 'curated').map((p) => getPath(db, p.id)))
      ).filter((p): p is ReadingPathWithBooks => !!p);
      return suggestBooks({
        catalogue: CATALOGUE,
        shelf,
        // Only the reader's own words; a quote's passage is left out.
        journal: entries.map((e) => ({ body: e.body })),
        paths: curated,
        favouriteGenre: genre,
        dismissed,
        meaning: useMeaningNow ? await meaningMatches(db) : null,
        limit,
      });
    },
    ['books', 'journal', 'paths', 'settings'],
    [genre, useMeaningNow, limit],
  );
  return data;
}
