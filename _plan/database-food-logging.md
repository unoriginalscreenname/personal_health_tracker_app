# Database & Food Logging Implementation Plan

## Overview

This plan covers the SQLite database setup and food logging feature for VisceralCommand. The database will persist food items and daily meal logs using expo-sqlite with React Context.

---

## Schema Design

### Table: `foods`
Master list of available foods (seeded defaults + user-added).

```sql
CREATE TABLE foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  protein INTEGER NOT NULL DEFAULT 0,
  calories INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,  -- 1 = seeded, 0 = user-added
  is_archived INTEGER NOT NULL DEFAULT 0, -- soft delete
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Table: `meal_entries`
A logical grouping of foods eaten together. Each entry represents one "meal" or "snack" event.

```sql
CREATE TABLE meal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                      -- YYYY-MM-DD for querying by day
  logged_at TEXT NOT NULL,                 -- ISO timestamp when first created
  meal_type TEXT,                          -- 'opener' | 'bridge' | 'closer' | null
  note TEXT                                -- optional user note
);

CREATE INDEX idx_meal_entries_date ON meal_entries(date);
```

### Table: `meal_entry_items`
Individual food items within a meal entry. Links to `foods` table but denormalizes name/macros for historical accuracy.

```sql
CREATE TABLE meal_entry_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_entry_id INTEGER NOT NULL,
  food_id INTEGER,                         -- nullable (custom one-off entry)
  name TEXT NOT NULL,                      -- denormalized from food
  protein INTEGER NOT NULL DEFAULT 0,
  calories INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 1,        -- multiplier (0.5, 1, 2, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (meal_entry_id) REFERENCES meal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
);

