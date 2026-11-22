import type { Db } from './db';

/**
 * Schema migrations, applied in order. `PRAGMA user_version` stores how many
 * have run. Never edit a shipped migration: add a new one.
 *
 * Rule: no table ever stores copyrighted book text. `journal_entries.quote_text`
 * holds only a short passage the reader chose for their private journal, and
 * `classic_chapters` holds only public-domain texts from the classics catalog.
 */
export const MIGRATIONS: string[] = [
  // 1: initial schema
  `
  CREATE TABLE books (
    id TEXT PRIMARY KEY NOT NULL,
    ol_work_key TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    first_published INTEGER,
    page_count INTEGER,
    chapter_count INTEGER,
    format TEXT NOT NULL DEFAULT 'paper' CHECK (format IN ('paper', 'ebook', 'audio', 'classic')),
    status TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'reading', 'finished', 'paused')),
    current_page INTEGER NOT NULL DEFAULT 0,
    chapters_done INTEGER NOT NULL DEFAULT 0,
    stardust INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
  );

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    night TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    seconds INTEGER NOT NULL CHECK (seconds >= 0),
    page_from INTEGER,
    page_to INTEGER,
    chapters_completed INTEGER NOT NULL DEFAULT 0,
    stardust INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX sessions_night ON sessions(night);
  CREATE INDEX sessions_book ON sessions(book_id);

  -- One row per night with reading. The goal is copied in so changing the
  -- goal later never rewrites old moons.
  CREATE TABLE nights (
    night TEXT PRIMARY KEY NOT NULL,
    goal_minutes INTEGER NOT NULL
  );

  CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('reflection', 'note', 'quote')),
    night TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    prompt_id TEXT,
    body TEXT NOT NULL DEFAULT '',
    quote_text TEXT,
    quote_page INTEGER,
    quote_source TEXT CHECK (quote_source IN ('typed', 'scanned'))
  );
  CREATE INDEX journal_night ON journal_entries(night);
  CREATE INDEX journal_book ON journal_entries(book_id);

  -- Curated and reader-made paths share one structure.
  CREATE TABLE paths (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('curated', 'user')),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    genre TEXT,
    curated_version INTEGER,
    joined_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE path_books (
    path_id TEXT NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    ol_work_key TEXT,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    note TEXT,
    PRIMARY KEY (path_id, position)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: public-domain classics, downloaded on the phone for the reader
  `
  -- Public-domain texts only (see src/content/classics.ts). This is the one
  -- place book text is stored, and only for books that are out of copyright.
  CREATE TABLE classic_texts (
    classic_id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    chapter_count INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    downloaded_at TEXT NOT NULL,
    position_chapter INTEGER NOT NULL DEFAULT 0,
    position_fraction REAL NOT NULL DEFAULT 0,
    chapters_read INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE classic_chapters (
    classic_id TEXT NOT NULL REFERENCES classic_texts(classic_id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    words INTEGER NOT NULL,
    PRIMARY KEY (classic_id, idx)
  );
  `,
  // 3: the reader's own printed edition, from the barcode on the back cover
  `
  ALTER TABLE books ADD COLUMN isbn TEXT;
  CREATE UNIQUE INDEX books_isbn ON books(isbn) WHERE isbn IS NOT NULL;
  `,
  // 4: search by meaning. Vectors made on this phone from the reader's own
  // words (never from a quoted passage). Derived data: left out of backups and
  // rebuilt on the phone, and removed with its entry.
  `
  CREATE TABLE journal_vectors (
    entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    chunk INTEGER NOT NULL,
    model TEXT NOT NULL,
    text_hash TEXT NOT NULL,
    vector TEXT NOT NULL,
    PRIMARY KEY (entry_id, chunk)
  );
  `,
];

export async function migrate(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
