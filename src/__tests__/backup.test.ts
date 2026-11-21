/// <reference types="jest" />
import { makeBackup, restoreBackup, SCHEMA_VERSION } from '@/data/backup';
import { addBook, listBooks } from '@/data/books';
import { addEntry, listEntries } from '@/data/journal';
import { createUserPath, listPaths } from '@/data/paths';
import { logSession, skyStats } from '@/data/sessions';
import { getSettings, getState, setSetting, setState } from '@/data/settings';
import {
  backupDue,
  backupFileName,
  daysSinceBackup,
  describeSummary,
  parseBackup,
  summarizeBackup,
} from '@/domain/backup';

import { createTestDb } from './testDb';

const at = (day: number, h: number) => new Date(2026, 10, day, h);

async function filledDb() {
  const db = await createTestDb();
  const book = await addBook(db, { title: 'Dune', pageCount: 600, status: 'reading', isbn: '9780441013593' });
  await logSession(db, {
    bookId: book.id,
    startedAt: at(18, 21),
    endedAt: at(18, 22),
    seconds: 1800,
    pageTo: 40,
  });
  await logSession(db, {
    bookId: book.id,
    startedAt: at(19, 21),
    endedAt: at(19, 22),
    seconds: 1200,
    pageTo: 70,
  });
  await addEntry(db, { kind: 'reflection', body: 'The sand remembers.', bookId: book.id, at: at(19, 22) });
  await createUserPath(db, { title: 'Desert books' });
  await setSetting(db, 'goalMinutes', 15);
  await setState(db, 'lamp', { running: true });
  return db;
}

describe('backup files', () => {
  it('round-trips everything the reader made into an empty phone', async () => {
    const source = await filledDb();
    const backup = await makeBackup(source, new Date(2026, 10, 20));
    // The running lamp is app state, not the reader's, so it stays out.
    expect(backup.tables.settings.some((r) => String(r.key).startsWith('_'))).toBe(false);

    const text = JSON.stringify(backup);
    const parsed = parseBackup(text, SCHEMA_VERSION);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const target = await createTestDb();
    await restoreBackup(target, parsed.backup);
    expect((await listBooks(target)).map((b) => [b.title, b.currentPage, b.isbn])).toEqual([
      ['Dune', 70, '9780441013593'],
    ]);
    expect(await skyStats(target)).toEqual(await skyStats(source));
    expect((await listEntries(target)).map((e) => e.body)).toEqual(['The sand remembers.']);
    expect((await listPaths(target, 'user')).map((p) => p.title)).toEqual(['Desert books']);
    expect((await getSettings(target)).goalMinutes).toBe(15);
  });

  it('replaces what is on the phone, but keeps its own app state', async () => {
    const backup = await makeBackup(await filledDb());
    const target = await createTestDb();
    await addBook(target, { title: 'Something else' });
    await setState(target, 'lamp', { mine: true });
    await restoreBackup(target, backup);
    expect((await listBooks(target)).map((b) => b.title)).toEqual(['Dune']);
    expect(await getState(target, 'lamp')).toEqual({ mine: true });
  });

  it('changes nothing when a row cannot be written', async () => {
    const backup = await makeBackup(await filledDb());
    backup.tables.sessions.push({ ...backup.tables.sessions[0] }); // duplicate id
    const target = await createTestDb();
    await addBook(target, { title: 'Kept' });
    await expect(restoreBackup(target, backup)).rejects.toThrow();
    expect((await listBooks(target)).map((b) => b.title)).toEqual(['Kept']);
  });

  it('restores an older backup that lacks newer columns', async () => {
    const backup = await makeBackup(await filledDb());
    for (const b of backup.tables.books) delete b.isbn;
    backup.tables.books[0].made_up_column = 'ignored';
    const target = await createTestDb();
    await restoreBackup(target, backup);
    expect((await listBooks(target))[0].isbn).toBeNull();
  });

  it('refuses files that are not whole backups', () => {
    expect(parseBackup('hello', 3)).toEqual({ ok: false, reason: 'This file is not a Stellibria backup.' });
    expect(parseBackup(JSON.stringify({ app: 'other' }), 3).ok).toBe(false);
    const newer = parseBackup(JSON.stringify({ app: 'stellibria', format: 1, schema: 99, tables: {} }), 3);
    expect(newer.ok || newer.reason).toMatch(/newer Stellibria/);
    const damaged = parseBackup(
      JSON.stringify({ app: 'stellibria', format: 1, schema: 3, tables: { books: [{ title: { x: 1 } }] } }),
      3,
    );
    expect(damaged.ok || damaged.reason).toMatch(/damaged/);
    // Missing tables are simply empty.
    expect(parseBackup(JSON.stringify({ app: 'stellibria', format: 1, schema: 3, tables: {} }), 3).ok).toBe(
      true,
    );
  });

  it('still restores backups made under the old name, Night Atlas', () => {
    const old = parseBackup(JSON.stringify({ app: 'night-atlas', format: 1, schema: 3, tables: {} }), 3);
    expect(old.ok).toBe(true);
    expect(old.ok && old.backup.app).toBe('stellibria');
  });

  it('describes what a backup holds', async () => {
    const backup = await makeBackup(await filledDb());
    const s = summarizeBackup(backup);
    expect(s).toMatchObject({ books: 1, nights: 2, sessions: 2, entries: 1, ownPaths: 1, minutes: 50 });
    expect(describeSummary(s)).toBe('1 book, 2 nights of reading, 1 journal entry, 1 path of your own');
    expect(describeSummary({ books: 0, nights: 0, sessions: 0, entries: 0, ownPaths: 0, minutes: 0 })).toBe(
      'Nothing yet',
    );
  });

  it('names files by date and suggests a backup gently', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('stellibria-2026-01-05.json');
    const now = new Date(2026, 10, 20, 12);
    expect(daysSinceBackup(null, now)).toBeNull();
    expect(daysSinceBackup(new Date(2026, 10, 10, 12).toISOString(), now)).toBe(10);
    expect(backupDue(3, null)).toBe(false);
    expect(backupDue(7, null)).toBe(true);
    expect(backupDue(30, 12)).toBe(false);
    expect(backupDue(30, 30)).toBe(true);
  });
});
