/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import type { Db, SqlValue } from '@/data/db';
import { migrate } from '@/data/migrations';

/** An in-memory database with the same interface as expo-sqlite, for tests. */
export async function createTestDb(): Promise<Db> {
  const raw = new DatabaseSync(':memory:');
  let depth = 0;
  const db: Db = {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params: SqlValue[]) {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return raw
        .prepare(sql)
        .all(...params)
        .map((row: object) => ({ ...row })) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      const row = raw.prepare(sql).get(...params);
      return (row ? { ...row } : null) as T | null;
    },
    async withTransactionAsync(task) {
      const outer = depth === 0;
      if (outer) raw.exec('BEGIN');
      depth++;
      try {
        await task();
        depth--;
        if (outer) raw.exec('COMMIT');
      } catch (e) {
        depth--;
        if (outer) raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  await migrate(db);
  return db;
}
