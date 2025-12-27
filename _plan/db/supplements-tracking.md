# Supplements Tracking Plan

## Overview

Track daily supplement/water intake by day. Each item has a target (1 for pills, 4 for water). Value of 0 = not taken. Will power streak calculations.

---

## Schema Design

### Table: `supplements`
Master list of things to track daily.

```sql
CREATE TABLE supplements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,       -- units needed (1 for pills, 4 for water)
  dosage TEXT,                             -- display label: "5g", "500mg", "liters"
  is_default INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Table: `supplement_logs`
One row per supplement per day. Value = units taken.

```sql
CREATE TABLE supplement_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplement_id INTEGER NOT NULL,
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  value INTEGER NOT NULL DEFAULT 0,        -- 0 = none, up to target
  UNIQUE(supplement_id, date),
  FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE
);

CREATE INDEX idx_supplement_logs_date ON supplement_logs(date);
```

---

## Seed Data

```typescript
const DEFAULT_SUPPLEMENTS = [
  { name: 'Creatine', target: 1, dosage: '5g', sort_order: 0 },
  { name: 'Magnesium', target: 1, dosage: null, sort_order: 1 },
  { name: 'Omega-3', target: 1, dosage: null, sort_order: 2 },
  { name: 'Vitamin D', target: 1, dosage: null, sort_order: 3 },
  { name: 'Water', target: 4, dosage: 'liters', sort_order: 4 },
];
```

---

## Hook: `useSupplements`

```typescript
interface Supplement {
  id: number;
  name: string;
  target: number;
  dosage: string | null;
  value: number;  // current day's value
}

export function useSupplements() {
  const db = useSQLiteContext();

  // Get all supplements with today's value
  const getSupplementsForDate = async (date: string): Promise<Supplement[]> => {
    return db.getAllAsync(`
      SELECT s.*, COALESCE(sl.value, 0) as value
      FROM supplements s
      LEFT JOIN supplement_logs sl ON s.id = sl.supplement_id AND sl.date = ?
      WHERE s.is_archived = 0
      ORDER BY s.sort_order
    `, [date]);
  };

  // Toggle for target=1 items (pills)
  const toggleSupplement = async (supplementId: number, date: string) => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, 1)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = CASE WHEN value = 0 THEN 1 ELSE 0 END
    `, [supplementId, date]);
  };

  // Increment for target>1 items (water)
  const incrementSupplement = async (supplementId: number, date: string, target: number) => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, 1)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = MIN(value + 1, ?)
    `, [supplementId, date, target]);
  };

  // Set specific value
  const setSupplementValue = async (supplementId: number, date: string, value: number) => {
    await db.runAsync(`
      INSERT INTO supplement_logs (supplement_id, date, value)
      VALUES (?, ?, ?)
      ON CONFLICT(supplement_id, date)
      DO UPDATE SET value = ?
    `, [supplementId, date, value, value]);
  };

  return { getSupplementsForDate, toggleSupplement, incrementSupplement, setSupplementValue };
}
```

---

## Streak Calculation

A "perfect day" = all supplements at their target value.

```typescript
const getSupplementStreak = async (): Promise<number> => {
  const result = await db.getAllAsync(`
    WITH daily_status AS (
      SELECT sl.date
      FROM supplement_logs sl
      JOIN supplements s ON sl.supplement_id = s.id
      WHERE s.is_archived = 0
      GROUP BY sl.date
      HAVING SUM(CASE WHEN sl.value >= s.target THEN 1 ELSE 0 END) = COUNT(*)
      ORDER BY sl.date DESC
    )
    SELECT date FROM daily_status
  `);

  let streak = 0;
  const today = new Date();

  for (const row of result) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - streak);
    const expected = expectedDate.toISOString().split('T')[0];

    if (row.date === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};
```

---

## UI Integration

```typescript
const { getSupplementsForDate, toggleSupplement, incrementSupplement } = useSupplements();
const [supplements, setSupplements] = useState<Supplement[]>([]);
const today = new Date().toISOString().split('T')[0];

useEffect(() => {
  getSupplementsForDate(today).then(setSupplements);
}, []);

const handlePress = async (supp: Supplement) => {
  if (supp.target === 1) {
    await toggleSupplement(supp.id, today);
  } else {
    await incrementSupplement(supp.id, today, supp.target);
  }
  setSupplements(await getSupplementsForDate(today));
};
```

UI renders based on target:
- `target === 1`: Checkbox style (taken/not taken)
- `target > 1`: Counter style (0/4, 1/4, etc.)

---

## Implementation Order

1. Add tables to schema.ts (with food tables)
2. Add seed data
3. Implement useSupplements hook
4. Update Command Center UI
5. Add streak calculation (defer to history screen)
