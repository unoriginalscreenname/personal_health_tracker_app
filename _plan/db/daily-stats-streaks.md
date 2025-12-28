# Daily Stats & Streak Tracking

## Overview

Track daily outcomes to power streak calculations. The app needs to know what day it is and handle day boundaries properly. Streaks are calculated from **finalized days only** (yesterday and before) - today is always in-progress.

---

## Core Concepts

### Day States

| State | Meaning |
|-------|---------|
| No row for date | Day hasn't been accounted for yet |
| Row exists, `finalized=0` | Today - still in progress, stats may change |
| Row exists, `finalized=1`, stats=0 | Past day - failure (explicit) |
| Row exists, `finalized=1`, stats=1 | Past day - success |

### Key Insight

- **Today**: In-progress. Stats are informational but don't count toward streaks.
- **Yesterday and before**: Finalized. These are what streaks are built from.
- **Missing days**: If the app wasn't opened, those days are failures (no data = not compliant).

---

## Schema

### Table: `daily_stats`

```sql
CREATE TABLE daily_stats (
  date TEXT PRIMARY KEY,                -- YYYY-MM-DD
  fasting_compliant INTEGER DEFAULT 0,  -- 1 if all meals within window
  supplements_complete INTEGER DEFAULT 0, -- 1 if all supplements hit criteria
  finalized INTEGER DEFAULT 0,          -- 1 = day is over, stats are locked
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_daily_stats_date ON daily_stats(date);
```

---

## Day Rollover Logic

### Detection: "Is this a new day?"

When the app opens (or Command Center focuses), check if `daily_stats` has a row for today:
- **Row exists for today** → Normal operation, already initialized
- **No row for today** → NEW DAY EVENT, run rollover logic

### New Day Event Flow

```
1. Get today's date (YYYY-MM-DD)
2. Get the most recent row from daily_stats (lastDate)
3. If lastDate exists and is before yesterday:
   - For each missing day between lastDate+1 and yesterday:
     - Insert row with fasting=0, supplements=0, finalized=1
     - (These are failures - no data means not compliant)
4. Finalize yesterday (if yesterday's row exists and not finalized):
   - Calculate fasting compliance from meal_entries
   - Calculate supplements completion from supplement_logs
   - Update yesterday's row with calculated values
   - Set finalized=1
5. Create today's row:
   - Insert with fasting=0, supplements=0, finalized=0
   - (Will be updated throughout the day as user logs data)
```

### Example Timeline

```
Monday: Open app → Create Mon row (finalized=0)
        Use app, log meals and supplements

Tuesday: Open app → NEW DAY
  - Mon row exists, not finalized
  - Calculate Mon's actual stats from data
  - Update Mon: finalized=1
  - Create Tue row (finalized=0)

Wednesday: Don't open app
Thursday: Don't open app

Friday: Open app → NEW DAY
  - Last row is Tue (finalized=1)
  - Gap detected: Wed, Thu missing
  - Create Wed row: fasting=0, supplements=0, finalized=1 (failure)
  - Create Thu row: fasting=0, supplements=0, finalized=1 (failure)
  - Create Fri row: finalized=0
```

---

## Success Criteria

