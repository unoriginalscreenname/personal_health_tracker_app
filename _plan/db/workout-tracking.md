# Workout Tracking Implementation Plan

## Overview

Track two distinct workout types:
1. **Boxing sessions** - time-based, simple (date + duration)
2. **5x5 weight sessions** - exercise-based with A/B alternation (parent + child rows)

Each type gets its own table(s) following established patterns. Both integrate with `daily_stats` for streak tracking.

---

## 5x5 Program Reference

| Session A | Session B |
|-----------|-----------|
| Squat     | Squat     |
| Bench Press | Overhead Press |
| Barbell Row | Deadlift |

- 5 sets of 5 reps per exercise (fixed)
- Same weight across all sets for an exercise
- User adjusts weight between sessions

**Default starting weights:**
| Exercise | Default Weight |
|----------|----------------|
| Squat | 95 lbs |
| Bench Press | 95 lbs |
| Barbell Row | 95 lbs |
| Overhead Press | 65 lbs |
| Deadlift | 115 lbs |

---

## Schema Design

### Why Separate Tables?

Boxing and weight training have fundamentally different data models:

| Aspect | Boxing | Weights |
|--------|--------|---------|
| Data needed | duration only | exercises, weights, sets |
| Child rows | none | yes (exercise logs) |
| Session types | one | A or B |
| Complexity | simple | complex |

Mixing them in one table would create:
- Nullable columns that only apply to one type
- Queries always needing `WHERE session_type = ...`
- Unclear schema (what does this table represent?)

**Following existing patterns:** `meal_entries` + `meal_entry_items` are separate from `supplement_logs` because they model different things. Same principle here.

---

### Table: `boxing_sessions`

Simple time-based sessions. One row = one boxing workout.

```sql
CREATE TABLE boxing_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  completed_at TEXT,                     -- ISO timestamp, NULL = in progress
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_boxing_sessions_date ON boxing_sessions(date);
```

