---
description: Rules for screen-centric development, component organization, and code structure in React Native/Expo
alwaysApply: true
---
# React Native Component Structure

## Core Philosophy
- **Screens Orchestrate**: Screen files compose components and hooks, minimal business logic
- **Extract on Repetition**: Same pattern twice = extract to component
- **Hooks for Logic**: Data fetching, state management, domain logic live in hooks
- **Styles Colocate**: StyleSheet stays with its component (this is the RN convention)

## Sustainable Code Principles

1. **Predictable** - Data flows one direction, changes have localized effects
2. **Testable** - Hooks and utilities can be tested in isolation
3. **Understandable** - One file = one clear purpose
4. **Modifiable** - Change one piece without breaking others

## Directory Structure
```
app/
├── _layout.tsx                    # Root layout
├── (tabs)/
│   ├── _layout.tsx                # Tab navigator
│   ├── index.tsx                  # Home screen
│   └── [feature]/                 # Feature screens (stack)
│       ├── _layout.tsx
│       ├── index.tsx
│       └── [id].tsx               # Dynamic routes
components/
├── ui/                            # Generic, reusable UI
│   ├── Header.tsx
│   ├── Card.tsx
│   └── ProgressBar.tsx
└── [feature]/                     # Feature-specific components
    ├── FeatureList.tsx
    └── FeatureItem.tsx
hooks/
├── useFastingState.ts             # Domain logic hooks
└── useTimer.ts
db/
├── hooks/                         # Database operation hooks
│   ├── useFoods.ts
│   └── useMealEntries.ts
├── schema.ts
└── index.ts                       # Exports all hooks + types
constants/
└── theme.ts                       # Colors, spacing, typography
```

## File Size Thresholds

React Native files include colocated StyleSheet (~100-200 lines). Thresholds account for this.

| File Type | Target | Max | Action When Exceeded |
|-----------|--------|-----|----------------------|
| Screen | ≤400 | 500 | Extract components |
| Component | ≤250 | 350 | Split into sub-components |
| Hook | ≤150 | 200 | Split by concern |
| Utility | ≤100 | 150 | Split by function |

**Measuring:** Count total lines. Styles are part of the file.

## Component Extraction Rules

### MUST Extract When:
- Same UI pattern appears in 2+ files
- Modal/overlay has its own state logic
- Screen exceeds 500 lines
- Component has 3+ levels of nested Views

### DON'T Extract When:
- Component used only once AND under 100 lines of JSX
- Extraction requires passing 4+ props
- StyleSheet is the main reason for file size

## Screen File Structure

Every screen file follows this order:

```typescript
// 1. Imports (React, RN, expo-router, lucide, constants, hooks, components)
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/constants/theme';
import { useSomeHook } from '@/db';

// 2. Types (if needed, keep minimal)
interface ScreenProps { /* ... */ }

// 3. Helper functions (pure, no hooks)
function formatDate(date: string): string { /* ... */ }

// 4. Small sub-components (if not worth extracting)
const ListItem = ({ item }: { item: Item }) => (
  <View style={styles.item}>
    <Text>{item.name}</Text>
  </View>
);

// 5. Main component
export default function FeatureScreen() {
  // Hooks first
  const router = useRouter();
  const { data, loading } = useSomeHook();

  // Local state
  const [selected, setSelected] = useState(null);

  // Callbacks (useCallback for passed-down functions)
  const handlePress = useCallback(() => { /* ... */ }, []);

  // Effects
  useEffect(() => { /* ... */ }, []);

  // Early returns (loading, error states)
  if (loading) return <LoadingView />;

  // Main render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ... */}
    </SafeAreaView>
  );
}

// 6. StyleSheet (always at bottom)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  // ... rest of styles
});
```

## Hook Patterns

```typescript
// Database hook - returns data + operations
export function useFeatureData() {
  const db = useSQLiteContext();

  const getData = useCallback(async () => { /* ... */ }, [db]);
  const createItem = useCallback(async () => { /* ... */ }, [db]);

  return { getData, createItem };
}

// Domain logic hook - returns computed state
export function useFastingState() {
  const [state, setState] = useState(initialState);

  useEffect(() => { /* update logic */ }, []);

  return state; // { isFasting, hours, minutes, progress }
}
```

## Styling Rules

1. **Always use theme constants**:
   ```typescript
   import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
   ```

2. **StyleSheet at file bottom** - Never inline styles except for dynamic values

3. **Dynamic styles pattern**:
   ```typescript
   <View style={[styles.card, isActive && styles.cardActive]} />
   ```

4. **Pressable feedback**:
   ```typescript
   <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
   ```

## Import Order

```typescript
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. React Native
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 3. Expo/Navigation
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

// 4. Icons
import { ChevronLeft, Plus, Check } from 'lucide-react-native';

// 5. Local (use @/ alias)
import { colors, spacing } from '@/constants/theme';
import { useFeatureHook } from '@/db';
import { MyComponent } from '@/components/feature';
```

## Refactoring Checklist

Before refactoring a screen >400 lines:

1. [ ] List all state variables and their dependencies
2. [ ] Identify repeated UI patterns
3. [ ] Identify self-contained sections (modals, forms, lists)
4. [ ] Extract ONE component at a time, verify it works
5. [ ] Move shared styles to extracted component

## Anti-Patterns to Avoid

1. **Prop drilling >2 levels** - Use hooks or context instead
2. **Inline functions in render** - Extract to useCallback
3. **Styles outside StyleSheet** - Never use inline style objects
4. **Giant useEffect** - Split into multiple focused effects
5. **Business logic in screens** - Move to hooks
6. **Duplicate StyleSheet entries** - Extract shared component

## When Adding Features

1. **New screen?** Start with the screen file structure template above
2. **New UI element?** Check if similar exists in `components/`
3. **New data operation?** Add to existing db hook or create new one
4. **Screen getting big?** Extract before exceeding 500 lines

## Code Review Checklist

- [ ] File sizes within thresholds
- [ ] No duplicate UI patterns across files
- [ ] Hooks handle all data/logic, screens only compose
- [ ] StyleSheet uses theme constants
- [ ] Pressables have press feedback
- [ ] useCallback for functions passed to children
