# React Native UI Libraries Analysis (December 2025)

## Current State

The project uses raw React Native StyleSheet with a custom theme (`constants/theme.ts`). While functional, this approach requires building every component from scratch and lacks the polished feel of a professional design system.

---

## Top Contenders

### 1. React Native Paper

**The Recommendation for This Project**

| Aspect | Details |
|--------|---------|
| Downloads | 304k/week (highest) |
| GitHub Stars | 14k+ |
| Design System | Material Design 3 (Material You) |
| Maintainer | Callstack (official RN partner) |
| Expo Support | First-class, no extra setup needed |

**Strengths:**
- 40+ production-ready components with built-in accessibility
- Automatic dark/light mode theming
- Most stable and battle-tested option
- Excellent documentation
- Active maintenance throughout 2024-2025
- Dynamic theming with expo-material3-theme for Android 12+ system colors

**Weaknesses:**
- Material Design aesthetic may feel "Android-first" on iOS
- Less flexibility if you want a unique design language
- Can feel dated compared to newer libraries

**Best For:** Apps that want polished, professional UI without fighting the framework.

---

### 2. Tamagui

**High Performance, Steep Learning Curve**

| Aspect | Details |
|--------|---------|
| Downloads | 91k/week |
| Design System | Custom (Tailwind-like) |
| Performance | Optimizing compiler for near-native speed |

**Strengths:**
- Best-in-class performance via compile-time optimization
- True cross-platform (web + native) with style parity
- Tailwind-like atomic styling
- Beautiful default components

**Weaknesses:**
- **Compatibility issues with React Native 0.79+ and 0.80+** (active GitHub issues)
- Steep learning curve (responsive tokens, theme nesting, compiler config)
- Reported performance problems on low-end Android devices (Samsung A7/A8)
- Benchmarks show slower render than raw StyleSheet in dev mode
- Not beginner-friendly

**Best For:** Teams with Tailwind experience building performance-critical cross-platform apps.

---

### 3. Gluestack UI v3

**NativeBase Successor, Still Maturing**

| Aspect | Details |
|--------|---------|
| Downloads | ~53k/week (as NativeBase) |
| Design System | Tailwind CSS via NativeWind |
| Architecture | Copy-paste components (shadcn-style) |

**Strengths:**
- Modular, unbundled architecture (only import what you use)
- Full Expo SDK 54 support (as of Sept 2025)
- Accessibility built on @react-native-aria
- TypeScript-first
- Familiar to shadcn/Tailwind users

**Weaknesses:**
- **Limited component library** compared to Paper or MUI
- NativeWind dependency adds complexity
- Upgrade path (v2→v3) has been rocky (styling breaks reported)
- Shadows don't work via NativeWind—need native `elevation`
- Still evolving; may not be ideal for production-critical apps yet

**Best For:** Teams who love Tailwind/shadcn patterns and want maximum customization.

---

### 4. RNUILib (Wix)

**Production-Proven, Enterprise-Grade**

| Aspect | Details |
|--------|---------|
| Maintainer | Wix (uses it in their production apps) |
| Design System | Custom, design-system-first |
| Expo Support | Yes (starter kit available) |

**Strengths:**
- Battle-tested in Wix's own high-traffic apps
- Strong theming system (colors, typography, spacing)
- 20+ customizable components
- Figma library available for designer collaboration
- Supports both RN CLI and Expo

**Weaknesses:**
- Less community adoption than Paper/Tamagui
- Documentation not as polished
- Smaller ecosystem of examples/tutorials

**Best For:** Teams building enterprise apps that need strict design system enforcement.

---

### 5. UI Kitten

**Good RTL Support, Stagnant Development**

| Aspect | Details |
|--------|---------|
| Downloads | Moderate |
| Design System | Eva Design System |
| Last Major Release | Over 12 months ago |

**Strengths:**
- Best RTL (right-to-left) support among all libraries
- Runtime theme switching
- 480+ Eva icons included
- 40+ pre-built screens in dark/light themes

**Weaknesses:**
- **No major release in 12+ months** (potential maintenance concern)
- Computes styles every render (performance impact)
- May cause jank in animation-heavy screens

**Best For:** Apps targeting RTL languages (Arabic, Hebrew) or needing quick prototyping.

---

## Quick Comparison Table

| Library | Performance | Components | Learning Curve | Maintenance | Expo 54 |
|---------|-------------|------------|----------------|-------------|---------|
| Paper | Good | 40+ | Easy | Excellent | Yes |
| Tamagui | Excellent* | 30+ | Hard | Active | Issues |
| Gluestack v3 | Good | 30+ | Medium | Active | Yes |
| RNUILib | Good | 20+ | Medium | Active | Yes |
| UI Kitten | Fair | 25+ | Easy | Stagnant | Yes |

*Tamagui performance requires proper compiler setup; dev mode benchmarks are misleading.

---

## Recommendation for VisceralCommand

### Primary: **React Native Paper**

**Why:**
1. **Stability** — Most mature library, maintained by Callstack (official RN partner)
2. **Expo integration** — Zero-config setup with Expo SDK 54
3. **Component coverage** — Has everything you need: buttons, cards, lists, dialogs, FABs, etc.
4. **Dark mode** — Built-in theming matches your existing dark theme approach
5. **Professional polish** — Material Design 3 looks polished out of the box
6. **Migration ease** — Can wrap existing custom components gradually

**Potential Concern:** Material Design may feel "Android-like" on iOS. Mitigation: Paper allows significant customization of component styles.

### Alternative: **Gluestack v3**

Consider if:
- You strongly prefer Tailwind-style utility classes
- You want the shadcn copy-paste component model
- You're okay with a smaller component library and occasional rough edges

### Avoid for Now:
- **Tamagui** — Compatibility issues with recent RN versions, steep learning curve
- **UI Kitten** — Stagnant development, render performance concerns
- **Raw StyleSheet** — Too much work for no benefit

---

## Migration Strategy (Paper)

```bash
# Install
npx expo install react-native-paper react-native-safe-area-context

# Optional: Material 3 dynamic theming
npx expo install expo-material3-theme
```

**Gradual adoption approach:**
1. Wrap app in `<PaperProvider>` with custom theme matching current colors
2. Replace one screen at a time, starting with simple components (Button, Card)
3. Keep custom components where Paper doesn't have equivalent
4. Delete custom implementations as Paper components prove stable

---

## Sources

- [React Native Paper](https://reactnativepaper.com/)
- [Tamagui GitHub](https://github.com/tamagui/tamagui)
- [Gluestack v3 Release](https://gluestack.io/blogs/gluestack-v3-release)
- [RNUILib (Wix)](https://github.com/wix/react-native-ui-lib)
- [LogRocket: Best RN UI Libraries](https://blog.logrocket.com/best-react-native-ui-component-libraries)
- [NPM Trends Comparison](https://npmtrends.com/native-base-vs-react-native-paper-vs-tamagui)
