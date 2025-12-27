import type { SQLiteDatabase } from 'expo-sqlite';

// Schema version - increment when making changes
export const DATABASE_VERSION = 1;

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
  { name: 'Vitamin D', target: 1, dosage: null, sort_order: 3 },
  { name: 'Water', target: 4, dosage: 'liters', sort_order: 4 },
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
