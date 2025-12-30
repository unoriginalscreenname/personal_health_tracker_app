import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { DatabaseProvider } from '@/db';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.primary },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="add-food" />
          <Stack.Screen name="custom-food" />
          <Stack.Screen name="entry/[id]" />
        </Stack>
      </View>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
