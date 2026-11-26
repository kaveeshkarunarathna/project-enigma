import type { Db } from './db';
import { notifyChanged } from './live';

/**
 * Books the reader set aside with "Not for me", by normalized title. Kept as
 * a plain setting so it travels with a backup.
 */
const KEY = 'dismissedSuggestions';

export async function dismissedSuggestions(db: Db): Promise<string[]> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [KEY]);
  if (!row) return [];
  try {
    const list = JSON.parse(row.value);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function save(db: Db, list: string[]) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [KEY, JSON.stringify(list)],
  );
  notifyChanged('settings');
}

export async function dismissSuggestion(db: Db, key: string): Promise<void> {
  const list = await dismissedSuggestions(db);
  if (!list.includes(key)) await save(db, [...list, key]);
}

export async function clearDismissedSuggestions(db: Db): Promise<void> {
  await save(db, []);
}
