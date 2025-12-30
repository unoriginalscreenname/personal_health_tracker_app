import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries } from '@/db';
import { FoodForm, type FoodFormData } from '@/components/app/FoodForm';

export default function CustomFoodScreen() {
  const router = useRouter();
  const { date, entryId } = useLocalSearchParams<{ date?: string; entryId?: string }>();

  const { createEntry, addCustomItemToEntry, getToday } = useMealEntries();

  // Use provided date or default to today
  const targetDate = date || getToday();

  const handleSave = useCallback(async (data: FoodFormData) => {
    let targetEntryId: number;

    // Use existing entry or create new one
    if (entryId) {
      targetEntryId = parseInt(entryId, 10);
    } else {
      targetEntryId = await createEntry(undefined, targetDate);
    }

    // Add the custom food item
    await addCustomItemToEntry(
      targetEntryId,
      data.name,
      data.protein,
      data.calories,
      1,
      data.description ?? null
    );

    router.back();
  }, [entryId, targetDate, createEntry, addCustomItemToEntry, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </Pressable>
          <Text style={styles.title}>Add Custom Food</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <FoodForm onSave={handleSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
});
