# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisceralCommand is a React Native/Expo Android app for a 30-day metabolic reset protocol. It's a personal "protocol enforcer" focused on: sedentary interruption (movement timers), intermittent fasting (18:6), and high-protein tracking.

## Commands

### Running the App (Smart Startup Protocol)

**IMPORTANT**: Always diagnose first, then act. Don't blindly kill processes.

**Step 1: Check current state (run all 3 in parallel)**
```bash
adb devices                          # Emulator running?
lsof -i:8081 | head -3               # Metro running?
ps aux | grep -E "emulator" | grep -v grep | head -1  # Emulator process?
```

**Step 2: Based on results, do only what's needed**

| Emulator | Port 8081 | Action |
|----------|-----------|--------|
| ✓ device | ✓ occupied | Just run: `adb reverse tcp:8081 tcp:8081` then launch app |
| ✓ device | ✗ free | Run: `adb reverse tcp:8081 tcp:8081 && npx expo start --dev-client` (background), then launch app |
| ✗ none | ✓ occupied | Kill port 8081 PID, start emulator, wait 25s, then full setup |
| ✗ none | ✗ free | Start emulator, wait 25s, then full setup |

**Step 3: Launch app (after Metro is running)**
```bash
adb shell monkey -p com.personal.visceralcommand -c android.intent.category.LAUNCHER 1
```

**Full setup commands (when starting fresh)**
```bash
# Start emulator (wait 25-30s for boot)
$ANDROID_HOME/emulator/emulator -avd "Medium_Phone_API_36.0" &
sleep 25 && adb devices

# Port forwarding + Metro
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client  # Run in background

# Launch app
adb shell monkey -p com.personal.visceralcommand -c android.intent.category.LAUNCHER 1
```

### If App Shows Black/White Screen

**Diagnose first:**
```bash
curl -s localhost:8081 | head -1     # Metro responding?
adb reverse --list                    # Port forwarding active?
```

**Fix based on diagnosis:**
- Metro not responding → Kill specific PID on 8081, restart Expo
- Port forwarding missing → `adb reverse tcp:8081 tcp:8081`
- Both broken → Kill 8081 PID (not pkill), restart Expo, relaunch app

**Nuclear option (only if nothing else works):**
```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
adb kill-server && adb start-server
# Then full setup again
```

### Building from Scratch

```bash
npx expo prebuild --platform android --clean
npx expo run:android
# Or manually: adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Deploy to Physical Phone (USB)

Build a standalone release APK and install on a connected phone:

```bash
# Verify phone is connected (should show device ID, not "unauthorized")
adb devices

# Build release APK (JS bundle embedded, runs without Metro)
cd android && ./gradlew assembleRelease && cd ..

# Install on phone
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

To update the app after code changes, run the build and install commands again.

**Troubleshooting:**
- If phone shows "unauthorized": check phone screen for USB debugging prompt, tap Allow
- If phone not detected: try a different USB cable (must be data cable, not charge-only)
- Set USB mode to "File Transfer" in phone's notification shade

## Architecture

### Tech Stack
- **Expo SDK 54** with Expo Router (file-based navigation)
- **expo-sqlite** for local database with migration system
- **expo-notifications** for local notifications
- **React Native StyleSheet** for styling (NOT NativeWind/Tailwind - causes dependency conflicts)
- **lucide-react-native** for icons
- **React Context** for shared state (e.g., SittingTimerProvider)

