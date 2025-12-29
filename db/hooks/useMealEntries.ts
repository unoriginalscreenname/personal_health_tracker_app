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

export interface RecentCustomItem {
  name: string;
  protein: number;
  calories: number;
}

export function useMealEntries() {
  const db = useSQLiteContext();
  const { updateStatsForDate } = useDailyStats();

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

  // Helper to get entry's date by ID
  const getEntryDate = useCallback(async (entryId: number): Promise<string | null> => {
    const result = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM meal_entries WHERE id = ?',
      [entryId]
    );
    return result?.date ?? null;
  }, [db]);

  // Create a new meal entry (optionally for a specific date)
  const createEntry = useCallback(async (mealType?: string, forDate?: string): Promise<number> => {
    const now = new Date();
    const date = forDate ?? formatDateLocal(now);
    const loggedAt = now.toISOString(); // Timestamp can stay UTC

    const result = await db.runAsync(
      'INSERT INTO meal_entries (date, logged_at, meal_type) VALUES (?, ?, ?)',
      [date, loggedAt, mealType ?? null]
    );

    await updateStatsForDate(date);
    return result.lastInsertRowId;
  }, [db, updateStatsForDate]);

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

    const date = await getEntryDate(entryId);
    if (date) await updateStatsForDate(date);
    return result.lastInsertRowId;
  }, [db, getEntryDate, updateStatsForDate]);

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

    const date = await getEntryDate(entryId);
    if (date) await updateStatsForDate(date);
    return result.lastInsertRowId;
  }, [db, getEntryDate, updateStatsForDate]);

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

  // Update item details (name, protein, calories)
  const updateItem = useCallback(async (
    itemId: number,
    updates: { name?: string; protein?: number; calories?: number }
  ): Promise<void> => {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.protein !== undefined) {
      fields.push('protein = ?');
      values.push(updates.protein);
    }
    if (updates.calories !== undefined) {
      fields.push('calories = ?');
      values.push(updates.calories);
    }

    if (fields.length === 0) return;

    values.push(itemId);
    await db.runAsync(
      `UPDATE meal_entry_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update stats for the entry's date
    const item = await db.getFirstAsync<{ meal_entry_id: number }>(
      'SELECT meal_entry_id FROM meal_entry_items WHERE id = ?',
      [itemId]
    );
    if (item) {
      const date = await getEntryDate(item.meal_entry_id);
      if (date) await updateStatsForDate(date);
    }
  }, [db, getEntryDate, updateStatsForDate]);

  // Remove an item from an entry
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    // Get the entry ID and date before deleting
    const item = await db.getFirstAsync<{ meal_entry_id: number }>(
      'SELECT meal_entry_id FROM meal_entry_items WHERE id = ?',
      [itemId]
    );
    const date = item ? await getEntryDate(item.meal_entry_id) : null;

    await db.runAsync(
      'DELETE FROM meal_entry_items WHERE id = ?',
      [itemId]
    );

    if (date) await updateStatsForDate(date);
  }, [db, getEntryDate, updateStatsForDate]);

  // Delete an entire entry and its items (cascade)
  const deleteEntry = useCallback(async (entryId: number): Promise<void> => {
    // Get the date BEFORE deleting
    const date = await getEntryDate(entryId);

    await db.runAsync(
      'DELETE FROM meal_entries WHERE id = ?',
      [entryId]
    );

    if (date) await updateStatsForDate(date);
  }, [db, getEntryDate, updateStatsForDate]);

  // Update entry logged_at time
  const updateEntryTime = useCallback(async (entryId: number, newTime: Date): Promise<void> => {
    await db.runAsync(
      'UPDATE meal_entries SET logged_at = ? WHERE id = ?',
      [newTime.toISOString(), entryId]
    );

    const date = await getEntryDate(entryId);
    if (date) await updateStatsForDate(date);
  }, [db, getEntryDate, updateStatsForDate]);

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

  // Get unique recent custom items (user-added, not from foods table)
  const getRecentCustomItems = useCallback(async (limit: number = 20): Promise<RecentCustomItem[]> => {
    // Get unique custom items by name, ordered by most recent usage
    const result = await db.getAllAsync<RecentCustomItem>(`
      SELECT name, protein, calories
      FROM meal_entry_items
      WHERE food_id IS NULL
      GROUP BY LOWER(name)
      ORDER BY MAX(created_at) DESC
      LIMIT ?
    `, [limit]);
    return result;
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
    updateItem,
    removeItem,
    deleteEntry,
    updateEntryTime,
    getEntry,
    getDaysWithEntries,
    getRecentCustomItems,
    deleteEntriesForDate,
    deleteAllEntries,
  };
}
