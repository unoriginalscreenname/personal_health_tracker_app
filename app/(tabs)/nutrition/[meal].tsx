import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFoods, useMealEntries, type Food } from '@/db';

const mealInfo: Record<string, { name: string; time: string }> = {
  opener: { name: 'The Opener', time: '12 PM' },
  bridge: { name: 'The Bridge', time: '3 PM' },
  closer: { name: 'The Closer', time: '6 PM' },
};

export default function MealDetailScreen() {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const router = useRouter();
  const info = mealInfo[meal] || { name: 'Meal', time: '' };

  // Database hooks
  const { getFoods } = useFoods();
  const { createEntry, addFoodToEntry, addCustomItemToEntry } = useMealEntries();

  // State
  const [foods, setFoods] = useState<Food[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [addedFoodIds, setAddedFoodIds] = useState<Set<number>>(new Set());
  const [customFood, setCustomFood] = useState('');

  // Load foods from database
  useEffect(() => {
    const loadFoods = async () => {
      try {
        const dbFoods = await getFoods();
        setFoods(dbFoods);
      } catch (error) {
        console.error('Failed to load foods:', error);
      }
    };
    loadFoods();
  }, [getFoods]);

  // Handle adding a food from the quick add list
  const handleAddFood = useCallback(async (food: Food) => {
    try {
      let entryId = currentEntryId;

      // Create entry if this is the first item
      if (!entryId) {
        entryId = await createEntry(meal);
        setCurrentEntryId(entryId);
      }

      // Add food to entry
      await addFoodToEntry(entryId, food);
      setAddedFoodIds(prev => new Set(prev).add(food.id));
    } catch (error) {
      console.error('Failed to add food:', error);
      Alert.alert('Error', 'Failed to add food');
    }
  }, [currentEntryId, meal, createEntry, addFoodToEntry]);

  // Handle adding custom food
  const handleAddCustomFood = useCallback(async () => {
    const input = customFood.trim();
    if (!input) return;

    // Parse input: "Food name 25g" or "Food name 25g 200cal"
    // Simple regex to extract protein and optional calories
    const proteinMatch = input.match(/(\d+)\s*g/i);
    const caloriesMatch = input.match(/(\d+)\s*cal/i);

    const protein = proteinMatch ? parseInt(proteinMatch[1], 10) : 0;
    const calories = caloriesMatch ? parseInt(caloriesMatch[1], 10) : 0;

    // Remove macros from name
    let name = input
      .replace(/\d+\s*g/i, '')
      .replace(/\d+\s*cal/i, '')
      .trim();

    if (!name) {
      Alert.alert('Invalid input', 'Please enter a food name');
      return;
    }

    try {
      let entryId = currentEntryId;

      if (!entryId) {
        entryId = await createEntry(meal);
        setCurrentEntryId(entryId);
      }

      await addCustomItemToEntry(entryId, name, protein, calories);
      setCustomFood('');
    } catch (error) {
      console.error('Failed to add custom food:', error);
      Alert.alert('Error', 'Failed to add custom food');
    }
  }, [customFood, currentEntryId, meal, createEntry, addCustomItemToEntry]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{info.name}</Text>
          <Text style={styles.time}>{info.time}</Text>
        </View>
        {addedFoodIds.size > 0 && (
          <View style={styles.addedBadge}>
            <Text style={styles.addedBadgeText}>{addedFoodIds.size} added</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add Custom Food Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Custom food... (e.g., Steak 40g 300cal)"
            placeholderTextColor={colors.text.dim}
            value={customFood}
            onChangeText={setCustomFood}
            onSubmitEditing={handleAddCustomFood}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
              !customFood.trim() && styles.addButtonDisabled
            ]}
            onPress={handleAddCustomFood}
            disabled={!customFood.trim()}
          >
            <Plus color={colors.text.primary} size={20} />
          </Pressable>
        </View>

        {/* Quick Add Foods */}
        <Text style={styles.sectionLabel}>QUICK ADD</Text>
        <View style={styles.foodList}>
          {foods.map((food) => {
            const isAdded = addedFoodIds.has(food.id);
            return (
              <Pressable
                key={food.id}
                style={({ pressed }) => [
                  styles.foodItem,
                  isAdded && styles.foodItemAdded,
                  pressed && styles.foodItemPressed
                ]}
                onPress={() => handleAddFood(food)}
              >
                <View style={styles.foodInfo}>
                  <Text style={[styles.foodName, isAdded && styles.foodNameAdded]}>
                    {food.name}
                  </Text>
                  <Text style={styles.foodMacros}>
                    {food.protein}g protein · {food.calories} cal
                  </Text>
                </View>
                <View style={[styles.foodAdd, isAdded && styles.foodAddActive]}>
                  {isAdded ? (
                    <Check color={colors.text.primary} size={20} />
                  ) : (
                    <Plus color={colors.accent.green} size={20} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
  },
  time: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
  addedBadge: {
    backgroundColor: colors.accent.green + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  addedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  foodList: {
    gap: spacing.sm,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  foodItemAdded: {
    borderWidth: 1,
    borderColor: colors.accent.green + '50',
  },
  foodItemPressed: {
    opacity: 0.7,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  foodNameAdded: {
    color: colors.accent.green,
  },
  foodMacros: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  foodAdd: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodAddActive: {
    backgroundColor: colors.accent.green,
  },
});