### File Structure
```
app/
├── _layout.tsx              # Root layout (DatabaseProvider, SittingTimerProvider)
├── standup.tsx              # Stand-up exercise screen (standalone)
├── add-food.tsx             # Add food to meal entry
├── custom-food.tsx          # Create custom food
├── entry/
│   └── [id].tsx             # Meal entry detail/edit screen
├── (tabs)/
│   ├── _layout.tsx          # Tab navigator (Command, Fuel, Workout, Stats)
│   ├── index.tsx            # Command Center home screen
│   ├── history.tsx          # Calendar/history view
│   ├── nutrition/
│   │   ├── _layout.tsx      # Stack navigator
│   │   ├── index.tsx        # Food timeline + daily totals
│   │   └── settings.tsx     # Nutrition settings
│   ├── stats/
│   │   ├── _layout.tsx      # Stack navigator
│   │   ├── index.tsx        # Stats history list
│   │   └── [date].tsx       # Single day detail
│   └── workout/
│       ├── _layout.tsx      # Stack navigator
│       ├── index.tsx        # Workout type selection
│       ├── boxing.tsx       # Boxing session
│       └── weights.tsx      # 5x5 weight training

components/
└── app/                     # App-specific components (self-contained with date prop)
    ├── FastingCard.tsx      # Fasting status display
    ├── FoodForm.tsx         # Reusable food entry form
    ├── FoodTimeline.tsx     # Meal entries timeline
    ├── NutritionCard.tsx    # Daily nutrition summary
    ├── SittingModeCard.tsx  # Sit/stand timer control
    ├── StreakBanner.tsx     # Streak display
    ├── SupplementsCard.tsx  # Supplement checklist
    └── WorkoutCard.tsx      # Workout status

constants/
└── theme.ts                 # Colors, spacing, typography constants

db/
├── database.tsx             # DatabaseProvider, migrations
├── schema.ts                # Table definitions, seed data
├── index.ts                 # Exports all hooks
└── hooks/
    ├── useDailyStats.ts     # Streak calculations, day initialization
    ├── useFoods.ts          # Food CRUD operations
    ├── useMealEntries.ts    # Meal entry + items
    ├── useSittingSessions.ts # Sit/stand session logging
    ├── useSupplements.ts    # Supplement tracking
    └── useWorkouts.ts       # Boxing + weight sessions

hooks/
├── useFastingState.ts       # Fasting window calculations
└── useSittingTimer.tsx      # Timer state machine + Context provider
```

### Database Schema (v5)
- `foods` - Master food list
- `meal_entries` + `meal_entry_items` - Food logging
- `supplements` + `supplement_logs` - Supplement tracking
- `daily_stats` - Daily completion flags for streaks
- `boxing_sessions` - Timed boxing workouts
- `exercises` + `weight_sessions` + `weight_exercise_logs` - 5x5 program
- `sitting_sessions` - Completed sit/stand cycles

### Styling Approach

Use the theme constants from `constants/theme.ts`:
```typescript
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
```

**Do NOT** use NativeWind, Tailwind, or Gluestack UI - they cause severe dependency conflicts.

## Design Guidelines

Reference `/Users/ericmcgregor/Documents/PROJECTS/mobile/design-brief.md` for full details.

### Key Principles
- **Information density**: Vertical space is precious. No decorative headers.
- **Thin typography**: Use `fontWeight: '200'` for large numbers
- **Icons without backgrounds**: No colored circles around icons (except action buttons)
- **Meaningful color**: Orange=streaks, Blue=fasting, Green=protein/eating, Purple=supplements
- **Subtle borders**: Thin colored borders on cards (`borderColor: colors.accent.X + '30'`)
- **Press feedback**: `opacity: 0.7` + `transform: [{ scale: 0.98 }]`

### What to Avoid
- Redundant labels (icon + time doesn't need "Fasting" spelled out)
- Heavy backgrounds around icons
- Large headers with subtitles
- Percentage displays when progress bar shows it
- Anything that feels like a "wellness app"

## Session Notes

At the end of significant work sessions, create a notes file in `_plan/session/`:
- **Filename**: `YYYYMMDD_HHMM_notes.md` - use actual current time (verify with `date` command)
- **Structure**: Summary (1 line), What Was Done (grouped bullets), Commits (with IDs), Notes (gotchas)
- **Length**: Keep it short and high-level, ~30-50 lines max
- **Commits**: Always include commit hashes from the session (run `git log --oneline -5`)
- **Style**: Follow the pattern in existing `_plan/session/` files

## Starting Each Session

At the start of each session, **always** begin by reading the following files.

- `_plan/page-component-structure.md` - Component organization rules (READ THIS)
- `_plan/design-brief.md` - UI/UX design principles
- `_plan/react-native-best-practices.md` - React Native patterns, date handling, hooks
- The last three notes files from the last three sessions located in this directory: `_plan/session`