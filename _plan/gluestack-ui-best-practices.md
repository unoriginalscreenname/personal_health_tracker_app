# Gluestack UI Best Practices (v2 - NativeWind)

## Installation & Setup

### Install with Expo
```bash
npx create-expo-app@latest my-app
cd my-app
npx gluestack-ui init
```

### Add Components
```bash
npx gluestack-ui add box vstack hstack
npx gluestack-ui add button text heading
npx gluestack-ui add progress switch card
npx gluestack-ui add input checkbox fab toast modal
```

### Babel Configuration
```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

### Tailwind Configuration for Dark Mode
```javascript
// tailwind.config.js
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : 'media',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

### Package.json Scripts (Dark Mode)
```json
{
  "scripts": {
    "android": "DARK_MODE=media expo start --android",
    "ios": "DARK_MODE=media expo start --ios",
    "web": "DARK_MODE=class expo start --web"
  }
}
```

## Provider Setup

### Basic GluestackUIProvider
```tsx
// App.tsx
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

export default function App() {
  return (
    <GluestackUIProvider mode="dark">
      <YourApp />
    </GluestackUIProvider>
  );
}
```

### Dark Mode Toggle
```tsx
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useState } from 'react';

export default function App() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('dark');

  return (
    <GluestackUIProvider mode={colorMode}>
      <Box className="bg-background-0 dark:bg-background-950 flex-1">
        <Button onPress={() => setColorMode(m => m === 'light' ? 'dark' : 'light')}>
          <ButtonText>Toggle Theme</ButtonText>
        </Button>
      </Box>
    </GluestackUIProvider>
  );
}
```

### Theme Persistence with AsyncStorage
```tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from 'expo-sqlite/kv-store';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved) setTheme(saved as Theme);
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    AsyncStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

## Core Components

### Layout: Box, VStack, HStack
```tsx
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';

// Vertical stack with spacing
<VStack space="lg">
  <Box className="h-20 w-20 bg-primary-500" />
  <Box className="h-20 w-20 bg-primary-600" />
</VStack>

// Horizontal stack
<HStack space="md" className="items-center">
  <Text>Label</Text>
  <Switch value={isOn} onValueChange={setIsOn} />
</HStack>
```

### Text & Heading
```tsx
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

<Heading size="xl" className="text-typography-900 dark:text-typography-50">
  Title
</Heading>
<Text size="md" className="text-typography-700 dark:text-typography-200">
  Description text
</Text>
```

### Button
```tsx
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { AddIcon } from '@/components/ui/icon';

<Button size="lg" action="primary" onPress={handlePress}>
  <ButtonIcon as={AddIcon} />
  <ButtonText>Add Item</ButtonText>
</Button>

// Variants: action="primary" | "secondary" | "positive" | "negative"
// Sizes: size="xs" | "sm" | "md" | "lg" | "xl"
// Variants: variant="solid" | "outline" | "link"
```

### Progress Bar
```tsx
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';

<Progress value={proteinTotal} max={160} size="lg" className="w-full">
  <ProgressFilledTrack className={proteinTotal >= 140 ? 'bg-success-500' : 'bg-primary-500'} />
</Progress>

// With label
<VStack space="md" className="w-full">
  <Text size="md">Protein: {proteinTotal}/160g</Text>
  <Progress value={(proteinTotal / 160) * 100} size="lg">
    <ProgressFilledTrack />
  </Progress>
</VStack>
```

### Switch
```tsx
import { Switch } from '@/components/ui/switch';
import colors from 'tailwindcss/colors';

<Switch
  value={sittingMode}
  onValueChange={setSittingMode}
  trackColor={{ false: colors.gray[600], true: colors.blue[500] }}
  thumbColor={colors.white}
  size="lg"
/>
```

### Card
```tsx
import { Card } from '@/components/ui/card';

<Card className="p-4 bg-background-50 dark:bg-background-800 rounded-xl">
  <Heading size="md">Meal Slot</Heading>
  <Text>Content here</Text>
</Card>
```

### Input
```tsx
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { EyeIcon, EyeOffIcon } from 'lucide-react-native';

