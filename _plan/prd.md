# Product Requirements Document (PRD): VisceralCommand

> Trying to track a complex metabolic reset in your head or on a piece of paper usually fails because of cognitive load. By offloading the "remembering" to the app, you just have to focus on the "doing."

---

## 1. Executive Summary

**App Name:** VisceralCommand
**Platform:** Android (Local Build via APK)
**Goal:** A strictly personal "protocol enforcer" designed to manage a 30-day metabolic reset. The app focuses on three pillars: Sedentary interruption, Intermittent Fasting timing, and High-Protein tracking.

---

## 2. Tech Stack (Updated with 2025 Best Practices)

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React Native + Expo SDK 54 | Latest stable Expo |
| Navigation | Expo Router (file-based) | Replaces React Navigation |
| UI Library | Gluestack UI v2 (NativeWind) | Tailwind-based styling with `className` |
| State Management | Zustand with persist middleware | Lightweight, TypeScript-friendly |
| Local Storage | expo-sqlite/kv-store | Replaces AsyncStorage (faster, built-in) |
| Notifications | expo-notifications | Local scheduled notifications |
| Date/Time | date-fns | Fasting window calculations |
| Icons | @expo/vector-icons (MaterialIcons) | Built into Expo |

---

## 3. Core Functional Requirements

### A. The "Sedentary Killer" (Movement Snack Timer)

**Logic:** Toggle "Sitting Mode" to start/pause a 60-minute countdown.

**Behavior:**
- When "Sitting Mode" is ON → 60-minute countdown begins
- At T-minus 0 → High-priority notification: *"Movement Snack Due"*
- User presses "I did my reps" → Timer resets to 60 minutes
- If "Sitting Mode" is toggled OFF → Timer pauses/resets
- Timer state persists across app restarts (Zustand + persist)

### B. The Fasting Engine (18:6 Protocol)

**Logic:** Fixed window tracking (18 hours fast / 6 hours eat).

**Default Schedule:**
- Fasting: 6:00 PM – 12:00 PM (Next Day)
- Eating: 12:00 PM – 6:00 PM

**Visuals:**
- Progress ring/bar showing remaining time in current window
- **Fasting State:** Blue/Cool theme. Text: "Liver Detoxing"
- **Eating State:** Green/Active theme. Text: "Feast Window Open"

**Notifications (via expo-notifications):**
- 12:00 PM → "Break Fast - Miso/Protein"
- 5:30 PM → "30 mins to Window Close"

### C. The "Protein Project" (Nutrition Tracker)

**Constraint:** Manual "Slot" tracker (no food database).

**UI Structure:** 3 distinct "Meal Slot" cards:
1. **The Opener (12 PM):** Miso Soup (Checkbox) + Protein (numeric input in grams)
2. **The Bridge (3 PM):** Protein Shake/Isolate (numeric input in grams)
3. **The Closer (6 PM):** Dinner Protein (numeric input in grams)

**The Metric:**
- Large "Daily Protein Total" progress bar at top
- Target = 160g
- Bar turns green when ≥140g (visual success feedback)

### D. The Iron (Gym Tracker)

**Workouts:** Selector for day's routine (Upper/Lower split):
- Options: *Upper A, Lower A, Upper B, Lower B, Rest*

**Input:** List of exercises for selected workout:
- Fields: Exercise Name | Weight | Reps (3 Sets)
- Hardcoded exercise templates per workout type

**Supplements Module:** Daily Stack checklist (resets at midnight):
- [ ] Creatine (5g)
- [ ] Magnesium
- [ ] NAC/Liver Support
- [ ] Water Counter (0/4 liters)

### E. Data & Progress (Home Screen Focus)

**Dashboard Requirements:**
- Current streaks: Days without Alcohol, Days hitting Protein target
- Daily activity summary showing success per day adding up over time
- Visual calendar with: Green dot = Perfect day, Red dot = Missed targets

**Persistence:**
- All daily logs saved via Zustand persist → expo-sqlite/kv-store
- Data structure keyed by date (YYYY-MM-DD)

---

## 4. Screen Architecture (Expo Router)

```
app/
├── _layout.tsx              # Root layout (GluestackUIProvider, theme)
├── (tabs)/
│   ├── _layout.tsx          # Tab navigator with 4 tabs
│   ├── index.tsx            # Screen 1: Command Center (Home)
│   ├── nutrition.tsx        # Screen 2: Fuel Tank
│   ├── workout.tsx          # Screen 3: Armory
│   └── history.tsx          # Screen 4: The Log
```

### Screen 1: Command Center (Home) - `index.tsx`
- **Top:** Fasting Status (countdown + progress ring)
- **Middle:** "Sitting Mode" toggle + timer display
- **Bottom:** Daily Stack checklists + streak counters
- **Key Insight:** Show daily activity/success accumulating over time

### Screen 2: Fuel Tank (Nutrition) - `nutrition.tsx`
- Conditional UI based on eating window (show/dim based on fasting state)
- 3 Meal Slot cards (Opener, Bridge, Closer)
- Large protein total with progress bar

