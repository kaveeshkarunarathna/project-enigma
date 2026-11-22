import { useEffect, useState, useSyncExternalStore } from 'react';

import type { Db } from '@/data/db';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import type { EntryKind } from '@/data/journal';
import { clearVectors, indexJournal, pendingEntries, searchJournal, type JournalHit } from '@/data/meaning';
import { getState, setState } from '@/data/settings';
import {
  downloadModel,
  getEmbed,
  meaningSupported,
  removeModel,
  type ModelFiles,
} from '@/services/embedder';

/**
 * Search by meaning on this phone: turning it on (one download), keeping the
 * index in step with the journal, and turning it off again (model and index
 * deleted). The model's file paths are internal app state (`_meaning`), so
 * they never go into a backup: a new phone downloads its own copy.
 */

export type MeaningStatus =
  | { phase: 'unsupported' }
  | { phase: 'off' }
  | { phase: 'downloading'; progress: number }
  | { phase: 'indexing'; done: number; total: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

const STATE_KEY = 'meaning';
type Stored = { files: ModelFiles };

let status: MeaningStatus = meaningSupported() ? { phase: 'off' } : { phase: 'unsupported' };
let checked = false;
let indexing = false;
let again = false;
let abort: AbortController | null = null;
const listeners = new Set<() => void>();

function set(next: MeaningStatus) {
  status = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function stored(db: Db): Promise<Stored | null> {
  return getState<Stored>(db, STATE_KEY);
}

/** Reads whether it was turned on before, once per app launch. */
async function check(db: Db) {
  if (checked || status.phase === 'unsupported') return;
  checked = true;
  if (await stored(db)) {
    set({ phase: 'ready' });
    void refreshIndex(db);
  }
}

/** Downloads the model once, then indexes the journal. */
export async function turnOnMeaning(db: Db): Promise<void> {
  if (status.phase === 'unsupported' || status.phase === 'downloading') return;
  abort = new AbortController();
  set({ phase: 'downloading', progress: 0 });
  try {
    const files = await downloadModel((p) => set({ phase: 'downloading', progress: p }), abort.signal);
    await getEmbed(files); // loads, and proves the files are whole
    await setState(db, STATE_KEY, { files } satisfies Stored);
    set({ phase: 'ready' });
    await refreshIndex(db);
  } catch {
    set(
      abort?.signal.aborted
        ? { phase: 'off' }
        : { phase: 'error', message: 'The download did not finish. Check the connection and try again.' },
    );
  } finally {
    abort = null;
  }
}

export function cancelMeaningDownload() {
  abort?.abort();
}

/** Deletes the model and its index. Search goes back to words alone. */
export async function turnOffMeaning(db: Db): Promise<void> {
  cancelMeaningDownload();
  const s = await stored(db);
  await setState(db, STATE_KEY, null);
  await clearVectors(db);
  await removeModel(s?.files ?? null);
  set(meaningSupported() ? { phase: 'off' } : { phase: 'unsupported' });
}

/** Indexes entries written or changed since the last run. Safe to call often. */
export async function refreshIndex(db: Db): Promise<void> {
  if (indexing) {
    again = true;
    return;
  }
  const s = await stored(db);
  if (!s) return;
  indexing = true;
  try {
    do {
      again = false;
      const embed = await getEmbed(s.files);
      await indexJournal(db, embed, {
        onProgress: ({ done, total }) => {
          // Only show progress for real work; a single new entry is quiet.
          if (total > 3 && done < total) set({ phase: 'indexing', done, total });
        },
        shouldStop: () => status.phase === 'off',
      });
    } while (again);
    if (status.phase === 'indexing') set({ phase: 'ready' });
  } catch {
    set({ phase: 'error', message: 'Search by meaning could not start. Words still work.' });
  } finally {
    indexing = false;
  }
}

/** The query as a vector, or null when search by meaning is not ready. */
export async function embedQuery(db: Db, query: string): Promise<Float32Array | null> {
  if (status.phase !== 'ready' && status.phase !== 'indexing') return null;
  const s = await stored(db);
  if (!s || !query.trim()) return null;
  try {
    const embed = await getEmbed(s.files);
    return Float32Array.from(await embed(query.trim()));
  } catch {
    return null;
  }
}

/** The current status, and keeps the index in step with the journal while mounted. */
export function useMeaning(): MeaningStatus {
  const db = useDb();
  const current = useSyncExternalStore(subscribe, () => status);
  const { data: pending } = useLiveQuery(
    async () => (current.phase === 'ready' ? (await pendingEntries(db)).length : 0),
    ['journal'],
    [current.phase],
  );
  useEffect(() => {
    void check(db);
  }, [db]);
  useEffect(() => {
    if (pending) void refreshIndex(db);
  }, [db, pending]);
  return current;
}

/**
 * Journal search for a screen: by meaning and words when the model is ready,
 * by words alone otherwise. The query is embedded after a short pause in
 * typing, so the model is not run on every key.
 */
export function useJournalSearch(
  query: string,
  filters: { kind?: EntryKind; bookId?: string },
): { hits: JournalHit[] | undefined; status: MeaningStatus } {
  const db = useDb();
  const meaning = useMeaning();
  const [vector, setVector] = useState<{ q: string; v: Float32Array | null } | null>(null);
  const q = query.trim();
  const canEmbed = meaning.phase === 'ready' || meaning.phase === 'indexing';

  useEffect(() => {
    if (!q || !canEmbed) return;
    let live = true;
    const t = setTimeout(async () => {
      const v = await embedQuery(db, q);
      if (live) setVector({ q, v });
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [db, q, canEmbed]);

  const queryVector = canEmbed && vector?.q === q ? vector.v : null;
  const { data: hits } = useLiveQuery(
    () => searchJournal(db, q, { queryVector, kind: filters.kind, bookId: filters.bookId }),
    ['journal', 'books'],
    [q, queryVector, filters.kind, filters.bookId],
  );
  return { hits, status: meaning };
}
