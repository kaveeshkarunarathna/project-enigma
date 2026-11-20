/**
 * The small slice of a SQLite connection the app needs. `expo-sqlite`'s
 * `SQLiteDatabase` fits it, and tests use an in-memory adapter on Node's
 * built-in `node:sqlite`.
 */
export type SqlValue = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/** Short, sortable, collision-safe enough for one person's phone. */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
