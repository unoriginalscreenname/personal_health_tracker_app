import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function NutritionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[meal]" />
      <Stack.Screen name="entry/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