**Design notes:**
- `completed_at` NULL means session created but not finished (allows "start then complete" flow)
- `duration_minutes` is user-editable, default 15
- No `started_at` - we don't need it; `created_at` captures when logged, `completed_at` when done
- Multiple sessions per day allowed (schema doesn't restrict, UI can)

---

### Table: `exercises`

Master list of 5x5 exercises. Fixed set, seeded on first run.

```sql
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,             -- 'squat', 'bench', 'row', 'overhead', 'deadlift'
  display_name TEXT NOT NULL,            -- 'Squat', 'Bench Press', etc.
  default_weight INTEGER NOT NULL,       -- starting weight if no history
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

**Design notes:**
- `name` is the machine-readable key (used in queries, session type mapping)
- `display_name` is the human-readable label
- `default_weight` only used when no previous logs exist
- Unlike `foods`, these won't change - fixed 5x5 program. No `is_archived` needed.

---

### Table: `weight_sessions`

Parent table for weight training sessions.

```sql
CREATE TABLE weight_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  session_type TEXT NOT NULL,            -- 'a' | 'b'
  completed_at TEXT,                     -- ISO timestamp, NULL = in progress
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_weight_sessions_date ON weight_sessions(date);
```

**Design notes:**
- `session_type` is just 'a' or 'b' (not 'weights_a' - table name provides context)
- Same `completed_at` pattern as boxing
- Child rows in `weight_exercise_logs` contain the actual workout data

---

### Table: `weight_exercise_logs`

Child rows for each exercise within a weight session.

```sql
CREATE TABLE weight_exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  weight INTEGER NOT NULL,               -- lbs used this session
  sets_completed INTEGER NOT NULL DEFAULT 0,  -- 0-5
  sets_target INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES weight_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

CREATE INDEX idx_weight_exercise_logs_session ON weight_exercise_logs(session_id);
```

**Design notes:**
- `weight` is per-session (tracks progression, historical accuracy)
- `sets_completed = 0` explicitly means "skipped" (vs no row = not part of session)
- `sets_target` defaults to 5 but stored per-log for flexibility
- `sort_order` maintains exercise order within session
- CASCADE delete: removing session removes its logs

**Why store weight per session instead of referencing a "current weight" elsewhere?**
Following `meal_entry_items` pattern - denormalize for historical accuracy. If we only stored exercise_id, we'd need another table to track "what weight did I use when?" The log IS the history.

---

### Daily Stats Integration

Add to `daily_stats`:

```sql
ALTER TABLE daily_stats ADD COLUMN workout_complete INTEGER DEFAULT 0;
```

**Calculation logic:**
```sql
SELECT CASE
  WHEN EXISTS (
    SELECT 1 FROM boxing_sessions
    WHERE date = ? AND completed_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM weight_sessions
    WHERE date = ? AND completed_at IS NOT NULL
  ) THEN 1
  ELSE 0
END as workout_complete
```

Any completed workout (boxing OR weights) = day complete for streak purposes.

---

## Seed Data

```typescript
const DEFAULT_EXERCISES = [
  { name: 'squat', display_name: 'Squat', default_weight: 95, sort_order: 0 },
  { name: 'bench', display_name: 'Bench Press', default_weight: 95, sort_order: 1 },
  { name: 'row', display_name: 'Barbell Row', default_weight: 95, sort_order: 2 },
  { name: 'overhead', display_name: 'Overhead Press', default_weight: 65, sort_order: 3 },
  { name: 'deadlift', display_name: 'Deadlift', default_weight: 115, sort_order: 4 },
];

// Which exercises belong to which session type
const SESSION_EXERCISES = {
  a: ['squat', 'bench', 'row'],
  b: ['squat', 'overhead', 'deadlift'],
};
```

---

## Key Queries

### Get today's boxing session
```sql
SELECT * FROM boxing_sessions WHERE date = ? LIMIT 1;
```

### Get today's weight session with exercises
```sql
-- Session
SELECT * FROM weight_sessions WHERE date = ? LIMIT 1;

-- Exercises (if session exists)
SELECT wel.*, e.name, e.display_name
FROM weight_exercise_logs wel
JOIN exercises e ON wel.exercise_id = e.id
WHERE wel.session_id = ?
ORDER BY wel.sort_order;
```

### Determine next session type (A or B)
```sql
SELECT session_type, date FROM weight_sessions
WHERE completed_at IS NOT NULL
ORDER BY date DESC, completed_at DESC
LIMIT 1;
```
- If last was 'a' → suggest 'b'
- If last was 'b' → suggest 'a'
- If no history → suggest 'a'

### Get last weight used for an exercise
```sql
SELECT wel.weight
FROM weight_exercise_logs wel
JOIN weight_sessions ws ON wel.session_id = ws.id
WHERE wel.exercise_id = ? AND ws.completed_at IS NOT NULL
ORDER BY ws.date DESC, ws.completed_at DESC
LIMIT 1;
```

### Days since last weight session
```sql
SELECT julianday('now') - julianday(date) as days_ago
FROM weight_sessions
WHERE completed_at IS NOT NULL
ORDER BY date DESC
LIMIT 1;
```

---

## Hook: `useWorkouts`

Following the patterns from `useMealEntries` and `useSupplements`:
- Uses `useSQLiteContext()`
- Uses `useCallback` for all functions
- Calls `updateStatsForDate()` after mutations
- Uses `formatDateLocal()` helper

```typescript
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';
import { useDailyStats } from './useDailyStats';

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
}

export interface Exercise {
  id: number;
  name: string;
  display_name: string;
  default_weight: number;
}

export interface ExerciseLog {
  id: number;
  session_id: number;
  exercise_id: number;
  name: string;           // from exercises table
  display_name: string;   // from exercises table
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
  exercises: ExerciseLog[];
}

export interface LastWeightSessionInfo {
  type: 'a' | 'b';
  daysAgo: number;
}

export function useWorkouts() {
  const db = useSQLiteContext();
  const { updateStatsForDate } = useDailyStats();

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
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE boxing_sessions SET completed_at = ? WHERE id = ?',
      [now, sessionId]
    );
    // Get date for stats update
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM boxing_sessions WHERE id = ?',
      [sessionId]
    );
    if (session) await updateStatsForDate(session.date);
  }, [db, updateStatsForDate]);

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
    if (session) await updateStatsForDate(session.date);
  }, [db, updateStatsForDate]);

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
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE weight_sessions SET completed_at = ? WHERE id = ?',
      [now, sessionId]
    );
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM weight_sessions WHERE id = ?',
      [sessionId]
    );
    if (session) await updateStatsForDate(session.date);
  }, [db, updateStatsForDate]);

  const deleteWeightSession = useCallback(async (
    sessionId: number
  ): Promise<void> => {
    const session = await db.getFirstAsync<{ date: string }>(
      'SELECT date FROM weight_sessions WHERE id = ?',
      [sessionId]
    );
    await db.runAsync('DELETE FROM weight_sessions WHERE id = ?', [sessionId]);
    if (session) await updateStatsForDate(session.date);
  }, [db, updateStatsForDate]);

  // ============ STATS ============

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
```

---

## Daily Stats Hook Update

Add workout calculation to `useDailyStats`:

```typescript
// In calculateStatsForDate, add:
const calculateWorkoutComplete = async (date: string): Promise<boolean> => {
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
};

