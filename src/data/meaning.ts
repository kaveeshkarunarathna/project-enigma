import type { Db } from './db';
import { listEntries, type EntryKind, type JournalEntry } from './journal';
import {
  chunkText,
  embeddableText,
  MEANING_MODEL,
  packVector,
  rankEntries,
  textHash,
  unpackVector,
  type MatchedBy,
} from '@/domain/meaning';

/**
 * The search-by-meaning index: one row per piece of an entry's own words,
 * holding its vector. It is derived data, so backups leave it out and it is
 * rebuilt here after a restore; deleting an entry deletes its vectors.
 */

/** Turns text into a vector. On the phone this is the on-device model; tests pass a fake. */
export type EmbedFn = (text: string) => Promise<ArrayLike<number>>;

type Pending = { id: string; text: string; hash: string };

/** Entries whose words have no vectors yet (or changed since), oldest first. */
export async function pendingEntries(db: Db, model = MEANING_MODEL): Promise<Pending[]> {
  const entries = await db.getAllAsync<{ id: string; body: string }>(
    'SELECT id, body FROM journal_entries ORDER BY created_at',
    [],
  );
  const indexed = await db.getAllAsync<{ entry_id: string; text_hash: string }>(
    'SELECT entry_id, text_hash FROM journal_vectors WHERE chunk = 0 AND model = ?',
    [model],
  );
  const hashes = new Map(indexed.map((r) => [r.entry_id, r.text_hash]));
  const out: Pending[] = [];
  for (const e of entries) {
    const text = embeddableText(e);
    if (!text) continue;
    const hash = textHash(text);
    if (hashes.get(e.id) !== hash) out.push({ id: e.id, text, hash });
  }
  return out;
}

export async function saveVectors(
  db: Db,
  entryId: string,
  hash: string,
  vectors: ArrayLike<number>[],
  model = MEANING_MODEL,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM journal_vectors WHERE entry_id = ?', [entryId]);
    for (let i = 0; i < vectors.length; i++) {
      await db.runAsync(
        'INSERT INTO journal_vectors (entry_id, chunk, model, text_hash, vector) VALUES (?, ?, ?, ?, ?)',
        [entryId, i, model, hash, packVector(vectors[i])],
      );
    }
  });
}

/** Drops vectors from another model, or for entries that no longer have words of their own. */
export async function pruneVectors(db: Db, model = MEANING_MODEL): Promise<void> {
  await db.runAsync('DELETE FROM journal_vectors WHERE model != ?', [model]);
  await db.runAsync(
    `DELETE FROM journal_vectors WHERE entry_id IN (SELECT id FROM journal_entries WHERE trim(body) = '')`,
    [],
  );
}

export async function loadVectors(db: Db, model = MEANING_MODEL): Promise<Map<string, Float32Array[]>> {
  const rows = await db.getAllAsync<{ entry_id: string; vector: string }>(
    'SELECT entry_id, vector FROM journal_vectors WHERE model = ? ORDER BY entry_id, chunk',
    [model],
  );
  const map = new Map<string, Float32Array[]>();
  for (const r of rows) {
    const v = unpackVector(r.vector);
    if (!v) continue;
    const list = map.get(r.entry_id);
    if (list) list.push(v);
    else map.set(r.entry_id, [v]);
  }
  return map;
}

export async function clearVectors(db: Db): Promise<void> {
  await db.runAsync('DELETE FROM journal_vectors', []);
}

export type IndexProgress = { done: number; total: number };

/**
 * Brings the index up to date, one entry at a time so the phone stays calm.
 * Stops early when `shouldStop` says so; the next run carries on where it
 * left off. Returns how many entries were indexed.
 */
export async function indexJournal(
  db: Db,
  embed: EmbedFn,
  opts: { model?: string; shouldStop?: () => boolean; onProgress?: (p: IndexProgress) => void } = {},
): Promise<number> {
  const model = opts.model ?? MEANING_MODEL;
  await pruneVectors(db, model);
  const pending = await pendingEntries(db, model);
  let done = 0;
  opts.onProgress?.({ done, total: pending.length });
  for (const p of pending) {
    if (opts.shouldStop?.()) break;
    const vectors: ArrayLike<number>[] = [];
    for (const piece of chunkText(p.text)) vectors.push(await embed(piece));
    // The entry may have been deleted while the model was reading it.
    const still = await db.getFirstAsync<{ id: string }>('SELECT id FROM journal_entries WHERE id = ?', [p.id]);
    if (still) await saveVectors(db, p.id, p.hash, vectors, model);
    done++;
    opts.onProgress?.({ done, total: pending.length });
  }
  return done;
}

export type JournalHit = { entry: JournalEntry; matchedBy: MatchedBy };

/**
 * Searches the journal. With a query vector it finds entries close in
 * meaning as well as by words; without one, by words alone.
 */
export async function searchJournal(
  db: Db,
  query: string,
  opts: { queryVector?: ArrayLike<number> | null; kind?: EntryKind; bookId?: string; model?: string } = {},
): Promise<JournalHit[]> {
  if (!query.trim()) return [];
  const entries = await listEntries(db, { kind: opts.kind, bookId: opts.bookId, limit: 100000 });
  const queryVector = opts.queryVector ?? null;
  const vectors = queryVector ? await loadVectors(db, opts.model) : new Map<string, Float32Array[]>();
  const byId = new Map(entries.map((e) => [e.id, e]));
  return rankEntries(query, entries, queryVector, vectors).map((h) => ({
    entry: byId.get(h.id)!,
    matchedBy: h.matchedBy,
  }));
}