CREATE INDEX idx_meal_entry_items_entry ON meal_entry_items(meal_entry_id);
```

### Why Denormalize?
- If user edits a food's macros later, historical logs stay accurate
- If user deletes a food, the log entry remains intact
- Faster queries (no joins needed for display)

---

## Seed Data

Default foods to insert on first run:

```typescript
const DEFAULT_FOODS = [
  { name: 'Chicken Breast', protein: 31, calories: 165 },
  { name: 'Greek Yogurt', protein: 17, calories: 100 },
  { name: 'Eggs (2)', protein: 12, calories: 140 },
  { name: 'Salmon Fillet', protein: 25, calories: 208 },
  { name: 'Protein Shake', protein: 25, calories: 120 },
  { name: 'Cottage Cheese', protein: 14, calories: 98 },
  { name: 'Turkey Slices', protein: 18, calories: 70 },
  { name: 'Tuna Can', protein: 20, calories: 90 },
];
```

---

## File Structure

```
db/
├── database.ts          # SQLiteProvider setup, migrations
├── schema.ts            # Table creation SQL, seed data
├── hooks/
│   ├── useFoods.ts      # CRUD for foods table
│   └── useMealEntries.ts # CRUD for meal entries + items
```

---

## Implementation Details

### 1. Database Provider (`db/database.ts`)

Wrap app in SQLiteProvider with migration handler:

```typescript
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SQLiteProvider databaseName="visceral.db" onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;
  const { user_version } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );

  if (user_version >= DATABASE_VERSION) return;

  if (user_version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      -- Create tables here
    `);
    // Seed default foods
    await seedDefaultFoods(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```

### 2. Foods Hook (`db/hooks/useFoods.ts`)

```typescript
interface Food {
  id: number;
  name: string;
  protein: number;
  calories: number;
  is_default: boolean;
}

export function useFoods() {
  const db = useSQLiteContext();

  // Get all active foods
  const getFoods = async (): Promise<Food[]> => {
    return db.getAllAsync('SELECT * FROM foods WHERE is_archived = 0 ORDER BY name');
  };

  // Add new food
  const addFood = async (food: Omit<Food, 'id' | 'is_default'>) => { ... };

  // Update food
  const updateFood = async (id: number, updates: Partial<Food>) => { ... };

  // Archive food (soft delete)
  const archiveFood = async (id: number) => { ... };

  return { getFoods, addFood, updateFood, archiveFood };
}
```

### 3. Meal Entries Hook (`db/hooks/useMealEntries.ts`)

```typescript
interface MealEntry {
  id: number;
  date: string;
  logged_at: string;
  meal_type: string | null;
  items: MealEntryItem[];
}

interface MealEntryItem {
  id: number;
  name: string;
  protein: number;
  calories: number;
  quantity: number;
}

export function useMealEntries() {
  const db = useSQLiteContext();

  // Get entries for a specific date
  const getEntriesForDate = async (date: string): Promise<MealEntry[]> => { ... };

  // Get today's totals
  const getTodayTotals = async () => {
    const today = new Date().toISOString().split('T')[0];
    return db.getFirstAsync(`
      SELECT
        COALESCE(SUM(protein * quantity), 0) as protein,
        COALESCE(SUM(calories * quantity), 0) as calories
      FROM meal_entry_items mei
      JOIN meal_entries me ON mei.meal_entry_id = me.id
      WHERE me.date = ?
    `, [today]);
  };

  // Create new meal entry
  const createEntry = async (mealType?: string): Promise<number> => {
    const now = new Date();
    const result = await db.runAsync(
      'INSERT INTO meal_entries (date, logged_at, meal_type) VALUES (?, ?, ?)',
      [now.toISOString().split('T')[0], now.toISOString(), mealType || null]
    );
    return result.lastInsertRowId;
  };

  // Add item to entry
  const addItemToEntry = async (entryId: number, food: Food, quantity = 1) => {
    await db.runAsync(
      `INSERT INTO meal_entry_items
       (meal_entry_id, food_id, name, protein, calories, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entryId, food.id, food.name, food.protein, food.calories, quantity]
    );
  };

  // Remove item from entry
  const removeItem = async (itemId: number) => { ... };

  // Delete entire entry
  const deleteEntry = async (entryId: number) => { ... };

  return { getEntriesForDate, getTodayTotals, createEntry, addItemToEntry, ... };
}
```

---

## UI Integration

### Root Layout Update
Wrap app with DatabaseProvider:

```typescript
// app/_layout.tsx
export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack>...</Stack>
    </DatabaseProvider>
  );
}
```

### Nutrition Index Screen
Replace mock data:

```typescript
export default function NutritionScreen() {
  const { getTodayTotals, getEntriesForDate } = useMealEntries();
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });
  const [entries, setEntries] = useState<MealEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [t, e] = await Promise.all([
      getTodayTotals(),
      getEntriesForDate(today)
    ]);
    setTotals(t);
    setEntries(e);
  };

  // ... render with real data
}
```

### Meal Detail Screen
Replace mock commonFoods, implement add functionality:

```typescript
export default function MealDetailScreen() {
  const { meal } = useLocalSearchParams();
  const { getFoods } = useFoods();
  const { createEntry, addItemToEntry } = useMealEntries();
  const [foods, setFoods] = useState<Food[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);

  // Load foods from DB
  useEffect(() => {
    getFoods().then(setFoods);
  }, []);

  const handleAddFood = async (food: Food) => {
    let entryId = currentEntryId;
    if (!entryId) {
      entryId = await createEntry(meal);
      setCurrentEntryId(entryId);
    }
    await addItemToEntry(entryId, food);
    // Refresh/navigate back
  };
}
```

---

## Migration Strategy

Using SQLite's `PRAGMA user_version` for versioning:

```typescript
// Version 1: Initial schema
// Version 2: (future) Add supplements table
// Version 3: (future) Add workout logs

async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const { user_version } = await db.getFirstAsync('PRAGMA user_version');

  if (user_version === 0) {
    // Create all v1 tables
    // Seed default data
  }

  // if (user_version === 1) {
  //   // v1 -> v2 migration
  // }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
```

---

## Implementation Order

1. **Create db/ folder structure**
2. **Implement database.ts** - Provider + migrations
3. **Implement schema.ts** - SQL strings + seed data
4. **Implement useFoods.ts** - Basic CRUD
5. **Implement useMealEntries.ts** - Entry + item management
6. **Update _layout.tsx** - Wrap with DatabaseProvider
7. **Update [meal].tsx** - Real food list + add functionality
8. **Update nutrition/index.tsx** - Real totals + timeline

---

## Testing Checklist

- [ ] App starts without DB errors
- [ ] Default foods appear in meal detail screen
- [ ] Adding food creates meal entry
- [ ] Adding second food to same session appends to entry
- [ ] Timeline shows grouped entries correctly
- [ ] Daily totals calculate correctly
- [ ] Data persists across app restart
