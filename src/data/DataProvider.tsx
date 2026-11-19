import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ReactNode } from 'react';

import type { Db } from './db';
import { migrate } from './migrations';

export const DATABASE_NAME = 'night-atlas.db';

/** Extra setup that runs once after migrations, such as installing curated paths. */
const readyTasks: ((db: Db) => Promise<void>)[] = [];

export function onDatabaseReady(task: (db: Db) => Promise<void>) {
  readyTasks.push(task);
}

// Must keep the same identity across renders: SQLiteProvider re-opens the
// database whenever `onInit` changes, which with Suspense loops forever.
async function init(db: SQLiteDatabase) {
  const handle = db as unknown as Db;
  await migrate(handle);
  for (const task of readyTasks) await task(handle);
}

/** Opens the on-device database and runs migrations before rendering children. */
export function DataProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} useSuspense onInit={init}>
      {children}
    </SQLiteProvider>
  );
}

/** The app database. Only use inside <DataProvider>. */
export function useDb(): Db {
  return useSQLiteContext() as unknown as Db;
}
