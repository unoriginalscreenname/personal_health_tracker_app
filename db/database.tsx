import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { type ReactNode } from 'react';
import {
  DATABASE_VERSION,
  CREATE_TABLES_SQL,
  seedDefaultFoods,
  seedDefaultSupplements,
} from './schema';

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  return (
    <SQLiteProvider databaseName="visceral.db" onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // One-time fixes (run every time, before version check)
  try {
    await db.runAsync(`UPDATE supplements SET name = 'NAC' WHERE name = 'Vitamin D'`);
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  // Get current database version
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  // Already up to date
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  // Version 0 -> 1: Initial schema
  if (currentVersion === 0) {
    console.log('Initializing database schema v1...');

    // Create all tables
    await db.execAsync(CREATE_TABLES_SQL);

    // Seed default data
    await seedDefaultFoods(db);
    await seedDefaultSupplements(db);

    console.log('Database initialized with seed data');
  }

  // Update version
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// Re-export the context hook for convenience
export { useSQLiteContext } from 'expo-sqlite';
