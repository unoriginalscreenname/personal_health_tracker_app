# Component Extraction Protocol

Follow this protocol to extract inline UI from pages into `components/app/` components.

---

## STEP 1: READ REQUIRED FILES

Before writing any code, read:
1. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/page-component-structure.md`
2. `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/_plan/react-native-best-practices.md`
3. The source file you're extracting from

---

## STEP 2: FOR EACH COMPONENT

Create `/Users/ericmcgregor/Documents/PROJECTS/mobile/claude_health/components/app/[ComponentName].tsx`

**Structure:**
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconName } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface ComponentNameProps {
  // minimal props - only what's needed
}

export function ComponentName({ ...props }: ComponentNameProps) {
  return (
    // JSX copied from source
  );
}

const styles = StyleSheet.create({
  // styles copied verbatim from source
});
```

---

## STEP 3: UPDATE SOURCE FILE

For each extracted component:
- Add import: `import { ComponentName } from '@/components/app/ComponentName';`
- Replace inline JSX with the component
- Remove extracted styles from page StyleSheet
- Keep hooks and data fetching in the page (pass data as props)

---

## RULES

**DO:**
- Copy styles verbatim
- Keep props minimal
- Preserve press feedback behavior
- Use named exports

**DO NOT:**
- Create documentation files
- Refactor unrelated code
- Change visual design
- Add features or "improvements"
- Share styles between components (co-locate them)
