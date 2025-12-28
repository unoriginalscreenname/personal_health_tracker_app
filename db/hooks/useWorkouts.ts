import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper to format time in local timezone (HH:MM AM/PM)
function formatTimeLocal(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Session type exercise mapping
const SESSION_EXERCISES = {
  a: ['squat', 'bench', 'row'],
  b: ['squat', 'overhead', 'deadlift'],
} as const;

export interface BoxingSession {
  id: number;
  date: string;
  duration_minutes: number;
  completed_at: string | null;
  created_at: string;
}

export interface Exercise {
  id: number;
  name: string;
  display_name: string;
  default_weight: number;
  sort_order: number;
}

export interface ExerciseLog {
  id: number;
  session_id: number;
  exercise_id: number;
  name: string;
  display_name: string;
  weight: number;
  sets_completed: number;
  sets_target: number;
  sort_order: number;
}

export interface WeightSession {
  id: number;
  date: string;
  session_type: 'a' | 'b';
  completed_at: string | null;
  created_at: string;
  exercises: ExerciseLog[];
}

export interface LastWeightSessionInfo {
  type: 'a' | 'b';
  daysAgo: number;
}

export function useWorkouts() {
  const db = useSQLiteContext();

  // Get today's date string (YYYY-MM-DD) in local timezone
  const getToday = useCallback((): string => {
    return formatDateLocal(new Date());
  }, []);

  // ============ BOXING ============

  const getBoxingSessionForDate = useCallback(async (
    date: string
  ): Promise<BoxingSession | null> => {
    return db.getFirstAsync<BoxingSession>(
      'SELECT * FROM boxing_sessions WHERE date = ?',
      [date]
    );
  }, [db]);

  const createBoxingSession = useCallback(async (
    durationMinutes: number = 15,
    forDate?: string
  ): Promise<number> => {
    const date = forDate ?? getToday();
    const result = await db.runAsync(
      'INSERT INTO boxing_sessions (date, duration_minutes) VALUES (?, ?)',
      [date, durationMinutes]
    );
    return result.lastInsertRowId;
  }, [db, getToday]);

  const completeBoxingSession = useCallback(async (
    sessionId: number
  ): Promise<void> => {
    // Store completion time in local timezone ISO format
    const now = new Date();
    const localIso = now.toISOString();
    await db.runAsync(
      'UPDATE boxing_sessions SET completed_at = ? WHERE id = ?',
      [localIso, sessionId]
    );
    // Update workout_complete in daily_stats
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM boxing_sessions WHERE id = ?',
      [sessionId]
    );
    if (session) {
      await updateWorkoutCompleteForDate(session.date);
    }
  }, [db]);

  const updateBoxingDuration = useCallback(async (
    sessionId: number,
    durationMinutes: number
  ): Promise<void> => {
    await db.runAsync(
      'UPDATE boxing_sessions SET duration_minutes = ? WHERE id = ?',
      [durationMinutes, sessionId]
    );
  }, [db]);

  const deleteBoxingSession = useCallback(async (
    sessionId: number
  ): Promise<void> => {
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM boxing_sessions WHERE id = ?',
      [sessionId]
    );
    await db.runAsync('DELETE FROM boxing_sessions WHERE id = ?', [sessionId]);
    if (session) {
      await updateWorkoutCompleteForDate(session.date);
    }
  }, [db]);

  // ============ WEIGHTS ============

  const getWeightSessionForDate = useCallback(async (
    date: string
  ): Promise<WeightSession | null> => {
    const session = await db.getFirstAsync<Omit<WeightSession, 'exercises'>>(
      'SELECT * FROM weight_sessions WHERE date = ?',
      [date]
    );
    if (!session) return null;

    const exercises = await db.getAllAsync<ExerciseLog>(`
      SELECT wel.*, e.name, e.display_name
      FROM weight_exercise_logs wel
      JOIN exercises e ON wel.exercise_id = e.id
      WHERE wel.session_id = ?
      ORDER BY wel.sort_order
    `, [session.id]);

    return { ...session, exercises } as WeightSession;
  }, [db]);

  const getLastWeightSession = useCallback(async (): Promise<LastWeightSessionInfo | null> => {
    const result = await db.getFirstAsync<{ session_type: string; date: string }>(`
      SELECT session_type, date FROM weight_sessions
      WHERE completed_at IS NOT NULL
      ORDER BY date DESC, completed_at DESC
      LIMIT 1
    `);
    if (!result) return null;

    const today = new Date(getToday());
    const lastDate = new Date(result.date);
    const daysAgo = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      type: result.session_type as 'a' | 'b',
      daysAgo,
    };
  }, [db, getToday]);

  const getLastWeightForExercise = useCallback(async (
    exerciseId: number
  ): Promise<number | null> => {
    const result = await db.getFirstAsync<{ weight: number }>(`
      SELECT wel.weight
      FROM weight_exercise_logs wel
      JOIN weight_sessions ws ON wel.session_id = ws.id
      WHERE wel.exercise_id = ? AND ws.completed_at IS NOT NULL
      ORDER BY ws.date DESC, ws.completed_at DESC
      LIMIT 1
    `, [exerciseId]);
    return result?.weight ?? null;
  }, [db]);

  const createWeightSession = useCallback(async (
    sessionType: 'a' | 'b',
    forDate?: string
  ): Promise<number> => {
    const date = forDate ?? getToday();

    // Create session
    const result = await db.runAsync(
      'INSERT INTO weight_sessions (date, session_type) VALUES (?, ?)',
      [date, sessionType]
    );
    const sessionId = result.lastInsertRowId;

    // Get exercises for this session type
    const exerciseNames = SESSION_EXERCISES[sessionType];

    // Create exercise logs with last-used or default weights
    for (let i = 0; i < exerciseNames.length; i++) {
      const exercise = await db.getFirstAsync<Exercise>(
        'SELECT * FROM exercises WHERE name = ?',
        [exerciseNames[i]]
      );

      if (exercise) {
        const lastWeight = await getLastWeightForExercise(exercise.id);
        const weight = lastWeight ?? exercise.default_weight;

        await db.runAsync(`
          INSERT INTO weight_exercise_logs
          (session_id, exercise_id, weight, sets_completed, sets_target, sort_order)
          VALUES (?, ?, ?, 0, 5, ?)
        `, [sessionId, exercise.id, weight, i]);
      }
    }

    return sessionId;
  }, [db, getToday, getLastWeightForExercise]);

  const updateExerciseLog = useCallback(async (
    logId: number,
    weight: number,
    setsCompleted: number
  ): Promise<void> => {
    await db.runAsync(
      'UPDATE weight_exercise_logs SET weight = ?, sets_completed = ? WHERE id = ?',
      [weight, setsCompleted, logId]
    );
  }, [db]);

  const completeWeightSession = useCallback(async (
    sessionId: number
  ): Promise<void> => {
    const now = new Date();
    const localIso = now.toISOString();
    await db.runAsync(
      'UPDATE weight_sessions SET completed_at = ? WHERE id = ?',
      [localIso, sessionId]
    );
    // Update workout_complete in daily_stats
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM weight_sessions WHERE id = ?',
      [sessionId]
    );
    if (session) {
      await updateWorkoutCompleteForDate(session.date);
    }
  }, [db]);

  const deleteWeightSession = useCallback(async (
    sessionId: number
  ): Promise<void> => {
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM weight_sessions WHERE id = ?',
      [sessionId]
    );
    await db.runAsync('DELETE FROM weight_sessions WHERE id = ?', [sessionId]);
    if (session) {
      await updateWorkoutCompleteForDate(session.date);
    }
  }, [db]);

  // ============ STATS ============

  // Update workout_complete flag in daily_stats for a given date
  // Note: This does NOT hook into streak logic - just records the flag
  const updateWorkoutCompleteForDate = useCallback(async (
    date: string
  ): Promise<void> => {
    // Check if any completed workout exists for this date
    const result = await db.getFirstAsync<{ complete: number }>(`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1 FROM boxing_sessions WHERE date = ? AND completed_at IS NOT NULL
        ) OR EXISTS (
          SELECT 1 FROM weight_sessions WHERE date = ? AND completed_at IS NOT NULL
        ) THEN 1
        ELSE 0
      END as complete
    `, [date, date]);

    const workoutComplete = result?.complete ?? 0;

    // Update daily_stats if row exists, otherwise create it
    const existingStats = await db.getFirstAsync(
      'SELECT 1 FROM daily_stats WHERE date = ?',
      [date]
    );

    if (existingStats) {
      await db.runAsync(
        'UPDATE daily_stats SET workout_complete = ?, updated_at = datetime(\'now\') WHERE date = ?',
        [workoutComplete, date]
      );
    } else {
      // Create row for this date
      const today = getToday();
      const isFinalized = date < today ? 1 : 0;
      await db.runAsync(`
        INSERT INTO daily_stats (date, fasting_compliant, supplements_complete, workout_complete, finalized)
        VALUES (?, 0, 0, ?, ?)
      `, [date, workoutComplete, isFinalized]);
    }
  }, [db, getToday]);

  const isWorkoutCompleteForDate = useCallback(async (
    date: string
  ): Promise<boolean> => {
    const result = await db.getFirstAsync<{ complete: number }>(`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1 FROM boxing_sessions WHERE date = ? AND completed_at IS NOT NULL
        ) OR EXISTS (
          SELECT 1 FROM weight_sessions WHERE date = ? AND completed_at IS NOT NULL
        ) THEN 1
        ELSE 0
      END as complete
    `, [date, date]);
    return result?.complete === 1;
  }, [db]);

  return {
    getToday,
    formatTimeLocal,
    // Boxing
    getBoxingSessionForDate,
    createBoxingSession,
    completeBoxingSession,
    updateBoxingDuration,
    deleteBoxingSession,
    // Weights
    getWeightSessionForDate,
    getLastWeightSession,
    getLastWeightForExercise,
    createWeightSession,
    updateExerciseLog,
    completeWeightSession,
    deleteWeightSession,
    // Stats
    isWorkoutCompleteForDate,
  };
}
