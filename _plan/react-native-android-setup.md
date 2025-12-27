# React Native / Expo Android Setup Guide

A practical guide for getting a React Native app running on Android emulator. Based on hard-won experience with Expo SDK 54.

## Prerequisites

- Node.js 18+
- Android Studio with SDK installed
- Android emulator configured
- `ANDROID_HOME` environment variable set

## Project Setup

### 1. Create Expo Project

```bash
npx create-expo-app@latest my-app --template blank-typescript
cd my-app
```

### 2. Install Core Dependencies

```bash
# Essential for Expo Router
npx expo install expo-router expo-linking expo-constants expo-status-bar

# Navigation
npx expo install react-native-screens react-native-safe-area-context

# Any other expo packages you need
npx expo install expo-notifications expo-sqlite
```

**Critical**: Always use `npx expo install` for Expo-compatible packages. It handles version compatibility.

### 3. Avoid NativeWind/Tailwind

NativeWind causes severe dependency conflicts with Reanimated/Worklets versions. Use standard React Native StyleSheet instead:

```typescript
// constants/theme.ts
export const colors = {
  background: { primary: '#0f172a', secondary: '#1e293b' },
  text: { primary: '#ffffff', secondary: '#e2e8f0' },
  accent: { blue: '#3b82f6', green: '#22c55e' },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// In components
import { StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.md,
  },
});
```

### 4. Configure for Android

**app.json** - ensure Android package is set:
```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "android": {
      "package": "com.yourname.myapp"
    }
  }
}
```

**babel.config.js** - keep it simple:
```javascript
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

**metro.config.js** - keep it simple:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
```

## Running on Android Emulator

### Step 1: Start the Emulator

```bash
# List available emulators
$ANDROID_HOME/emulator/emulator -list-avds

# Start emulator (use -no-snapshot-load if having issues)
$ANDROID_HOME/emulator/emulator -avd "Your_AVD_Name" -no-snapshot-load &
```

Wait 20-30 seconds for boot. Verify with:
```bash
adb devices
# Should show: emulator-5554  device
```

### Step 2: Prebuild Android Project

```bash
npx expo prebuild --platform android --clean
```

This generates the `android/` folder with native code.

### Step 3: Build the APK

```bash
cd android && ./gradlew assembleDebug && cd ..
```

Or use Expo's build command:
```bash
npx expo run:android
```

**Warning**: `expo run:android` can be flaky - if it fails at the install step, use the manual method below.

### Step 4: Install APK Manually (if needed)

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 5: Set Up Port Forwarding

This allows the emulator to reach Metro on localhost:
```bash
adb reverse tcp:8081 tcp:8081
```

### Step 6: Start Metro Bundler

```bash
npx expo start --dev-client
```

### Step 7: Launch the App

```bash
# Find your package name
adb shell pm list packages | grep yourapp

# Launch it
adb shell monkey -p com.yourname.myapp -c android.intent.category.LAUNCHER 1
```

## Troubleshooting

### Emulator Goes Offline

The emulator frequently disconnects. Fix:
```bash
adb kill-server
adb start-server
adb devices
```

If still offline, restart the emulator.

### "Loading from 10.0.2.2:8081" - White Screen

Port forwarding not set up:
```bash
adb reverse tcp:8081 tcp:8081
```

Then relaunch the app.

### Missing Dependencies

Common missing packages for Expo Router:
```bash
npx expo install expo-linking
npx expo install babel-preset-expo
```

### Metro Not Running

Kill any stuck processes:
```bash
pkill -f "expo"
pkill -f "metro"
lsof -ti:8081 | xargs kill -9
```

Then restart Metro.

### Build Errors with Peer Dependencies

Use `--legacy-peer-deps` flag:
```bash
npm install some-package --legacy-peer-deps
```

Or better: use `npx expo install` which handles this automatically.

## Quick Reference Commands

```bash
# Start emulator
$ANDROID_HOME/emulator/emulator -avd "AVD_Name" &

# Check emulator connected
adb devices

# Restart ADB
adb kill-server && adb start-server

# Port forwarding
adb reverse tcp:8081 tcp:8081

# Prebuild
npx expo prebuild --platform android --clean

# Build APK
npx expo run:android
# OR manually:
cd android && ./gradlew assembleDebug && cd ..

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Start Metro
npx expo start --dev-client

# Launch app
adb shell monkey -p com.package.name -c android.intent.category.LAUNCHER 1

# Find package name
adb shell pm list packages | grep appname
```

## Recommended Workflow

1. Start emulator, wait for full boot
2. Run `adb devices` to confirm connection
3. Run `adb reverse tcp:8081 tcp:8081`
4. Start Metro: `npx expo start --dev-client`
5. In another terminal, launch app or use the 'a' key in Metro terminal

If the emulator was already running and app was already installed, you just need steps 3-5.

## Key Lessons

1. **Avoid NativeWind** - causes version hell with Reanimated/Worklets
2. **Use `npx expo install`** - handles version compatibility
3. **Port forwarding is essential** - emulator uses 10.0.2.2 for host
4. **Emulators are flaky** - be ready to restart ADB
5. **Manual APK install works** - when `expo run:android` fails at install step
6. **Keep configs simple** - don't add plugins unless absolutely needed
