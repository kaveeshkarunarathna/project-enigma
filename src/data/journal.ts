import { newId, nowIso, type Db } from './db';
import { notifyChanged } from './live';
import { checkQuote } from '@/domain/quotes';
import { nightKey } from '@/domain/time';

export type EntryKind = 'reflection' | 'note' | 'quote';

export type JournalEntry = {
  id: string;
  kind: EntryKind;
  night: string;
  createdAt: string;
  updatedAt: string;
  bookId: string | null;
  bookTitle: string | null;
  sessionId: string | null;
  promptId: string | null;
  body: string;
  quoteText: string | null;
  quotePage: number | null;
  quoteSource: 'typed' | 'scanned' | null;
};

type EntryRow = {
  id: string;
  kind: EntryKind;
  night: string;
  created_at: string;
  updated_at: string;
  book_id: string | null;
  book_title: string | null;
  session_id: string | null;
  prompt_id: string | null;
  body: string;
  quote_text: string | null;
  quote_page: number | null;
  quote_source: 'typed' | 'scanned' | null;
};

function toEntry(r: EntryRow): JournalEntry {
  return {
    id: r.id,
    kind: r.kind,
    night: r.night,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    bookId: r.book_id,
    bookTitle: r.book_title,
    sessionId: r.session_id,
    promptId: r.prompt_id,
    body: r.body,
    quoteText: r.quote_text,
    quotePage: r.quote_page,
    quoteSource: r.quote_source,
  };
}

export type NewEntry = {
  kind: EntryKind;
  body?: string;
  bookId?: string | null;
  sessionId?: string | null;
  promptId?: string | null;
  quoteText?: string | null;
  quotePage?: number | null;
  quoteSource?: 'typed' | 'scanned' | null;
  at?: Date;
};

export async function addEntry(db: Db, input: NewEntry): Promise<JournalEntry> {
  const body = (input.body ?? '').trim();
  let quoteText: string | null = null;
  if (input.kind === 'quote') {
    const check = checkQuote(input.quoteText ?? '');
    if (check.status === 'empty') throw new Error('A quote needs some text');
    if (check.status === 'too-long') throw new Error('Quotes are kept to a short passage');
    quoteText = check.text;
  } else if (!body) {
    throw new Error('Write a few words first');
  }
  const at = input.at ?? new Date();
  const id = newId('je');
  const now = at.toISOString();
  await db.runAsync(
    `INSERT INTO journal_entries (id, kind, night, created_at, updated_at, book_id, session_id, prompt_id,
       body, quote_text, quote_page, quote_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.kind,
      nightKey(at),
      now,
      now,
      input.bookId ?? null,
      input.sessionId ?? null,
      input.promptId ?? null,
      body,
      quoteText,
      input.kind === 'quote' && input.quotePage && input.quotePage > 0 ? Math.round(input.quotePage) : null,
      input.kind === 'quote' ? (input.quoteSource ?? 'typed') : null,
    ],
  );
  notifyChanged('journal');
  return (await getEntry(db, id))!;
}

const SELECT = `SELECT j.*, b.title AS book_title FROM journal_entries j LEFT JOIN books b ON b.id = j.book_id`;

export async function getEntry(db: Db, id: string): Promise<JournalEntry | null> {
  const row = await db.getFirstAsync<EntryRow>(`${SELECT} WHERE j.id = ?`, [id]);
  return row ? toEntry(row) : null;
}

export async function listEntries(
  db: Db,
  opts: { kind?: EntryKind; bookId?: string; search?: string; limit?: number } = {},
): Promise<JournalEntry[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.kind) {
    where.push('j.kind = ?');
    params.push(opts.kind);
  }
  if (opts.bookId) {
    where.push('j.book_id = ?');
    params.push(opts.bookId);
  }
  if (opts.search?.trim()) {
    where.push(`(j.body LIKE ? ESCAPE '\\' OR j.quote_text LIKE ? ESCAPE '\\')`);
    const like = `%${opts.search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like);
  }
  const rows = await db.getAllAsync<EntryRow>(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY j.created_at DESC LIMIT ?`,
    [...params, opts.limit ?? 500],
  );
  return rows.map(toEntry);
}

export async function updateEntry(
  db: Db,
  id: string,
  patch: { body?: string; quoteText?: string; quotePage?: number | null },
): Promise<void> {
  const sets: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [nowIso()];
  if (patch.body !== undefined) {
    sets.push('body = ?');
    params.push(patch.body.trim());
  }
  if (patch.quoteText !== undefined) {
    const check = checkQuote(patch.quoteText);
    if (check.status === 'empty' || check.status === 'too-long') throw new Error('Quotes are kept to a short passage');
    sets.push('quote_text = ?');
    params.push(check.text);
  }
  if (patch.quotePage !== undefined) {
    sets.push('quote_page = ?');
    params.push(patch.quotePage && patch.quotePage > 0 ? Math.round(patch.quotePage) : null);
  }
  await db.runAsync(`UPDATE journal_entries SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  notifyChanged('journal');
}

export async function deleteEntry(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
  notifyChanged('journal');
}
