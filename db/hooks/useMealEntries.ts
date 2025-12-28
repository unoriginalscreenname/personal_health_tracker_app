import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import type { Food } from './useFoods';
import { useDailyStats } from './useDailyStats';

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface MealEntryItem {
  id: number;
  meal_entry_id: number;
  food_id: number | null;
  name: string;
  protein: number;
  calories: number;
  quantity: number;
}

export interface MealEntry {
  id: number;
  date: string;
  logged_at: string;
  meal_type: string | null;
  note: string | null;
  items: MealEntryItem[];
}

export interface DayTotals {
  protein: number;
  calories: number;
}

export function useMealEntries() {
  const db = useSQLiteContext();
  const { updateTodayStats } = useDailyStats();

  // Get all entries for a specific date with their items
  const getEntriesForDate = useCallback(async (date: string): Promise<MealEntry[]> => {
    // Get entries
    const entries = await db.getAllAsync<Omit<MealEntry, 'items'>>(
      'SELECT * FROM meal_entries WHERE date = ? ORDER BY logged_at',
      [date]
    );

    // Get items for each entry
    const entriesWithItems: MealEntry[] = [];
    for (const entry of entries) {
      const items = await db.getAllAsync<MealEntryItem>(
        'SELECT * FROM meal_entry_items WHERE meal_entry_id = ? ORDER BY created_at',
        [entry.id]
      );
      entriesWithItems.push({ ...entry, items });
    }

    return entriesWithItems;
  }, [db]);

  // Get totals for a specific date
  const getTotalsForDate = useCallback(async (date: string): Promise<DayTotals> => {
    const result = await db.getFirstAsync<{ protein: number; calories: number }>(`
      SELECT
        COALESCE(SUM(protein * quantity), 0) as protein,
        COALESCE(SUM(calories * quantity), 0) as calories
      FROM meal_entry_items mei
      JOIN meal_entries me ON mei.meal_entry_id = me.id
      WHERE me.date = ?
    `, [date]);

    return {
      protein: result?.protein ?? 0,
      calories: result?.calories ?? 0,
    };
  }, [db]);

  // Get today's date string in local timezone
  const getToday = useCallback((): string => {
    return formatDateLocal(new Date());
  }, []);

  // Create a new meal entry (optionally for a specific date)
  const createEntry = useCallback(async (mealType?: string, forDate?: string): Promise<number> => {
    const now = new Date();
    const date = forDate ?? formatDateLocal(now);
    const loggedAt = now.toISOString(); // Timestamp can stay UTC

    const result = await db.runAsync(
      'INSERT INTO meal_entries (date, logged_at, meal_type) VALUES (?, ?, ?)',
      [date, loggedAt, mealType ?? null]
    );

    await updateTodayStats();
    return result.lastInsertRowId;
  }, [db, updateTodayStats]);

  // Add an item to an entry (from foods table)
  const addFoodToEntry = useCallback(async (
    entryId: number,
    food: Food,
    quantity: number = 1
  ): Promise<number> => {
    const result = await db.runAsync(
      `INSERT INTO meal_entry_items
       (meal_entry_id, food_id, name, protein, calories, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entryId, food.id, food.name, food.protein, food.calories, quantity]
    );

    await updateTodayStats();
    return result.lastInsertRowId;
  }, [db, updateTodayStats]);

  // Add a custom item to an entry (not from foods table)
  const addCustomItemToEntry = useCallback(async (
    entryId: number,
    name: string,
    protein: number,
    calories: number,
    quantity: number = 1,
    _description: string | null = null // TODO: add back once DB schema is stable
  ): Promise<number> => {
    const result = await db.runAsync(
      `INSERT INTO meal_entry_items
       (meal_entry_id, food_id, name, protein, calories, quantity)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [entryId, name, protein, calories, quantity]
    );

    await updateTodayStats();
    return result.lastInsertRowId;
  }, [db, updateTodayStats]);

  // Update item quantity
  const updateItemQuantity = useCallback(async (
    itemId: number,
    quantity: number
  ): Promise<void> => {
    await db.runAsync(
      'UPDATE meal_entry_items SET quantity = ? WHERE id = ?',
      [quantity, itemId]
    );
  }, [db]);

  // Remove an item from an entry
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    await db.runAsync(
      'DELETE FROM meal_entry_items WHERE id = ?',
      [itemId]
    );
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Delete an entire entry and its items (cascade)
  const deleteEntry = useCallback(async (entryId: number): Promise<void> => {
    await db.runAsync(
      'DELETE FROM meal_entries WHERE id = ?',
      [entryId]
    );
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Update entry logged_at time
  const updateEntryTime = useCallback(async (entryId: number, newTime: Date): Promise<void> => {
    await db.runAsync(
      'UPDATE meal_entries SET logged_at = ? WHERE id = ?',
      [newTime.toISOString(), entryId]
    );
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Get entry by ID
  const getEntry = useCallback(async (entryId: number): Promise<MealEntry | null> => {
    const entry = await db.getFirstAsync<Omit<MealEntry, 'items'>>(
      'SELECT * FROM meal_entries WHERE id = ?',
      [entryId]
    );

    if (!entry) return null;

    const items = await db.getAllAsync<MealEntryItem>(
      'SELECT * FROM meal_entry_items WHERE meal_entry_id = ? ORDER BY created_at',
      [entryId]
    );

    return { ...entry, items };
  }, [db]);

  // Get all days that have entries (for settings/data management)
  const getDaysWithEntries = useCallback(async (): Promise<string[]> => {
    const result = await db.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM meal_entries ORDER BY date DESC'
    );
    return result.map(r => r.date);
  }, [db]);

  // Delete all entries for a specific date
  const deleteEntriesForDate = useCallback(async (date: string): Promise<void> => {
    await db.runAsync(
      'DELETE FROM meal_entries WHERE date = ?',
      [date]
    );
  }, [db]);

  // Delete all entries (reset database)
  const deleteAllEntries = useCallback(async (): Promise<void> => {
    await db.runAsync('DELETE FROM meal_entries');
  }, [db]);

  return {
    getEntriesForDate,
    getTotalsForDate,
    getToday,
    createEntry,
    addFoodToEntry,
    addCustomItemToEntry,
    updateItemQuantity,
    removeItem,
    deleteEntry,
    updateEntryTime,
    getEntry,
    getDaysWithEntries,
    deleteEntriesForDate,
    deleteAllEntries,
  };
}
