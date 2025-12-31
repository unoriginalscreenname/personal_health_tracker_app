# React Native & Expo Best Practices (2025)

## Project Setup

### Create New Expo Project
```bash
npx create-expo-app@latest MyApp
# Or with TypeScript blank template:
npx create-expo-app --template blank-typescript
```

### Essential Dependencies for This Project
```bash
npx expo install expo-notifications expo-device expo-constants
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install expo-sqlite  # For storage (replaces AsyncStorage)
```

## Navigation with Expo Router

### File-Based Routing Structure
```
app/
  _layout.tsx          # Root layout
  (tabs)/
    _layout.tsx        # Tab navigator layout
    index.tsx          # Home tab
    nutrition.tsx      # Nutrition tab
    workout.tsx        # Workout tab
    history.tsx        # History tab
```

### Root Layout Setup
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

### Tab Layout with Icons
```tsx
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Fuel',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="restaurant" color={color} />,
        }}
      />
    </Tabs>
  );
}
```

## State Management with Zustand

### Basic Store with Persistence
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from 'expo-sqlite/kv-store';

interface AppState {
  sittingMode: boolean;
  timerSeconds: number;
  toggleSittingMode: () => void;
  resetTimer: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sittingMode: false,
      timerSeconds: 3600,
      toggleSittingMode: () => set({ sittingMode: !get().sittingMode }),
      resetTimer: () => set({ timerSeconds: 3600 }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Store with Multiple Slices
```typescript
interface DailyLog {
  date: string;
  protein: number;
  miso: boolean;
  workout: string | null;
  supplements: { creatine: boolean; magnesium: boolean; nac: boolean; waterCount: number };
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      logs: {},
      getTodayLog: () => get().logs[new Date().toISOString().split('T')[0]],
      updateTodayLog: (updates) => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        return {
          logs: {
            ...state.logs,
            [today]: { ...state.logs[today], ...updates }
          }
        };
      }),
    }),
    { name: 'daily-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

## Local Storage (expo-sqlite/kv-store)

### Drop-in AsyncStorage Replacement
```typescript
import Storage from 'expo-sqlite/kv-store';

// Async methods
await Storage.setItem('key', JSON.stringify({ value: 'data' }));
const value = await Storage.getItem('key');
const parsed = JSON.parse(value);

// Sync methods (when needed)
Storage.setItemSync('key', 'value');
const val = Storage.getItemSync('key');
```

## Notifications (expo-notifications)

### Setup Notification Handler
```typescript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

### Schedule Local Notification
```typescript
async function scheduleMovementReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Movement Snack Due',
      body: 'Time for your reps!',
      data: { type: 'movement' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3600, // 60 minutes
    },
  });
}

// Schedule at specific time
async function scheduleFastingAlert() {
  const trigger = new Date();
  trigger.setHours(12, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Break Fast',
      body: 'Miso/Protein time!',
    },
    trigger,
  });
}
```

### Request Permissions
```typescript
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }
  return false;
}
```

### Listen for Notifications
```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

export function useNotificationListener() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => console.log('Received:', notification)
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => console.log('Response:', response)
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

## AppState Handling

### Track App Foreground/Background
```typescript
import { useRef, useState, useEffect } from 'react';
import { AppState } from 'react-native';

export function useAppState() {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // Recalculate timers, refresh data
      }
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => subscription.remove();
  }, []);

  return appStateVisible;
}
```

## Date/Time Handling

### CRITICAL: Date String Parsing Timezone Bug

When parsing date strings like `"2024-12-30"` (without time), JavaScript interprets them as **UTC midnight**. When you then use local timezone methods, the date can shift by a day!

```typescript
// ❌ WRONG - Can shift to previous day in western timezones
const date = new Date("2024-12-30");
// In PST (UTC-8): This becomes Dec 29, 4:00 PM local time!

// ❌ WRONG - formatDateLocal will return "2024-12-29" in PST
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const result = formatDateLocal(new Date("2024-12-30")); // "2024-12-29" in PST!

// ✅ CORRECT - Add T12:00:00 to parse as local noon
const date = new Date("2024-12-30T12:00:00");
// Now stays on Dec 30 regardless of timezone
```

**Rule**: Always append `T12:00:00` when converting a date string (YYYY-MM-DD) to a Date object for local timezone operations.

### Helper for Safe Date Parsing

```typescript
// Use this when you need to convert a date string to Date for comparisons
function parseDateLocal(dateString: string): Date {
  return new Date(dateString + 'T12:00:00');
}

// Use this when you need today's date as a string
function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Use this when you need yesterday's date as a string
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

### When This Matters

- Comparing dates in streak calculations
- Filling gaps in date sequences
- Any loop that iterates through dates
- Displaying dates in UI (already handled in `stats/index.tsx`)

### Using date-fns
```typescript
import { format, differenceInSeconds, addHours, isWithinInterval } from 'date-fns';

// Fasting window calculation
const FAST_START_HOUR = 18; // 6 PM
const FAST_END_HOUR = 12;   // 12 PM next day

function isInFastingWindow(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= FAST_START_HOUR || hour < FAST_END_HOUR;
}

function getTimeUntilWindowChange(): number {
  const now = new Date();
  const hour = now.getHours();

  let targetHour = isInFastingWindow() ? FAST_END_HOUR : FAST_START_HOUR;
  let target = new Date(now);
  target.setHours(targetHour, 0, 0, 0);

  if (target <= now) target.setDate(target.getDate() + 1);

  return differenceInSeconds(target, now);
}
```

## React Hooks Best Practices

### useFocusEffect vs useEffect (IMPORTANT)

In React Native with stack navigation, **screens are not unmounted** when you navigate away - they stay in the stack. This means `useEffect` only runs once when the component first mounts, NOT when you navigate back to it.

**Use `useFocusEffect` when you need data to reload on navigation back:**

```typescript
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// ❌ WRONG - Data won't reload when navigating back
useEffect(() => {
  loadData();
}, []);

// ✅ CORRECT - Data reloads every time screen comes into focus
useFocusEffect(
  useCallback(() => {
    loadData();
  }, [loadData])
);
```

**When to use which:**
- `useEffect` - One-time setup, subscriptions, timers
- `useFocusEffect` - Loading data that might change while on other screens

### useEffect Cleanup Pattern
```typescript
useEffect(() => {
  const subscription = SomeAPI.subscribe(handleChange);

  return () => {
    subscription.remove();
  };
}, []);
```

### Timer with useEffect
```typescript
function useTimer(isActive: boolean, initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 0) {
          // Timer complete - trigger notification
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return { seconds, reset: () => setSeconds(initialSeconds) };
}
```

## Performance Tips

1. **Use useCallback for event handlers** passed to child components
2. **Use useMemo** for expensive calculations
3. **Avoid inline objects/arrays** in render - creates new references
4. **Use FlatList** for long lists, not ScrollView with map
5. **Keep components small** - split when exceeding ~200 lines

## TypeScript Configuration

### tsconfig.json Essentials
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

## Project Structure
```
/app                 # Expo Router pages
/components          # Reusable UI components
  /ui                # Gluestack UI components
/stores              # Zustand stores
/hooks               # Custom React hooks
/utils               # Helper functions
/types               # TypeScript types
/constants           # App constants (colors, times, etc.)
```
