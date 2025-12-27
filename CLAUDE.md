# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisceralCommand is a React Native/Expo Android app for a 30-day metabolic reset protocol. It's a personal "protocol enforcer" focused on: sedentary interruption (movement timers), intermittent fasting (18:6), and high-protein tracking.

## Commands

### Running the App

```bash
# Start emulator (wait 20-30s for boot)
$ANDROID_HOME/emulator/emulator -avd "Medium_Phone_API_36.0" &

# Verify emulator connected
adb devices

# Set up port forwarding (required)
adb reverse tcp:8081 tcp:8081

# Start Metro bundler
npx expo start --dev-client

# Launch app (if needed)
adb shell monkey -p com.personal.visceralcommand -c android.intent.category.LAUNCHER 1
```

### If App Won't Load (White Screen)

```bash
# Kill stuck processes
pkill -f "expo"; pkill -f "metro"; lsof -ti:8081 | xargs kill -9

# Restart ADB
adb kill-server && adb start-server

# Then run setup again
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client
```

### Building from Scratch

```bash
npx expo prebuild --platform android --clean
npx expo run:android
# Or manually: adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

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

## Key Files

- `prd.md` - Full product requirements
- `design-brief.md` - UI/UX design principles
- `react-native-android-setup.md` - Detailed setup/troubleshooting guide
