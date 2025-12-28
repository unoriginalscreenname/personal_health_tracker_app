import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { useDailyStats } from './useDailyStats';

export interface Supplement {
  id: number;
  name: string;
  target: number;
  dosage: string | null;
  is_default: number;
  is_archived: number;
  sort_order: number;
}

export interface SupplementWithValue extends Supplement {
  value: number; // current day's value
}

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useSupplements() {
  const db = useSQLiteContext();
  const { updateTodayStats } = useDailyStats();

  // Get today's date string in local timezone
  const getToday = useCallback((): string => {
    return formatDateLocal(new Date());
  }, []);

  // Get all supplements with their value for a specific date
  const getSupplementsForDate = useCallback(async (
    date: string
  ): Promise<SupplementWithValue[]> => {
    return db.getAllAsync<SupplementWithValue>(`
      SELECT s.*, COALESCE(sl.value, 0) as value
      FROM supplements s
      LEFT JOIN supplement_logs sl ON s.id = sl.supplement_id AND sl.date = ?
      WHERE s.is_archived = 0
      ORDER BY s.sort_order
    `, [date]);
  }, [db]);

  // Toggle a supplement (for target=1 items)
  const toggleSupplement = useCallback(async (
    supplementId: number,
    date: string
  ): Promise<void> => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, 1)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = CASE WHEN value = 0 THEN 1 ELSE 0 END
    `, [supplementId, date]);
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Increment a supplement (for target>1 items like water)
  const incrementSupplement = useCallback(async (
    supplementId: number,
    date: string,
    target: number
  ): Promise<void> => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, 1)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = MIN(value + 1, ?)
    `, [supplementId, date, target]);
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Decrement a supplement (for target>1 items)
  const decrementSupplement = useCallback(async (
    supplementId: number,
    date: string
  ): Promise<void> => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, 0)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = MAX(value - 1, 0)
    `, [supplementId, date]);
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Set a specific value for a supplement
  const setSupplementValue = useCallback(async (
    supplementId: number,
    date: string,
    value: number
  ): Promise<void> => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, ?)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = ?
    `, [supplementId, date, value, value]);
    await updateTodayStats();
  }, [db, updateTodayStats]);

  // Check if all supplements are at target for a date
  const isDateComplete = useCallback(async (date: string): Promise<boolean> => {
    const result = await db.getFirstAsync<{ incomplete: number }>(`
      SELECT COUNT(*) as incomplete
      FROM supplements s
      LEFT JOIN supplement_logs sl ON s.id = sl.supplement_id AND sl.date = ?
      WHERE s.is_archived = 0 AND COALESCE(sl.value, 0) < s.target
    `, [date]);

    return (result?.incomplete ?? 1) === 0;
  }, [db]);

  // Get streak (consecutive days where all supplements are at target)
  const getStreak = useCallback(async (): Promise<number> => {
    // Get all dates where all supplements were completed
    const completeDates = await db.getAllAsync<{ date: string }>(`
      SELECT sl.date
      FROM supplement_logs sl
      JOIN supplements s ON sl.supplement_id = s.id
      WHERE s.is_archived = 0
      GROUP BY sl.date
      HAVING SUM(CASE WHEN sl.value >= s.target THEN 1 ELSE 0 END) =
             (SELECT COUNT(*) FROM supplements WHERE is_archived = 0)
      ORDER BY sl.date DESC
    `);

    let streak = 0;
    const today = new Date();

    for (const row of completeDates) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak);
      const expected = formatDateLocal(expectedDate);

      if (row.date === expected) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [db]);

  // Add a new supplement (user-created)
  const addSupplement = useCallback(async (
    name: string,
    target: number = 1,
    dosage?: string
  ): Promise<number> => {
    // Get max sort_order
    const maxOrder = await db.getFirstAsync<{ max_order: number }>(
      'SELECT MAX(sort_order) as max_order FROM supplements'
    );
    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    const result = await db.runAsync(
      'INSERT INTO supplements (name, target, dosage, is_default, sort_order) VALUES (?, ?, ?, 0, ?)',
      [name, target, dosage ?? null, sortOrder]
    );

    return result.lastInsertRowId;
  }, [db]);

  // Archive a supplement
  const archiveSupplement = useCallback(async (id: number): Promise<void> => {
    await db.runAsync(
      'UPDATE supplements SET is_archived = 1 WHERE id = ?',
      [id]
    );
  }, [db]);

  return {
    getToday,
    getSupplementsForDate,
    toggleSupplement,
    incrementSupplement,
    decrementSupplement,
    setSupplementValue,
    isDateComplete,
    getStreak,
    addSupplement,
    archiveSupplement,
  };
}
