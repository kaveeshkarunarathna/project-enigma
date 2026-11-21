/**
 * The backup file: everything the reader made, in one JSON file they keep
 * wherever they like. Nothing is uploaded; the phone's share sheet hands the
 * file to the reader. This module only checks and describes backups, so it
 * can be tested without a database.
 */

export const BACKUP_APP = 'stellibria';
/** Backups made before the app was named Stellibria. Still restored. */
export const LEGACY_BACKUP_APPS: readonly string[] = ['night-atlas'];
export const BACKUP_FORMAT = 1;

/**
 * Tables in a backup, in the order they are written back (parents first).
 * Downloaded classics are left out: they are public-domain texts that can be
 * downloaded again, and they would make the file large.
 */
export const BACKUP_TABLES = [
  'settings',
  'nights',
  'books',
  'sessions',
  'journal_entries',
  'paths',
  'path_books',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupRow = Record<string, string | number | null>;

export type Backup = {
  app: typeof BACKUP_APP;
  format: number;
  /** The database schema version the backup was made with. */
  schema: number;
  exportedAt: string;
  tables: Record<BackupTable, BackupRow[]>;
};

export type BackupSummary = {
  books: number;
  nights: number;
  sessions: number;
  entries: number;
  ownPaths: number;
  minutes: number;
};

export type ParseResult = { ok: true; backup: Backup } | { ok: false; reason: string };

const NOT_A_BACKUP = 'This file is not a Stellibria backup.';

/** Reads a backup file's text and checks it is whole before anything is replaced. */
export function parseBackup(text: string, currentSchema: number): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: NOT_A_BACKUP };
  }
  if (!isObject(data) || !isOurApp(data.app)) return { ok: false, reason: NOT_A_BACKUP };
  if (typeof data.format !== 'number' || data.format > BACKUP_FORMAT) {
    return {
      ok: false,
      reason: 'This backup was made by a newer Stellibria. Update the app, then try again.',
    };
  }
  if (typeof data.schema !== 'number' || data.schema > currentSchema) {
    return {
      ok: false,
      reason: 'This backup was made by a newer Stellibria. Update the app, then try again.',
    };
  }
  if (!isObject(data.tables)) return { ok: false, reason: NOT_A_BACKUP };
  const tables = {} as Record<BackupTable, BackupRow[]>;
  for (const name of BACKUP_TABLES) {
    const rows = data.tables[name] ?? [];
    if (!Array.isArray(rows) || !rows.every(isRow)) {
      return { ok: false, reason: 'This backup is damaged, so nothing was changed.' };
    }
    tables[name] = rows;
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      format: data.format,
      schema: data.schema,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      tables,
    },
  };
}

function isOurApp(app: unknown): boolean {
  return app === BACKUP_APP || (typeof app === 'string' && LEGACY_BACKUP_APPS.includes(app));
}

/** What a backup holds, so the reader can see it before restoring. */
export function summarizeBackup(b: Pick<Backup, 'tables'>): BackupSummary {
  const t = b.tables;
  return {
    books: t.books.length,
    nights: new Set(t.sessions.map((s) => s.night)).size,
    sessions: t.sessions.length,
    entries: t.journal_entries.length,
    ownPaths: t.paths.filter((p) => p.source === 'user').length,
    minutes: Math.floor(
      t.sessions.reduce((sum, s) => sum + (typeof s.seconds === 'number' ? s.seconds : 0), 0) / 60,
    ),
  };
}

/** "12 books, 40 nights, 18 journal entries", leaving out what is empty. */
export function describeSummary(s: BackupSummary): string {
  const parts = [
    count(s.books, 'book'),
    count(s.nights, 'night of reading', 'nights of reading'),
    count(s.entries, 'journal entry', 'journal entries'),
    count(s.ownPaths, 'path of your own', 'paths of your own'),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Nothing yet';
}

/** A file name that sorts by date: stellibria-2026-11-20.json */
export function backupFileName(at: Date): string {
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `stellibria-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}.json`;
}

/** Days since the last backup, or null if there has never been one. */
export function daysSinceBackup(lastIso: string | null, now = new Date()): number | null {
  if (!lastIso) return null;
  const t = Date.parse(lastIso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/**
 * Whether to suggest a backup on the sky: only once there is something worth
 * keeping (a week of nights), and then only every 30 days.
 */
export function backupDue(nightsRead: number, days: number | null): boolean {
  if (nightsRead < 7) return false;
  return days === null || days >= 30;
}

function count(n: number, one: string, many = `${one}s`): string | null {
  if (!n) return null;
  return `${n} ${n === 1 ? one : many}`;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isRow(x: unknown): x is BackupRow {
  return (
    isObject(x) && Object.values(x).every((v) => v === null || typeof v === 'string' || typeof v === 'number')
  );
}
