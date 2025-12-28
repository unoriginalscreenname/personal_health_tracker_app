# Gluestack Migration Agent Prompt

Use this prompt template when spawning a sub-agent to migrate a page to Gluestack UI v3.

**Usage:**
```
Task tool with subagent_type: "general-purpose"
```

**Replace:**
- `[PAGE_PATH]` - the page file to migrate (e.g., `app/(tabs)/nutrition/index.tsx`)
- `[COMPONENTS_TO_CREATE]` - list of components specific to that page

---

## PROMPT TEMPLATE

```
## TASK: Migrate [PAGE_NAME] to Gluestack UI v3

You are migrating `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/[PAGE_PATH]` from React Native StyleSheet to Gluestack UI v3 components.

---

## STEP 1: READ THESE FILES FIRST (MANDATORY)

Before writing ANY code, you MUST read these files in order:

1. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/gluestack-ui-best-practices.md`
2. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/page-component-structure.md`
3. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/react-native-best-practices.md`
4. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/[PAGE_PATH]` (the page to migrate)

---

## STEP 2: CRITICAL GLUESTACK RULES

**Text sizing - USE `size` PROP, NOT className:**
```tsx
// CORRECT
<Text size="5xl" className="font-extralight text-success-500">120</Text>

// WRONG - will not work correctly
<Text className="text-5xl font-extralight text-success-500">120</Text>
```

**Available Text sizes:** '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'

**VStack/HStack spacing - USE `space` PROP:**
```tsx
// CORRECT
<VStack space="md" className="items-center">

// WRONG
<VStack className="gap-4 items-center">
```

**Large numbers with units - SPLIT into separate Text components:**
```tsx
<HStack className="items-baseline">
  <Text size="5xl" className="font-extralight text-success-500">{value}</Text>
  <Text size="xl" className="font-extralight text-typography-400">g</Text>
</HStack>
```

---

## STEP 3: COMPONENTS TO CREATE

Create these components in `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/components/app/`:

[COMPONENTS_TO_CREATE]

---

## STEP 4: UPDATE THE PAGE

After creating components, update `[PAGE_PATH]`:
- Remove ALL StyleSheet code
- Import new components from `@/components/app/`
- Use Gluestack components: `Box`, `VStack`, `HStack`, `Text`, `Pressable` from `@/components/ui/`
- Use `SafeAreaView` from `react-native-safe-area-context`
- Keep all existing hooks and logic

---

## STEP 5: GLUESTACK IMPORTS

```tsx
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
```

---

## DO NOT:
- Use className for text sizing (use `size` prop)
- Use className for VStack/HStack gaps (use `space` prop)
- Create any documentation files
- Modify any files outside of `components/app/` and `[PAGE_PATH]`
- Add comments explaining what Gluestack is

## DO:
- Read the required files FIRST
- Use Context7 to look up Gluestack docs ONLY if you get stuck
- Install new Gluestack components if needed: `echo "y" | npx gluestack-ui add <component>`
- Keep the minimal, neutral visual style
- Preserve all existing functionality
```

---

## EXAMPLE: Nutrition Page Migration

Here's the exact prompt used for the nutrition page:

```
## TASK: Migrate Nutrition Landing Page to Gluestack UI v3

You are migrating `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/app/(tabs)/nutrition/index.tsx` from React Native StyleSheet to Gluestack UI v3 components.

---

## STEP 1: READ THESE FILES FIRST (MANDATORY)

Before writing ANY code, you MUST read these files in order:

1. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/gluestack-ui-best-practices.md`
2. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/page-component-structure.md`
3. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/react-native-best-practices.md`
4. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/app/(tabs)/nutrition/index.tsx` (the page to migrate)

---

## STEP 2: CRITICAL GLUESTACK RULES

**Text sizing - USE `size` PROP, NOT className:**
```tsx
// CORRECT
<Text size="5xl" className="font-extralight text-success-500">120</Text>

// WRONG - will not work correctly
<Text className="text-5xl font-extralight text-success-500">120</Text>
```

**Available Text sizes:** '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl'

**VStack/HStack spacing - USE `space` PROP:**
```tsx
// CORRECT
<VStack space="md" className="items-center">

// WRONG
<VStack className="gap-4 items-center">
```

**Large numbers with units - SPLIT into separate Text components:**
```tsx
<HStack className="items-baseline">
  <Text size="5xl" className="font-extralight text-success-500">{value}</Text>
  <Text size="xl" className="font-extralight text-typography-400">g</Text>
</HStack>
```

---

## STEP 3: COMPONENTS TO CREATE

Create these components in `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/components/app/`:

### 1. `ProteinStatsCard.tsx`
- Shows protein value (large number) + "/160g" target + calories
- Progress bar below
- Props: `protein: number`, `calories: number`, `target?: number`
- Use `Progress` and `ProgressFilledTrack` from `@/components/ui/progress`

### 2. `LogFoodButton.tsx`
- Dashed border button with PenLine icon + "Log food" text
- Props: `onPress: () => void`
- Green accent color, dashed border style

### 3. `FoodTimeline.tsx`
- List of food entries with time on left, food chips on right
- Props: `entries: MealEntry[]`, `onEntryPress: (id: number) => void`
- Each entry shows time + list of food items with protein

### 4. `EmptyFoodState.tsx`
- Simple centered text for when no food logged
- "No food logged today" + "Tap 'Log food' to start tracking"

---

## STEP 4: UPDATE THE PAGE

After creating components, update `app/(tabs)/nutrition/index.tsx`:
- Remove ALL StyleSheet code
- Import new components from `@/components/app/`
- Use Gluestack components: `Box`, `VStack`, `HStack`, `Text`, `Pressable` from `@/components/ui/`
- Use `SafeAreaView` from `react-native-safe-area-context`
- Keep all existing hooks and logic

---

## STEP 5: GLUESTACK IMPORTS

```tsx
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
```

---

## DO NOT:
- Use className for text sizing (use `size` prop)
- Use className for VStack/HStack gaps (use `space` prop)
- Create any documentation files
- Modify any files outside of `components/app/` and `app/(tabs)/nutrition/index.tsx`
- Add comments explaining what Gluestack is

## DO:
- Read the required files FIRST
- Use Context7 to look up Gluestack docs ONLY if you get stuck
- Install new Gluestack components if needed: `echo "y" | npx gluestack-ui add <component>`
- Keep the minimal, neutral visual style
- Preserve all existing functionality
```