### Fasting Compliance
- **Rule**: All `meal_entries` for the day have `logged_at` between 12:00 and 18:00
- **Edge case**: If no meals logged, day is NOT compliant (can't verify)
- **Calculation**:
```sql
SELECT CASE
  WHEN COUNT(*) = 0 THEN 0  -- no meals = not compliant
  WHEN MIN(CAST(strftime('%H', logged_at) AS INTEGER)) >= 12
   AND MAX(CAST(strftime('%H', logged_at) AS INTEGER)) < 18 THEN 1
  ELSE 0
END as fasting_compliant
FROM meal_entries
WHERE date = ?
```

### Supplements Complete
- **Rule**: All supplements at target value, EXCEPT water only needs 2/4
- **Calculation**:
```sql
SELECT CASE
  WHEN COUNT(*) = 0 THEN 0  -- no supplements defined
  WHEN SUM(CASE
    WHEN s.name = 'Water' THEN (CASE WHEN COALESCE(sl.value, 0) >= 2 THEN 1 ELSE 0 END)
    ELSE (CASE WHEN COALESCE(sl.value, 0) >= s.target THEN 1 ELSE 0 END)
  END) = COUNT(*) THEN 1
  ELSE 0
END as supplements_complete
FROM supplements s
LEFT JOIN supplement_logs sl ON s.id = sl.supplement_id AND sl.date = ?
WHERE s.is_archived = 0
```

---

## Hook: `useDailyStats`

```typescript
interface DailyStats {
  date: string;
  fasting_compliant: boolean;
  supplements_complete: boolean;
  finalized: boolean;
}

export function useDailyStats() {
  const db = useSQLiteContext();

  // Get today's date string
  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Get yesterday's date string
  const getYesterday = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // Check if today's row exists
  const hasTodayRow = async (): Promise<boolean> => {
    const today = getToday();
    const row = await db.getFirstAsync(
      'SELECT 1 FROM daily_stats WHERE date = ?',
      [today]
    );
    return !!row;
  };

  // Initialize a new day - call this on app open / screen focus
  const initializeDay = async (): Promise<void> => {
    const today = getToday();
    const yesterday = getYesterday();

    // Check if today already initialized
    const todayExists = await hasTodayRow();
    if (todayExists) return; // Already done

    // Get most recent row
    const lastRow = await db.getFirstAsync<{ date: string; finalized: number }>(
      'SELECT date, finalized FROM daily_stats ORDER BY date DESC LIMIT 1'
    );

    // Backfill missing days (if any gap between lastRow and yesterday)
    if (lastRow) {
      const lastDate = new Date(lastRow.date);
      const yesterdayDate = new Date(yesterday);

      // Move to day after last row
      lastDate.setDate(lastDate.getDate() + 1);

      while (lastDate <= yesterdayDate) {
        const dateStr = lastDate.toISOString().split('T')[0];

        // Check if this is yesterday (might have data) or an older gap day (no data)
        if (dateStr === yesterday) {
          // Finalize yesterday with actual calculated stats
          await finalizeDate(yesterday);
        } else {
          // Gap day - insert as failure
          await db.runAsync(`
            INSERT OR IGNORE INTO daily_stats
            (date, fasting_compliant, supplements_complete, finalized)
            VALUES (?, 0, 0, 1)
          `, [dateStr]);
        }

        lastDate.setDate(lastDate.getDate() + 1);
      }
    } else if (yesterday) {
      // No previous rows exist, but we should still try to finalize yesterday
      await finalizeDate(yesterday);
    }

    // Create today's row
    await db.runAsync(`
      INSERT OR IGNORE INTO daily_stats
      (date, fasting_compliant, supplements_complete, finalized)
      VALUES (?, 0, 0, 0)
    `, [today]);
  };

  // Calculate and finalize stats for a specific date
  const finalizeDate = async (date: string): Promise<void> => {
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
  };

  // Update today's stats (in-progress, not finalized)
  const updateTodayStats = async (): Promise<void> => {
    const today = getToday();
    const fasting = await calculateFastingCompliance(today);
    const supplements = await calculateSupplementsComplete(today);

    await db.runAsync(`
      UPDATE daily_stats
      SET fasting_compliant = ?, supplements_complete = ?, updated_at = datetime('now')
      WHERE date = ? AND finalized = 0
    `, [fasting ? 1 : 0, supplements ? 1 : 0, today]);
  };

  // Calculate fasting compliance for a date
  const calculateFastingCompliance = async (date: string): Promise<boolean> => {
    const result = await db.getFirstAsync<{ compliant: number }>(`
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        WHEN MIN(CAST(strftime('%H', logged_at) AS INTEGER)) >= 12
         AND MAX(CAST(strftime('%H', logged_at) AS INTEGER)) < 18 THEN 1
        ELSE 0
      END as compliant
      FROM meal_entries
      WHERE date = ?
    `, [date]);
    return result?.compliant === 1;
  };

  // Calculate supplements completion for a date
  const calculateSupplementsComplete = async (date: string): Promise<boolean> => {
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
  };

  // Get streak count for a metric (only counts finalized days)
  const getStreak = async (metric: 'fasting_compliant' | 'supplements_complete'): Promise<number> => {
    const yesterday = getYesterday();

    // Only look at finalized days (yesterday and before)
    const rows = await db.getAllAsync<{ date: string; value: number }>(`
      SELECT date, ${metric} as value
      FROM daily_stats
      WHERE finalized = 1 AND date <= ?
      ORDER BY date DESC
    `, [yesterday]);

    let streak = 0;
    const startDate = new Date(yesterday);

    for (const row of rows) {
      const expectedDate = new Date(startDate);
      expectedDate.setDate(startDate.getDate() - streak);
      const expected = expectedDate.toISOString().split('T')[0];

      if (row.date === expected && row.value === 1) {
        streak++;
      } else {
        break; // streak broken (either failure or gap)
      }
    }

    return streak;
  };

  // Get stats for calendar display
  const getStatsForRange = async (startDate: string, endDate: string): Promise<DailyStats[]> => {
    return db.getAllAsync(`
      SELECT date, fasting_compliant, supplements_complete, finalized
      FROM daily_stats
      WHERE date BETWEEN ? AND ?
      ORDER BY date
    `, [startDate, endDate]);
  };

  // Get today's current (in-progress) stats
  const getTodayStats = async (): Promise<DailyStats | null> => {
    const today = getToday();
    return db.getFirstAsync(`
      SELECT date, fasting_compliant, supplements_complete, finalized
      FROM daily_stats
      WHERE date = ?
    `, [today]);
  };

  return {
    getToday,
    initializeDay,
    updateTodayStats,
    getStreak,
    getStatsForRange,
    getTodayStats,
  };
}
```

---

## Integration Points

### On App Open / Command Center Focus

```typescript
// In CommandCenterScreen
useFocusEffect(
  useCallback(() => {
    const init = async () => {
      await initializeDay(); // Handle day rollover
      // ... load other data
    };
    init();
  }, [])
);
```

### When User Logs Data

```typescript
// In useMealEntries after createEntry/deleteEntry/updateEntryTime
await updateTodayStats();

// In useSupplements after toggleSupplement/incrementSupplement
await updateTodayStats();
```

---

## UI Changes

### Command Center

Add a simple date display above the streak banner:

```typescript
// Tasteful "Today is X" above streak component
<Text style={styles.todayLabel}>
  {new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })}
</Text>

// Example output: "Friday, Dec 27"
```

No other Command Center changes. Streak display remains as-is for now.

---

## Future Additions

When ready to add more metrics:
```sql
ALTER TABLE daily_stats ADD COLUMN protein_hit INTEGER DEFAULT 0;
ALTER TABLE daily_stats ADD COLUMN alcohol_free INTEGER DEFAULT 1;
```

Update criteria:
- **Protein hit**: `SUM(protein * quantity) >= 140` from meal_entry_items
- **Alcohol free**: Default 1, set to 0 if alcohol is logged (needs alcohol tracking)

---

## Implementation Order

1. Add `daily_stats` table to schema.ts (with `finalized` column)
2. Create `useDailyStats` hook with:
   - `initializeDay()` - day rollover logic
   - `updateTodayStats()` - recalculate in-progress stats
   - `getStreak()` - count consecutive finalized successes
3. Call `initializeDay()` from Command Center's `useFocusEffect`
4. Call `updateTodayStats()` from meal/supplement hooks after changes
5. Add "Today is X" label to Command Center
6. (Later) Use stats for calendar view (green/red dots)
