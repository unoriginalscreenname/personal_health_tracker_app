# Component Structure Analysis for React Native

## Executive Summary

The `page-component-structure.md` document was written for Next.js web apps and **requires adaptation** for this React Native/Expo project. Many principles transfer, but the specific thresholds and patterns need adjustment.

---

## What Transfers from Next.js to React Native

### Core Principles That Apply

1. **Extract reusable components** - Yes, applies fully
2. **Separate data hooks from UI** - Yes, you're already doing this well (`db/hooks/`)
3. **Don't create monolithic files** - Yes, but thresholds need adjustment
4. **Co-locate related code** - Yes, feature-based organization works
5. **Clear separation of concerns** - Yes, essential everywhere

### What Doesn't Apply

| Next.js Pattern | Why It Doesn't Apply |
|-----------------|---------------------|
| `'use client'` directive | React Native is always client-side |
| `apps/web/app/[page]/` structure | Expo Router has its own conventions |
| 200-line page threshold | Unrealistic with StyleSheet colocation |
| Barrel exports (`index.ts`) everywhere | Less common in RN, adds import overhead |

---

## File Size Reality in React Native

### Why Your Files Are Larger (And That's OK)

React Native convention places `StyleSheet.create()` at the bottom of component files. This adds 100-250 lines per screen that are purely declarative style definitions.

**Current file breakdown:**

| File | Total Lines | ~Component Logic | ~Styles |
|------|-------------|------------------|---------|
| `index.tsx` (Home) | 599 | ~310 | ~289 |
| `entry/[id].tsx` | 630 | ~345 | ~285 |
| `settings.tsx` | 592 | ~360 | ~232 |
| `nutrition/index.tsx` | 333 | ~150 | ~183 |
| `[meal].tsx` | 271 | ~150 | ~121 |

### Adjusted Thresholds for React Native

| File Type | Recommended | Warning | Action Required |
|-----------|-------------|---------|-----------------|
| Screen (with styles) | ≤400 | 400-500 | >500 extract components |
| Component (with styles) | ≤250 | 250-350 | >350 split |
| Hook | ≤150 | 150-200 | >200 split |
| Utility | ≤200 | - | - |

By these thresholds, `entry/[id].tsx` (630) and `index.tsx` (599) should be refactored.

---

## Current Codebase Assessment

### What's Working Well

1. **Database hooks** - Clean extraction in `db/hooks/`. The `useMealEntries.ts` (213 lines) is well-organized with clear single responsibility.

2. **Theme centralization** - `constants/theme.ts` provides consistent styling tokens.

3. **Type exports** - Consolidated through `db/index.ts` barrel file.

4. **Hook patterns** - `useFastingState.ts` is a good example of extracted domain logic.

5. **Feature grouping** - Nutrition screens grouped under `app/(tabs)/nutrition/`.

### Issues to Address

#### 1. Style Duplication
Timeline styles are duplicated between files:
- `app/(tabs)/nutrition/index.tsx:264-316`
- `app/(tabs)/nutrition/settings.tsx:501-554`

**Fix:** Extract `TimelineEntry` component to `components/nutrition/`.

#### 2. Large Screen Components
`EntryDetailScreen` (630 lines) handles:
- Entry display
- Time picker modal
- Add food modal
- Item removal

**Fix:** Extract `TimePicker` modal as reusable component.

#### 3. No Component Extraction Layer
All UI is in screen files. Common patterns that should be components:
- Back button header (repeated in every screen)
- Progress bar (protein tracking)
- Food chip/tag display
- Section headers

---

## Recommended Directory Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx              # Command Center (~400 lines OK)
│   ├── nutrition/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── [meal].tsx
│   │   ├── entry/[id].tsx     # Needs refactor
│   │   ├── settings.tsx       # Needs refactor
│   │   └── custom-food.tsx
│   ├── workout.tsx
│   └── history.tsx
components/
├── ui/                        # Generic UI components
│   ├── Header.tsx             # Back button + title pattern
│   ├── ProgressBar.tsx
│   └── Card.tsx
├── nutrition/                 # Feature-specific components
│   ├── TimelineEntry.tsx      # Extract from index + settings
│   ├── FoodChip.tsx
│   └── TimePicker.tsx         # Extract from entry/[id]
└── home/
    └── SupplementGrid.tsx     # Extract from index.tsx
db/
├── hooks/                     # Keep as-is, working well
├── database.tsx
├── schema.ts
└── index.ts
hooks/                         # App-level hooks
└── useFastingState.ts
constants/
└── theme.ts
```

---

## Monolithic File Prevention

### Do You Need This Rule? Yes.

Claude (and LLMs generally) tend to:
1. Add features by appending to existing files
2. Avoid creating new files to minimize changes
3. Grow StyleSheet definitions without bound

### Practical Guidelines

1. **Before adding features:** Ask "Does this belong in an existing file or a new one?"

2. **Component extraction triggers:**
   - Same UI pattern appears twice → Extract
   - Modal/overlay with its own state → Extract
   - Screen file exceeds 500 lines → Review for extraction

3. **When NOT to extract:**
   - Component used only once AND simple
   - StyleSheet is the main reason for file size
   - Extraction would require prop drilling >2 levels

---

## Priority Refactoring Tasks

### High Priority (Do First)

1. **Extract `TimelineEntry` component**
   - Used in: `nutrition/index.tsx`, `settings.tsx`
   - Lines saved: ~100 per file

2. **Extract `TimePicker` modal from `entry/[id].tsx`**
   - Self-contained modal with own state
   - Reusable for any time selection
   - Lines saved: ~150

### Medium Priority

3. **Extract shared header pattern**
   - Back button + title used everywhere
   - Could be `<ScreenHeader title="..." onBack={...} />`

4. **Create `FoodChip` component**
   - Used in timeline entries
   - Small but repetitive

### Low Priority (Nice to Have)

5. **Extract `SupplementGrid` from home screen**
   - Would reduce `index.tsx` by ~100 lines
   - Only used once, but complex enough to warrant extraction

---

## Documentation Updates Needed

### Remove or Archive
- `gluestack-ui-best-practices.md` - Not using NativeWind/Gluestack

### Update
- `page-component-structure.md` - Either:
  1. Rename to clarify it's for Next.js web only, OR
  2. Create separate `react-native-component-structure.md`

### Keep As-Is
- `design-brief.md` - Platform-agnostic design principles
- `prd.md` - Product requirements
- `react-native-android-setup.md` - Useful troubleshooting guide
- `react-native-best-practices.md` - Good general patterns

---

## Quick Reference: React Native vs Next.js

| Aspect | Next.js Web | React Native |
|--------|-------------|--------------|
| Styles location | CSS modules / styled-components | StyleSheet in same file |
| Typical page size | 150-250 lines | 300-500 lines (with styles) |
| Routing | File-based, pages/ or app/ | Expo Router, app/ |
| Server components | Yes | No (all client) |
| Code splitting | Critical | Less important |
| Bundle size | Very important | Less critical |
| Render perf | Important | Critical |
| `'use client'` | Required for interactivity | Not applicable |

---

## Conclusion

The core philosophy of `page-component-structure.md` is sound:
- Extract components when patterns repeat
- Keep business logic in hooks
- Don't let files grow unbounded

But the specific thresholds and Next.js patterns don't transfer directly. Use the adjusted thresholds above and focus on the priority refactoring tasks to improve maintainability without over-engineering.

**Bottom line:** Yes, monolithic file prevention matters. Adjust the line thresholds to account for StyleSheet colocation, and extract when you see duplication.
