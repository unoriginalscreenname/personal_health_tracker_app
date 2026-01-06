import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

export interface DailyStats {
  date: string;
  fasting_compliant: number;
  supplements_complete: number;
  workout_complete: number;
  finalized: number;
}

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useDailyStats() {
  const db = useSQLiteContext();

  // Get today's date string (YYYY-MM-DD) in local timezone
  const getToday = useCallback((): string => {
    return formatDateLocal(new Date());
  }, []);

  // Get yesterday's date string in local timezone
  const getYesterday = useCallback((): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateLocal(d);
  }, []);

  // Check if a row exists for a given date
  const hasRowForDate = useCallback(async (date: string): Promise<boolean> => {
    const row = await db.getFirstAsync(
      'SELECT 1 FROM daily_stats WHERE date = ?',
      [date]
    );
    return !!row;
  }, [db]);

  // Calculate fasting compliance for a date
  // Rule: All meals must be between 12:00 and 18:00 LOCAL time
  // No meals = not compliant (can't verify)
  const calculateFastingCompliance = useCallback(async (date: string): Promise<boolean> => {
    const result = await db.getFirstAsync<{ compliant: number }>(`
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN MIN(CAST(strftime('%H', logged_at, 'localtime') AS INTEGER)) >= 12
         AND MAX(CAST(strftime('%H', logged_at, 'localtime') AS INTEGER)) < 18 THEN 1
        ELSE 0
      END as compliant
      FROM meal_entries
      WHERE date = ?
    `, [date]);
    return result?.compliant === 1;
  }, [db]);

  // Calculate supplements completion for a date
  // Rule: All supplements at target, except water only needs 2/4
  const calculateSupplementsComplete = useCallback(async (date: string): Promise<boolean> => {
    const result = await db.getFirstAsync<{ complete: number }>(`
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN SUM(CASE
          WHEN s.name = 'Water' THEN (CASE WHEN COALESCE(sl.value, 0) >= 2 THEN 1 ELSE 0 END)
          ELSE (CASE WHEN COALESCE(sl.value, 0) >= s.target THEN 1 ELSE 0 END)
        END) = COUNT(*) THEN 1
        ELSE 0
      END as complete
      FROM supplements s
      LEFT JOIN supplement_logs sl ON s.id = sl.supplement_id AND sl.date = ?
      WHERE s.is_archived = 0
    `, [date]);
    return result?.complete === 1;
  }, [db]);

  // Calculate and finalize stats for a specific date (marks as finalized=1)
  const finalizeDate = useCallback(async (date: string): Promise<void> => {
    const fasting = await calculateFastingCompliance(date);
    const supplements = await calculateSupplementsComplete(date);

    await db.runAsync(`
      INSERT INTO daily_stats (date, fasting_compliant, supplements_complete, finalized, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        fasting_compliant = excluded.fasting_compliant,
        supplements_complete = excluded.supplements_complete,
        finalized = 1,
        updated_at = datetime('now')
    `, [date, fasting ? 1 : 0, supplements ? 1 : 0]);
  }, [db, calculateFastingCompliance, calculateSupplementsComplete]);

  // Initialize a new day - call this on app open / screen focus
  // Handles: first day ever, normal next day, gaps after days of not using app
  // IMPORTANT: Fill gaps from OLDEST row forward to catch all missing days
  const initializeDay = useCallback(async (): Promise<void> => {
    const today = getToday();
    const yesterday = getYesterday();

    // 1. Get OLDEST row (to fill ALL gaps from the beginning)
    const oldestRow = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM daily_stats ORDER BY date ASC LIMIT 1'
    );

    // 2. FIRST DAY EVER - no previous data exists, just create today
    if (!oldestRow) {
      await db.runAsync(`
        INSERT INTO daily_stats (date, fasting_compliant, supplements_complete, finalized)
        VALUES (?, 0, 0, 0)
      `, [today]);
      return;
    }

    // 3. Finalize any unfinalized days from the past
    const unfinalizedRows = await db.getAllAsync<{ date: string }>(
      'SELECT date FROM daily_stats WHERE finalized = 0 AND date < ?',
      [today]
    );
    for (const row of unfinalizedRows) {
      await finalizeDate(row.date);
    }

    // 4. FILL GAPS - from oldest row to yesterday (catches ALL missing days)
    const dayAfterOldest = new Date(oldestRow.date);
    dayAfterOldest.setDate(dayAfterOldest.getDate() + 1);
    const yesterdayDate = new Date(yesterday);

    while (dayAfterOldest <= yesterdayDate) {
      const dateStr = formatDateLocal(dayAfterOldest);
      const exists = await hasRowForDate(dateStr);

      if (!exists) {
        // Missing day - use finalizeDate to calculate actual stats if any data exists
        await finalizeDate(dateStr);
      }

      dayAfterOldest.setDate(dayAfterOldest.getDate() + 1);
    }

    // 5. Create today's row if it doesn't exist
    const todayExists = await hasRowForDate(today);
    if (!todayExists) {
      await db.runAsync(`
        INSERT INTO daily_stats (date, fasting_compliant, supplements_complete, finalized)
        VALUES (?, 0, 0, 0)
      `, [today]);
    }
  }, [db, getToday, getYesterday, hasRowForDate, finalizeDate]);

  // Update stats for any date (works for both finalized and non-finalized days)
  // Call this after user logs meals or supplements for that date
  const updateStatsForDate = useCallback(async (date: string): Promise<void> => {
    const fasting = await calculateFastingCompliance(date);
    const supplements = await calculateSupplementsComplete(date);

    // First try to update existing row
    const result = await db.runAsync(`
      UPDATE daily_stats
      SET fasting_compliant = ?, supplements_complete = ?, updated_at = datetime('now')
      WHERE date = ?
    `, [fasting ? 1 : 0, supplements ? 1 : 0, date]);

    // If no row existed, create one (for editing past dates that don't have a stats row)
    if (result.changes === 0) {
      const today = getToday();
      const isFinalized = date < today ? 1 : 0;
      await db.runAsync(`
        INSERT INTO daily_stats (date, fasting_compliant, supplements_complete, finalized)
        VALUES (?, ?, ?, ?)
      `, [date, fasting ? 1 : 0, supplements ? 1 : 0, isFinalized]);
    }
  }, [db, getToday, calculateFastingCompliance, calculateSupplementsComplete]);

  // Convenience wrapper for updating today's stats
  const updateTodayStats = useCallback(async (): Promise<void> => {
    await updateStatsForDate(getToday());
  }, [updateStatsForDate, getToday]);

  // Get streak count for a metric (only counts finalized days - yesterday and before)
  const getStreak = useCallback(async (
    metric: 'fasting_compliant' | 'supplements_complete'
  ): Promise<number> => {
    const yesterday = getYesterday();

    // Only look at finalized days (yesterday and before)
    const rows = await db.getAllAsync<{ date: string; value: number }>(`
      SELECT date, ${metric} as value
      FROM daily_stats
      WHERE finalized = 1 AND date <= ?
      ORDER BY date DESC
    `, [yesterday]);

    let streak = 0;
    // Add T12:00:00 to parse as local noon, avoiding timezone day-shift issues
    const startDate = new Date(yesterday + 'T12:00:00');

    for (const row of rows) {
      const expectedDate = new Date(startDate);
      expectedDate.setDate(startDate.getDate() - streak);
      const expected = formatDateLocal(expectedDate);

      if (row.date === expected && row.value === 1) {
        streak++;
      } else {
        break; // streak broken (either failure or gap)
      }
    }

    return streak;
  }, [db, getYesterday]);

  // Get combined streak (both fasting AND supplements must be successful)
  // Returns { baseStreak, todayComplete } so caller can decide how to display
  const getCombinedStreak = useCallback(async (): Promise<{ baseStreak: number; todayComplete: boolean }> => {
    const today = getToday();
    const yesterday = getYesterday();

    // Get finalized days with both metrics
    const rows = await db.getAllAsync<{ date: string; fasting: number; supps: number }>(`
      SELECT date, fasting_compliant as fasting, supplements_complete as supps
      FROM daily_stats
      WHERE finalized = 1 AND date <= ?
      ORDER BY date DESC
    `, [yesterday]);

    let baseStreak = 0;
    // Add T12:00:00 to parse as local noon, avoiding timezone day-shift issues
    const startDate = new Date(yesterday + 'T12:00:00');

    for (const row of rows) {
      const expectedDate = new Date(startDate);
      expectedDate.setDate(startDate.getDate() - baseStreak);
      const expected = formatDateLocal(expectedDate);

      if (row.date === expected && row.fasting === 1 && row.supps === 1) {
        baseStreak++;
      } else {
        break; // streak broken
      }
    }

    // Check if today would count (both metrics successful)
    const todayStats = await db.getFirstAsync<{ fasting: number; supps: number }>(`
      SELECT fasting_compliant as fasting, supplements_complete as supps
      FROM daily_stats
      WHERE date = ?
    `, [today]);

    const todayComplete = todayStats?.fasting === 1 && todayStats?.supps === 1;

    return { baseStreak, todayComplete };
  }, [db, getToday, getYesterday]);

  // Get stats for calendar display
  const getStatsForRange = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<DailyStats[]> => {
    return db.getAllAsync(`
      SELECT date, fasting_compliant, supplements_complete, workout_complete, finalized
      FROM daily_stats
      WHERE date BETWEEN ? AND ?
      ORDER BY date
    `, [startDate, endDate]);
  }, [db]);

  // Get today's current (in-progress) stats
  const getTodayStats = useCallback(async (): Promise<DailyStats | null> => {
    const today = getToday();
    return db.getFirstAsync(`
      SELECT date, fasting_compliant, supplements_complete, finalized
      FROM daily_stats
      WHERE date = ?
    `, [today]);
  }, [db, getToday]);

  // Check if a date has any data (meal_entries, supplement_logs, or daily_stats)
  const hasDataForDate = useCallback(async (date: string): Promise<boolean> => {
    const [meals, supplements, stats] = await Promise.all([
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM meal_entries WHERE date = ?', [date]),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM supplement_logs WHERE date = ?', [date]),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM daily_stats WHERE date = ?', [date]),
    ]);
    return (meals?.count ?? 0) > 0 || (supplements?.count ?? 0) > 0 || (stats?.count ?? 0) > 0;
  }, [db]);

  // Move all data from one date to another
  // This updates meal_entries, supplement_logs, and daily_stats
  const moveDateData = useCallback(async (fromDate: string, toDate: string): Promise<void> => {
    // Check if target date already has data
    const targetHasData = await hasDataForDate(toDate);
    if (targetHasData) {
      throw new Error('Target date already has data');
    }

    // Move all data in a transaction-like manner
    await db.runAsync('UPDATE meal_entries SET date = ? WHERE date = ?', [toDate, fromDate]);
    await db.runAsync('UPDATE supplement_logs SET date = ? WHERE date = ?', [toDate, fromDate]);
    await db.runAsync('UPDATE daily_stats SET date = ? WHERE date = ?', [toDate, fromDate]);
  }, [db, hasDataForDate]);

  // Delete all data for a specific date
  // Removes: meal_entries (cascade deletes meal_entry_items), supplement_logs,
  // boxing_sessions, weight_sessions (cascade deletes weight_exercise_logs), daily_stats
  const deleteDate = useCallback(async (date: string): Promise<void> => {
    await db.runAsync('DELETE FROM meal_entries WHERE date = ?', [date]);
    await db.runAsync('DELETE FROM supplement_logs WHERE date = ?', [date]);
    await db.runAsync('DELETE FROM boxing_sessions WHERE date = ?', [date]);
    await db.runAsync('DELETE FROM weight_sessions WHERE date = ?', [date]);
    await db.runAsync('DELETE FROM daily_stats WHERE date = ?', [date]);
  }, [db]);

  return {
    getToday,
    initializeDay,
    updateStatsForDate,
    updateTodayStats,
    getStreak,
    getCombinedStreak,
    getStatsForRange,
    getTodayStats,
    hasDataForDate,
    moveDateData,
    deleteDate,
  };
}