### Screen 3: Armory (Workout) - `workout.tsx`
- Workout type selector (dropdown/segmented)
- Exercise list with weight/rep inputs
- Save Workout button

### Screen 4: The Log (History) - `history.tsx`
- Calendar view with colored dots
- Tap day → show detail modal
- Simple protein vs goal visualization

---

## 5. UI/UX Guidelines (Gluestack UI v2)

**Theme:** Dark mode by default (reduces eye strain)

**Gluestack Components to Use:**
| Component | Usage |
|-----------|-------|
| `Box`, `VStack`, `HStack` | Layout structure |
| `Card` | Meal slots, workout sections |
| `Progress`, `ProgressFilledTrack` | Fasting timer, protein goal |
| `Switch` | Sitting Mode toggle |
| `Button`, `ButtonText` | Actions |
| `Input`, `InputField` | Protein/weight inputs |
| `Checkbox` | Supplements, miso soup |
| `Fab` | Quick logging (optional) |
| `Toast` | Success messages |
| `Heading`, `Text` | Typography |

**Styling Approach:**
- Use `className` with Tailwind classes (NativeWind)
- Dark mode via `dark:` prefix classes
- Conditional colors: `bg-blue-900` (fasting) vs `bg-green-800` (eating)

---

## 6. State Management (Zustand)

### Store Structure

```typescript
// stores/appStore.ts
interface AppState {
  // Sitting Mode
  sittingMode: boolean;
  sittingTimerEnd: number | null; // timestamp when timer expires

  // Fasting (computed from current time + schedule)
  fastingSchedule: { fastStart: number; fastEnd: number }; // hours (18, 12)

  // Actions
  toggleSittingMode: () => void;
  resetSittingTimer: () => void;
}

// stores/dailyStore.ts
interface DailyLog {
  date: string; // YYYY-MM-DD
  protein: { opener: number; bridge: number; closer: number };
  miso: boolean;
  workout: string | null;
  supplements: { creatine: boolean; magnesium: boolean; nac: boolean; water: number };
  movementSnacks: number; // count of completed reps
}

interface DailyState {
  logs: Record<string, DailyLog>;
  streaks: { alcoholFree: number; proteinTarget: number };
  // Actions
  updateTodayLog: (updates: Partial<DailyLog>) => void;
  getTodayLog: () => DailyLog;
}
```

---

## 7. Implementation Phases

### Phase 1: Project Setup & Navigation
- [ ] Create Expo project with TypeScript
- [ ] Install dependencies (gluestack-ui, zustand, expo-notifications, date-fns)
- [ ] Configure Expo Router with 4 tabs
- [ ] Set up GluestackUIProvider with dark theme
- [ ] Create basic screen shells

### Phase 2: Home Screen (Command Center)
- [ ] Implement fasting status display (progress ring, state colors)
- [ ] Build sitting mode toggle + timer logic
- [ ] Add daily stack checkboxes
- [ ] Display streak counters
- [ ] Show daily activity accumulation

### Phase 3: State Management & Persistence
- [ ] Create Zustand stores (appStore, dailyStore)
- [ ] Configure persist middleware with expo-sqlite/kv-store
- [ ] Implement date-based log retrieval
- [ ] Add streak calculation logic

### Phase 4: Notifications
- [ ] Set up expo-notifications permissions
- [ ] Implement movement snack timer notification
- [ ] Schedule fasting window notifications (12 PM, 5:30 PM)
- [ ] Handle notification responses

### Phase 5: Nutrition Screen
- [ ] Build 3 meal slot cards
- [ ] Implement protein input fields
- [ ] Add miso checkbox
- [ ] Create protein total progress bar
- [ ] Connect to daily store

### Phase 6: Workout Screen
- [ ] Create workout type selector
- [ ] Build exercise list with inputs
- [ ] Implement save functionality
- [ ] Add supplements checklist

### Phase 7: History Screen
- [ ] Build calendar component
- [ ] Implement day status indicators (green/red dots)
- [ ] Add day detail view/modal
- [ ] Create simple progress visualization

### Phase 8: Polish & Testing
- [ ] Test on Android device
- [ ] Refine animations/transitions
- [ ] Build APK for local installation
- [ ] Final bug fixes

---

## 8. Key Technical Notes

1. **Timer Persistence:** Store `sittingTimerEnd` as a timestamp, not remaining seconds. On app resume, calculate remaining time from current time.

2. **Fasting Calculation:** Use `date-fns` to determine current window state based on time of day. No need to store fasting state—it's always computed.

3. **Daily Reset:** Logs are keyed by date string. On app load, check if today's log exists; if not, create with defaults.

4. **Notification Scheduling:** Schedule recurring notifications at fixed times (12 PM, 5:30 PM). Movement snack notification is scheduled dynamically when timer starts.

5. **Offline-First:** All data is local. No network requests. App works completely offline.

---

## 9. Success Criteria

- [ ] Sitting mode timer works across app restarts
- [ ] Fasting status accurately reflects 18:6 schedule
- [ ] Protein tracking persists and shows correct totals
- [ ] Notifications fire at correct times
- [ ] History view shows accurate daily status
- [ ] Dark theme is consistent throughout
- [ ] APK installs and runs on Android device
