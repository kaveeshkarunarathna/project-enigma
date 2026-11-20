import { newId, nowIso, type Db } from './db';
import { notifyChanged } from './live';

export type PathSource = 'curated' | 'user';

export type PathBook = {
  position: number;
  olWorkKey: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  /** Why this book sits here in the path. One or two sentences. */
  note: string | null;
};

export type ReadingPath = {
  id: string;
  source: PathSource;
  title: string;
  subtitle: string | null;
  description: string | null;
  genre: string | null;
  curatedVersion: number | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReadingPathWithBooks = ReadingPath & { books: PathBook[] };

/** Shape of a curated path in the bundled JSON. User paths use the same fields. */
export type CuratedPathSeed = {
  id: string;
  version: number;
  title: string;
  subtitle?: string;
  description?: string;
  genre?: string;
  books: { olWorkKey?: string; title: string; author?: string; coverUrl?: string; note?: string }[];
};

type PathRow = {
  id: string;
  source: PathSource;
  title: string;
  subtitle: string | null;
  description: string | null;
  genre: string | null;
  curated_version: number | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

type PathBookRow = {
  path_id: string;
  position: number;
  ol_work_key: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  note: string | null;
};

function toPath(r: PathRow): ReadingPath {
  return {
    id: r.id,
    source: r.source,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description,
    genre: r.genre,
    curatedVersion: r.curated_version,
    joinedAt: r.joined_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toPathBook(r: PathBookRow): PathBook {
  return {
    position: r.position,
    olWorkKey: r.ol_work_key,
    title: r.title,
    author: r.author,
    coverUrl: r.cover_url,
    note: r.note,
  };
}

/**
 * Installs or refreshes curated paths from the bundled seed. A path is only
 * rewritten when the seed's version is newer, and the reader's "joined"
 * state is kept.
 */
export async function syncCuratedPaths(db: Db, seeds: CuratedPathSeed[]): Promise<number> {
  let changed = 0;
  await db.withTransactionAsync(async () => {
    for (const seed of seeds) {
      const existing = await db.getFirstAsync<{ curated_version: number | null }>(
        'SELECT curated_version FROM paths WHERE id = ?',
        [seed.id],
      );
      if (existing && (existing.curated_version ?? 0) >= seed.version) continue;
      const now = nowIso();
      if (existing) {
        await db.runAsync(
          `UPDATE paths SET title = ?, subtitle = ?, description = ?, genre = ?, curated_version = ?, updated_at = ?
           WHERE id = ?`,
          [
            seed.title,
            seed.subtitle ?? null,
            seed.description ?? null,
            seed.genre ?? null,
            seed.version,
            now,
            seed.id,
          ],
        );
      } else {
        await db.runAsync(
          `INSERT INTO paths (id, source, title, subtitle, description, genre, curated_version, created_at, updated_at)
           VALUES (?, 'curated', ?, ?, ?, ?, ?, ?, ?)`,
          [
            seed.id,
            seed.title,
            seed.subtitle ?? null,
            seed.description ?? null,
            seed.genre ?? null,
            seed.version,
            now,
            now,
          ],
        );
      }
      await writeBooks(db, seed.id, seed.books);
      changed++;
    }
  });
  if (changed) notifyChanged('paths');
  return changed;
}

async function writeBooks(db: Db, pathId: string, books: CuratedPathSeed['books']) {
  await db.runAsync('DELETE FROM path_books WHERE path_id = ?', [pathId]);
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    await db.runAsync(
      `INSERT INTO path_books (path_id, position, ol_work_key, title, author, cover_url, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pathId, i, b.olWorkKey ?? null, b.title, b.author ?? null, b.coverUrl ?? null, b.note ?? null],
    );
  }
}

export async function listPaths(
  db: Db,
  source?: PathSource,
): Promise<(ReadingPath & { bookCount: number })[]> {
  const rows = await db.getAllAsync<PathRow & { book_count: number }>(
    `SELECT p.*, (SELECT COUNT(*) FROM path_books pb WHERE pb.path_id = p.id) AS book_count
     FROM paths p ${source ? 'WHERE p.source = ?' : ''}
     ORDER BY p.joined_at IS NULL, p.source = 'curated', p.updated_at DESC`,
    source ? [source] : [],
  );
  return rows.map((r) => ({ ...toPath(r), bookCount: r.book_count }));
}

export async function getPath(db: Db, id: string): Promise<ReadingPathWithBooks | null> {
  const row = await db.getFirstAsync<PathRow>('SELECT * FROM paths WHERE id = ?', [id]);
  if (!row) return null;
  const books = await db.getAllAsync<PathBookRow>(
    'SELECT * FROM path_books WHERE path_id = ? ORDER BY position',
    [id],
  );
  return { ...toPath(row), books: books.map(toPathBook) };
}

export async function joinPath(db: Db, id: string, joined = true): Promise<void> {
  await db.runAsync('UPDATE paths SET joined_at = ? WHERE id = ?', [joined ? nowIso() : null, id]);
  notifyChanged('paths');
}

/** Creates a reader-made path. It starts joined, since the reader made it to follow it. */
export async function createUserPath(
  db: Db,
  input: { title: string; description?: string; genre?: string },
): Promise<ReadingPath> {
  const title = input.title.trim();
  if (!title) throw new Error('Give your path a name');
  const id = newId('pt');
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO paths (id, source, title, description, genre, joined_at, created_at, updated_at)
     VALUES (?, 'user', ?, ?, ?, ?, ?, ?)`,
    [id, title, input.description?.trim() || null, input.genre ?? null, now, now, now],
  );
  notifyChanged('paths');
  return (await getPath(db, id))!;
}

async function assertUserPath(db: Db, id: string) {
  const row = await db.getFirstAsync<{ source: PathSource }>('SELECT source FROM paths WHERE id = ?', [id]);
  if (!row) throw new Error('Path not found');
  if (row.source !== 'user') throw new Error('Curated paths cannot be edited');
}

export async function updateUserPath(
  db: Db,
  id: string,
  patch: { title?: string; description?: string | null; genre?: string | null },
): Promise<void> {
  await assertUserPath(db, id);
  const sets: string[] = ['updated_at = ?'];
  const params: (string | null)[] = [nowIso()];
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new Error('Give your path a name');
    sets.push('title = ?');
    params.push(patch.title.trim());
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(patch.description?.trim() || null);
  }
  if (patch.genre !== undefined) {
    sets.push('genre = ?');
    params.push(patch.genre);
  }
  await db.runAsync(`UPDATE paths SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  notifyChanged('paths');
}

/** Replaces the ordered book list of a reader-made path. */
export async function setUserPathBooks(
  db: Db,
  id: string,
  books: Omit<PathBook, 'position'>[],
): Promise<void> {
  await assertUserPath(db, id);
  await db.withTransactionAsync(async () => {
    await writeBooks(
      db,
      id,
      books.map((b) => ({
        olWorkKey: b.olWorkKey ?? undefined,
        title: b.title,
        author: b.author ?? undefined,
        coverUrl: b.coverUrl ?? undefined,
        note: b.note ?? undefined,
      })),
    );
    await db.runAsync('UPDATE paths SET updated_at = ? WHERE id = ?', [nowIso(), id]);
  });
  notifyChanged('paths');
}

export async function addBookToUserPath(db: Db, id: string, book: Omit<PathBook, 'position'>): Promise<void> {
  const path = await getPath(db, id);
  if (!path) throw new Error('Path not found');
  if (book.olWorkKey && path.books.some((b) => b.olWorkKey === book.olWorkKey)) return;
  await setUserPathBooks(db, id, [...path.books, book]);
}

export async function removeBookFromUserPath(db: Db, id: string, position: number): Promise<void> {
  const path = await getPath(db, id);
  if (!path) throw new Error('Path not found');
  await setUserPathBooks(
    db,
    id,
    path.books.filter((b) => b.position !== position),
  );
}

export async function moveBookInUserPath(db: Db, id: string, from: number, to: number): Promise<void> {
  const path = await getPath(db, id);
  if (!path) throw new Error('Path not found');
  const books = [...path.books];
  if (from < 0 || from >= books.length || to < 0 || to >= books.length) return;
  const [moved] = books.splice(from, 1);
  books.splice(to, 0, moved);
  await setUserPathBooks(db, id, books);
}

export async function deleteUserPath(db: Db, id: string): Promise<void> {
  await assertUserPath(db, id);
  await db.runAsync('DELETE FROM paths WHERE id = ?', [id]);
  notifyChanged('paths');
}