// Update the stats update query to include workout_complete
```

---

## Navigation Flow

```
Command Center
  └── "Start your workout" card
        └── /workout (Active Workout Screen)
              │
              ├── Boxing Section
              │     ├── [No session] "Start Boxing" button
              │     ├── [Created, not complete] Duration picker + "Complete" button
              │     └── [Completed] Shows "15 min @ 2:30 PM" + tap to edit
              │
              └── Weights Section
                    ├── [No session today]
                    │     ├── "Last: Session A, 3 days ago"
                    │     └── "Start A" | "Start B" buttons
                    │
                    └── [Session exists]
                          ├── Shows type badge + summary
                          └── Tap → /workout/weights (Active Weights Screen)
                                ├── Exercise rows
                                │     ├── Name + weight input (+-5 buttons)
                                │     ├── Sets: 5 circles, tap to fill
                                │     └── Checkmark when 5/5
                                └── "Save Session" button
```

---

## UI States

### Boxing Card

| State | Display |
|-------|---------|
| No session | "Start Boxing" button (dashed border style) |
| In progress | Duration input (editable) + "Complete" button |
| Completed | "15 min" with timestamp, tappable to edit |

### Weights Card

| State | Display |
|-------|---------|
| No session, no history | "Start your first session" + "Session A" button |
| No session, has history | "Last: Session B, 2 days ago" + "Start A" / "Start B" |
| In progress | Type badge + "In Progress" + tap to continue |
| Completed | Type badge + summary (3/3 done, 945 lbs volume) + tap to edit |

### Weights Session Screen

Each exercise row:
- Exercise name (Squat, Bench Press, etc.)
- Weight: current value with -5 / +5 buttons
- Sets: 5 circles, tap each to toggle filled/empty
- Visual checkmark when sets_completed = 5

Bottom:
- "Save Session" - marks completed, returns to workout screen

---

## Migration Plan

**Version 2 → 3:**

```typescript
// In database.tsx migrateDbIfNeeded()

if (user_version === 2) {
  // Create workout tables
  await db.execAsync(`
    CREATE TABLE boxing_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_boxing_sessions_date ON boxing_sessions(date);

    CREATE TABLE exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      default_weight INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE weight_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      session_type TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_weight_sessions_date ON weight_sessions(date);

    CREATE TABLE weight_exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      weight INTEGER NOT NULL,
      sets_completed INTEGER NOT NULL DEFAULT 0,
      sets_target INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES weight_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
    CREATE INDEX idx_weight_exercise_logs_session ON weight_exercise_logs(session_id);

    -- Add workout_complete to daily_stats
    ALTER TABLE daily_stats ADD COLUMN workout_complete INTEGER DEFAULT 0;
  `);

  // Seed exercises
  await seedDefaultExercises(db);
}
```

---

## Implementation Order

### Phase 1: Database
1. [ ] Add tables to `schema.ts` (CREATE statements + seed data)
2. [ ] Add migration v2→v3 in `database.tsx`
3. [ ] Create `useWorkouts` hook in `db/hooks/useWorkouts.ts`
4. [ ] Export from `db/index.ts`
5. [ ] Update `useDailyStats` to calculate `workout_complete`

### Phase 2: Workout Screen
6. [ ] Create `/app/(tabs)/workout/index.tsx` - main workout screen
7. [ ] Boxing section UI (start/complete/edit states)
8. [ ] Weights section UI (last session info + start buttons)

### Phase 3: Weights Session Screen
9. [ ] Create `/app/(tabs)/workout/weights.tsx` - active weights session
10. [ ] Exercise rows with weight adjustment
11. [ ] Sets completion UI (5 circles)
12. [ ] Save session functionality

### Phase 4: Integration
13. [ ] Update Command Center "Start your workout" to navigate to /workout
14. [ ] Verify streak calculations include workout_complete
15. [ ] Test full flow end-to-end

---

## Future Enhancements (Not MVP)

- Weight progression suggestions (+5 lbs after successful session)
- Deload protocol after repeated failures
- Rest timer between sets
- Boxing round/interval tracking
- Historical charts (volume over time, weight progression per exercise)
- Export workout history
