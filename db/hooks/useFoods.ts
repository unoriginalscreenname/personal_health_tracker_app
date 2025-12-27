import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

export interface Food {
  id: number;
  name: string;
  protein: number;
  calories: number;
  is_default: number;
  is_archived: number;
}

export function useFoods() {
  const db = useSQLiteContext();

  // Get all active foods (not archived)
  const getFoods = useCallback(async (): Promise<Food[]> => {
    return db.getAllAsync<Food>(
      'SELECT * FROM foods WHERE is_archived = 0 ORDER BY name'
    );
  }, [db]);

  // Get a single food by ID
  const getFood = useCallback(async (id: number): Promise<Food | null> => {
    return db.getFirstAsync<Food>(
      'SELECT * FROM foods WHERE id = ?',
      [id]
    );
  }, [db]);

  // Add a new food (user-created, not default)
  const addFood = useCallback(async (
    name: string,
    protein: number,
    calories: number
  ): Promise<number> => {
    const result = await db.runAsync(
      'INSERT INTO foods (name, protein, calories, is_default) VALUES (?, ?, ?, 0)',
      [name, protein, calories]
    );
    return result.lastInsertRowId;
  }, [db]);

  // Update an existing food
  const updateFood = useCallback(async (
    id: number,
    updates: Partial<Pick<Food, 'name' | 'protein' | 'calories'>>
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

    values.push(id);
    await db.runAsync(
      `UPDATE foods SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }, [db]);

  // Archive a food (soft delete)
  const archiveFood = useCallback(async (id: number): Promise<void> => {
    await db.runAsync(
      'UPDATE foods SET is_archived = 1 WHERE id = ?',
      [id]
    );
  }, [db]);

  // Restore an archived food
  const restoreFood = useCallback(async (id: number): Promise<void> => {
    await db.runAsync(
      'UPDATE foods SET is_archived = 0 WHERE id = ?',
      [id]
    );
  }, [db]);

  return {
    getFoods,
    getFood,
    addFood,
    updateFood,
    archiveFood,
    restoreFood,
  };
}