// Basic input
<Input variant="outline" size="md">
  <InputField placeholder="Enter protein (g)" keyboardType="numeric" />
</Input>

// Password with toggle
<Input>
  <InputField
    type={showPassword ? 'text' : 'password'}
    placeholder="Password"
  />
  <InputSlot onPress={() => setShowPassword(!showPassword)}>
    <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
  </InputSlot>
</Input>
```

### Checkbox
```tsx
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '@/components/ui/checkbox';
import { CheckIcon } from '@/components/ui/icon';

<Checkbox value="creatine" isChecked={creatine} onChange={setCreatine}>
  <CheckboxIndicator>
    <CheckboxIcon as={CheckIcon} />
  </CheckboxIndicator>
  <CheckboxLabel>Creatine (5g)</CheckboxLabel>
</Checkbox>
```

### Fab (Floating Action Button)
```tsx
import { Fab, FabLabel, FabIcon } from '@/components/ui/fab';
import { AddIcon } from '@/components/ui/icon';

<Box className="flex-1 relative">
  {/* Content */}
  <Fab placement="bottom right" onPress={handleQuickLog}>
    <FabIcon as={AddIcon} />
    <FabLabel>Quick Log</FabLabel>
  </Fab>
</Box>
```

### Toast
```tsx
import { Toast, ToastTitle, ToastDescription, useToast } from '@/components/ui/toast';

function MyComponent() {
  const toast = useToast();

  const showSuccess = () => {
    toast.show({
      placement: 'top',
      render: () => (
        <Toast action="success">
          <ToastTitle>Success!</ToastTitle>
          <ToastDescription>Reps completed</ToastDescription>
        </Toast>
      ),
    });
  };
}
```

### Modal
```tsx
import {
  Modal, ModalBackdrop, ModalContent, ModalHeader,
  ModalCloseButton, ModalBody, ModalFooter
} from '@/components/ui/modal';

const [showModal, setShowModal] = useState(false);

<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <ModalBackdrop />
  <ModalContent className="max-w-md">
    <ModalHeader>
      <Heading size="lg">Select Workout</Heading>
      <ModalCloseButton />
    </ModalHeader>
    <ModalBody>
      {/* Content */}
    </ModalBody>
    <ModalFooter>
      <Button onPress={() => setShowModal(false)}>
        <ButtonText>Save</ButtonText>
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

## Dark Mode Styling

### Using dark: Prefix
```tsx
<Box className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-gray-100">
    Adapts to theme
  </Text>
</Box>
```

### Conditional Colors for States
```tsx
// Fasting state colors
<Box className={isFasting
  ? 'bg-blue-900 dark:bg-blue-950'
  : 'bg-green-800 dark:bg-green-900'
}>
  <Text className="text-white">
    {isFasting ? 'Liver Detoxing' : 'Feast Window Open'}
  </Text>
</Box>
```

## Custom Theme Tokens

### In gluestack-ui-provider config
```javascript
export const config = {
  light: vars({
    '--color-primary-500': '#3B82F6',
    '--color-background-0': '#FFFFFF',
    '--color-success-500': '#22C55E',
  }),
  dark: vars({
    '--color-primary-500': '#60A5FA',
    '--color-background-0': '#0F172A',
    '--color-success-500': '#4ADE80',
  }),
};
```

## Pressable for Custom Touch Areas
```tsx
import { Pressable } from '@/components/ui/pressable';

<Pressable
  onPress={handlePress}
  className="p-4 bg-primary-500 active:bg-primary-600 rounded-lg"
>
  <Text className="text-white">Press Me</Text>
</Pressable>
```

## Center Component
```tsx
import { Center } from '@/components/ui/center';

<Center className="flex-1">
  <Text>Centered content</Text>
</Center>
```

## Component Import Pattern
```tsx
// Always import from @/components/ui/
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
```

## Tips

1. **Always use className** for styling (NativeWind/Tailwind)
2. **Components are copy-paste** - customize in @/components/ui/
3. **Dark mode works** with `dark:` prefix classes
4. **Sizes**: Most components accept `size="sm" | "md" | "lg"`
5. **Actions**: Buttons use `action="primary" | "secondary" | "positive" | "negative"`
