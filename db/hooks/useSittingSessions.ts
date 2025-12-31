import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SittingSession {
  id: number;
  date: string;
  sit_duration_minutes: number;
  exercises_completed: string[];
  completed_at: string;
  created_at: string;
}

interface SittingSessionRow {
  id: number;
  date: string;
  sit_duration_minutes: number;
  exercises_completed: string | null;
  completed_at: string;
  created_at: string;
}

export function useSittingSessions() {
  const db = useSQLiteContext();

  // Get today's date string in local timezone
  const getToday = useCallback((): string => {
    return formatDateLocal(new Date());
  }, []);

  // Log a completed sit/stand session
  const logSession = useCallback(async (
    sitDurationMinutes: number,
    exercisesCompleted: string[]
  ): Promise<number> => {
    const date = getToday();
    const completedAt = new Date().toISOString();
    const exercisesJson = JSON.stringify(exercisesCompleted);

    const result = await db.runAsync(
      `INSERT INTO sitting_sessions (date, sit_duration_minutes, exercises_completed, completed_at)
       VALUES (?, ?, ?, ?)`,
      [date, sitDurationMinutes, exercisesJson, completedAt]
    );

    return result.lastInsertRowId;
  }, [db, getToday]);

  // Get all sessions for a specific date
  const getSessionsForDate = useCallback(async (date: string): Promise<SittingSession[]> => {
    const rows = await db.getAllAsync<SittingSessionRow>(
      `SELECT * FROM sitting_sessions WHERE date = ? ORDER BY completed_at DESC`,
      [date]
    );

    return rows.map(row => ({
      ...row,
      exercises_completed: row.exercises_completed ? JSON.parse(row.exercises_completed) : [],
    }));
  }, [db]);

  // Get today's session count
  const getTodaySessionCount = useCallback(async (): Promise<number> => {
    const today = getToday();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sitting_sessions WHERE date = ?',
      [today]
    );
    return result?.count ?? 0;
  }, [db, getToday]);

  // Get total sessions for a date range (for stats)
  const getSessionCountForRange = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<number> => {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sitting_sessions WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );
    return result?.count ?? 0;
  }, [db]);

  // Delete a session by ID
  const deleteSession = useCallback(async (sessionId: number): Promise<void> => {
    await db.runAsync('DELETE FROM sitting_sessions WHERE id = ?', [sessionId]);
  }, [db]);

  return {
    logSession,
    getSessionsForDate,
    getTodaySessionCount,
    getSessionCountForRange,
    deleteSession,
    getToday,
  };
}
