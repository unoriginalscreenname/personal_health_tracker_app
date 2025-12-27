import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check, PenLine } from 'lucide-react-native';
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
  const { createEntry, addFoodToEntry } = useMealEntries();

  // State
  const [foods, setFoods] = useState<Food[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  const [addedFoodIds, setAddedFoodIds] = useState<Set<number>>(new Set());

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

  // Navigate to custom food screen
  const handleAddCustomFood = useCallback(() => {
    const params: { mealType: string; entryId?: string } = { mealType: meal };
    if (currentEntryId) {
      params.entryId = currentEntryId.toString();
    }
    router.push({ pathname: '/nutrition/custom-food', params });
  }, [meal, currentEntryId, router]);

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
        {/* Add Custom Food Button */}
        <Pressable
          style={({ pressed }) => [styles.customFoodButton, pressed && styles.customFoodButtonPressed]}
          onPress={handleAddCustomFood}
        >
          <PenLine color={colors.text.secondary} size={18} />
          <Text style={styles.customFoodButtonText}>Add custom food...</Text>
        </Pressable>

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
  customFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  customFoodButtonPressed: {
    opacity: 0.7,
  },
  customFoodButtonText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
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
