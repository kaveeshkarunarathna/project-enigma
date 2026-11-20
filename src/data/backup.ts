import type { Db } from './db';
import { notifyChanged } from './live';
import { MIGRATIONS } from './migrations';
import { getState, setState } from './settings';
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  BACKUP_TABLES,
  type Backup,
  type BackupRow,
  type BackupTable,
} from '@/domain/backup';

/** The schema version this build of the app writes and reads. */
export const SCHEMA_VERSION = MIGRATIONS.length;

const LAST_BACKUP = 'lastBackupAt';

/**
 * Everything the reader made, as one backup. Internal app state (keys that
 * start with `_`, such as a running lamp) stays out of it.
 */
export async function makeBackup(db: Db, at = new Date()): Promise<Backup> {
  const tables = {} as Record<BackupTable, BackupRow[]>;
  for (const name of BACKUP_TABLES) {
    const rows = await db.getAllAsync<BackupRow>(`SELECT * FROM ${name}`, []);
    tables[name] = name === 'settings' ? rows.filter((r) => !String(r.key).startsWith('_')) : rows;
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schema: SCHEMA_VERSION,
    exportedAt: at.toISOString(),
    tables,
  };
}

/**
 * Replaces everything on this phone with a backup, in one transaction: if
 * any row fails, nothing changes. Columns the backup does not know (it was
 * made by an older app) take their defaults; columns this app does not know
 * are dropped.
 */
export async function restoreBackup(db: Db, backup: Backup): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Children first, so foreign keys never point at a missing row.
    for (const name of [...BACKUP_TABLES].reverse()) {
      await db.runAsync(
        name === 'settings'
          ? "DELETE FROM settings WHERE key NOT LIKE '\\_%' ESCAPE '\\'"
          : `DELETE FROM ${name}`,
        [],
      );
    }
    for (const name of BACKUP_TABLES) {
      const known = new Set(
        (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${name})`, [])).map((c) => c.name),
      );
      for (const row of backup.tables[name]) {
        if (name === 'settings' && String(row.key).startsWith('_')) continue;
        const cols = Object.keys(row).filter((c) => known.has(c));
        if (!cols.length) continue;
        await db.runAsync(
          `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => row[c]),
        );
      }
    }
  });
  notifyChanged('books', 'sessions', 'nights', 'journal', 'paths', 'settings');
}

export async function lastBackupAt(db: Db): Promise<string | null> {
  return getState<string>(db, LAST_BACKUP);
}

export async function markBackedUp(db: Db, at = new Date()): Promise<void> {
  await setState(db, LAST_BACKUP, at.toISOString());
  notifyChanged('settings');
}
