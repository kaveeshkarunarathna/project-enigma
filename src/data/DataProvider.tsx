import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ReactNode } from 'react';

import type { Db } from './db';
import { migrate } from './migrations';

export const DATABASE_NAME = 'night-atlas.db';

type Props = {
  children: ReactNode;
  /** Extra setup after migrations, such as installing curated paths. */
  onReady?: (db: Db) => Promise<void>;
};

/** Opens the on-device database and runs migrations before rendering children. */
export function DataProvider({ children, onReady }: Props) {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      useSuspense
      onInit={async (db: SQLiteDatabase) => {
        await migrate(db as unknown as Db);
        await onReady?.(db as unknown as Db);
      }}>
      {children}
    </SQLiteProvider>
  );
}

/** The app database. Only use inside <DataProvider>. */
export function useDb(): Db {
  return useSQLiteContext() as unknown as Db;
}
