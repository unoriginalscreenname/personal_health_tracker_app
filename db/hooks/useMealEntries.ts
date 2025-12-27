import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import type { Food } from './useFoods';

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

  // Get today's date string
  const getToday = useCallback((): string => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Create a new meal entry
  const createEntry = useCallback(async (mealType?: string): Promise<number> => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const loggedAt = now.toISOString();

    const result = await db.runAsync(
      'INSERT INTO meal_entries (date, logged_at, meal_type) VALUES (?, ?, ?)',
      [date, loggedAt, mealType ?? null]
    );

    return result.lastInsertRowId;
  }, [db]);

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

    return result.lastInsertRowId;
  }, [db]);

  // Add a custom item to an entry (not from foods table)
  const addCustomItemToEntry = useCallback(async (
    entryId: number,
    name: string,
    protein: number,
    calories: number,
    quantity: number = 1
  ): Promise<number> => {
    const result = await db.runAsync(
      `INSERT INTO meal_entry_items
       (meal_entry_id, food_id, name, protein, calories, quantity)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [entryId, name, protein, calories, quantity]
    );

    return result.lastInsertRowId;
  }, [db]);

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
  }, [db]);

  // Delete an entire entry and its items (cascade)
  const deleteEntry = useCallback(async (entryId: number): Promise<void> => {
    await db.runAsync(
      'DELETE FROM meal_entries WHERE id = ?',
      [entryId]
    );
  }, [db]);

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
    getEntry,
  };
}
