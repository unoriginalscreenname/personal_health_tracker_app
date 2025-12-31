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
- **React Native StyleSheet** for styling (NOT NativeWind/Tailwind - causes dependency conflicts)
- **Zustand** for state management (not yet implemented)
- **lucide-react-native** for icons

### File Structure
```
app/
├── _layout.tsx           # Root layout with StatusBar
├── (tabs)/
│   ├── _layout.tsx       # Tab navigator (Command, Fuel, Armory, Log)
│   ├── index.tsx         # Command Center home screen
│   ├── nutrition/        # Nested stack navigation
│   │   ├── _layout.tsx   # Stack for nutrition screens
│   │   ├── index.tsx     # Meal zones grid + food timeline
│   │   └── [meal].tsx    # Dynamic meal detail page
│   ├── workout.tsx       # Workout tracking
│   └── history.tsx       # History/calendar view
constants/
└── theme.ts              # Colors, spacing, typography constants
```

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

## Key Files

- `_plan/page-component-structure.md` - Component organization rules (READ THIS)
- `_plan/design-brief.md` - UI/UX design principles
- `_plan/prd.md` - Full product requirements
- `_plan/react-native-android-setup.md` - Detailed setup/troubleshooting guide
