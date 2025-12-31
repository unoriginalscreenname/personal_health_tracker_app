import type { SQLiteDatabase } from 'expo-sqlite';

// Schema version - increment when making changes
export const DATABASE_VERSION = 5;

// SQL statements for creating tables
export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Foods: master list of available foods
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    protein INTEGER NOT NULL DEFAULT 0,
    calories INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Meal entries: a logical grouping of foods eaten together
  CREATE TABLE IF NOT EXISTS meal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    meal_type TEXT,
    note TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_meal_entries_date ON meal_entries(date);

  -- Meal entry items: individual foods within a meal entry
  CREATE TABLE IF NOT EXISTS meal_entry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_entry_id INTEGER NOT NULL,
    food_id INTEGER,
    name TEXT NOT NULL,
    protein INTEGER NOT NULL DEFAULT 0,
    calories INTEGER NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (meal_entry_id) REFERENCES meal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_meal_entry_items_entry ON meal_entry_items(meal_entry_id);

  -- Supplements: master list of supplements/water to track
  CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target INTEGER NOT NULL DEFAULT 1,
    dosage TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Supplement logs: daily tracking (one row per supplement per day)
  CREATE TABLE IF NOT EXISTS supplement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    UNIQUE(supplement_id, date),
    FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_supplement_logs_date ON supplement_logs(date);

  -- Daily stats: track daily outcomes for streak calculations
  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    fasting_compliant INTEGER NOT NULL DEFAULT 0,
    supplements_complete INTEGER NOT NULL DEFAULT 0,
    workout_complete INTEGER NOT NULL DEFAULT 0,
    finalized INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

  -- Boxing sessions: simple time-based workouts
  CREATE TABLE IF NOT EXISTS boxing_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_boxing_sessions_date ON boxing_sessions(date);

  -- Exercises: master list of 5x5 exercises
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    default_weight INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  -- Weight sessions: 5x5 training sessions
  CREATE TABLE IF NOT EXISTS weight_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    session_type TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_weight_sessions_date ON weight_sessions(date);

  -- Weight exercise logs: exercises within a weight session
  CREATE TABLE IF NOT EXISTS weight_exercise_logs (
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
  CREATE INDEX IF NOT EXISTS idx_weight_exercise_logs_session ON weight_exercise_logs(session_id);

  -- Sitting sessions: completed sit/stand cycles
  CREATE TABLE IF NOT EXISTS sitting_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    sit_duration_minutes INTEGER NOT NULL,
    exercises_completed TEXT,
    completed_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sitting_sessions_date ON sitting_sessions(date);
`;

// SQL for adding daily_stats table (v1 -> v2 migration)
export const ADD_DAILY_STATS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    fasting_compliant INTEGER NOT NULL DEFAULT 0,
    supplements_complete INTEGER NOT NULL DEFAULT 0,
    finalized INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
`;

// SQL for adding workout tables (v2 -> v3 migration)
export const ADD_WORKOUT_TABLES_SQL = `
  -- Add workout_complete column to daily_stats
  ALTER TABLE daily_stats ADD COLUMN workout_complete INTEGER NOT NULL DEFAULT 0;

  -- Boxing sessions
  CREATE TABLE IF NOT EXISTS boxing_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_boxing_sessions_date ON boxing_sessions(date);

  -- Exercises master list
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    default_weight INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  -- Weight sessions
  CREATE TABLE IF NOT EXISTS weight_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    session_type TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_weight_sessions_date ON weight_sessions(date);

  -- Weight exercise logs
  CREATE TABLE IF NOT EXISTS weight_exercise_logs (
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
  CREATE INDEX IF NOT EXISTS idx_weight_exercise_logs_session ON weight_exercise_logs(session_id);
`;

// SQL for adding sitting_sessions table (v3 -> v4 migration)
export const ADD_SITTING_SESSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sitting_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    sit_duration_minutes INTEGER NOT NULL,
    exercises_completed TEXT,
    completed_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sitting_sessions_date ON sitting_sessions(date);
`;

// Default foods to seed
export const DEFAULT_FOODS = [
  { name: 'Chicken Breast', protein: 31, calories: 165 },
  { name: 'Greek Yogurt', protein: 17, calories: 100 },
  { name: 'Eggs (2)', protein: 12, calories: 140 },
  { name: 'Salmon Fillet', protein: 25, calories: 208 },
  { name: 'Protein Shake', protein: 25, calories: 120 },
  { name: 'Cottage Cheese', protein: 14, calories: 98 },
  { name: 'Turkey Slices', protein: 18, calories: 70 },
  { name: 'Tuna Can', protein: 20, calories: 90 },
];

// Default supplements to seed
export const DEFAULT_SUPPLEMENTS = [
  { name: 'Creatine', target: 1, dosage: '5g', sort_order: 0 },
  { name: 'Magnesium', target: 1, dosage: null, sort_order: 1 },
  { name: 'Omega-3', target: 1, dosage: null, sort_order: 2 },
  { name: 'NAC', target: 1, dosage: null, sort_order: 3 },
  { name: 'Water', target: 4, dosage: 'liters', sort_order: 4 },
];

// Default exercises for 5x5 program
export const DEFAULT_EXERCISES = [
  { name: 'squat', display_name: 'Squat', default_weight: 95, sort_order: 0 },
  { name: 'bench', display_name: 'Bench Press', default_weight: 95, sort_order: 1 },
  { name: 'row', display_name: 'Barbell Row', default_weight: 95, sort_order: 2 },
  { name: 'overhead', display_name: 'Overhead Press', default_weight: 65, sort_order: 3 },
  { name: 'deadlift', display_name: 'Deadlift', default_weight: 115, sort_order: 4 },
];

// Seed functions
export async function seedDefaultFoods(db: SQLiteDatabase) {
  for (const food of DEFAULT_FOODS) {
    await db.runAsync(
      'INSERT INTO foods (name, protein, calories, is_default) VALUES (?, ?, ?, 1)',
      [food.name, food.protein, food.calories]
    );
  }
}

export async function seedDefaultSupplements(db: SQLiteDatabase) {
  for (const supp of DEFAULT_SUPPLEMENTS) {
    await db.runAsync(
      'INSERT INTO supplements (name, target, dosage, is_default, sort_order) VALUES (?, ?, ?, 1, ?)',
      [supp.name, supp.target, supp.dosage, supp.sort_order]
    );
  }
}

export async function seedDefaultExercises(db: SQLiteDatabase) {
  for (const exercise of DEFAULT_EXERCISES) {
    await db.runAsync(
      'INSERT INTO exercises (name, display_name, default_weight, sort_order) VALUES (?, ?, ?, ?)',
      [exercise.name, exercise.display_name, exercise.default_weight, exercise.sort_order]
    );
  }
}
