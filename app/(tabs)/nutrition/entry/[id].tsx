import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, X } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFoods, useMealEntries, type Food, type MealEntry } from '@/db';

// Format ISO timestamp to display time (e.g., "12:15 PM")
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const entryId = parseInt(id, 10);

  // Database hooks
  const { getFoods } = useFoods();
  const { getEntry, addFoodToEntry, addCustomItemToEntry, removeItem, deleteEntry } = useMealEntries();

  // State
  const [entry, setEntry] = useState<MealEntry | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [customFood, setCustomFood] = useState('');

  // Load entry and foods
  const loadData = useCallback(async () => {
    try {
      const [entryData, foodsData] = await Promise.all([
        getEntry(entryId),
        getFoods(),
      ]);
      setEntry(entryData);
      setFoods(foodsData);
    } catch (error) {
      console.error('Failed to load entry:', error);
    }
  }, [entryId, getEntry, getFoods]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle adding a food from the quick add list
  const handleAddFood = useCallback(async (food: Food) => {
    try {
      await addFoodToEntry(entryId, food);
      await loadData();
      setShowAddFood(false);
    } catch (error) {
      console.error('Failed to add food:', error);
      Alert.alert('Error', 'Failed to add food');
    }
  }, [entryId, addFoodToEntry, loadData]);

  // Handle adding custom food
  const handleAddCustomFood = useCallback(async () => {
    const input = customFood.trim();
    if (!input) return;

    // Parse input: "Food name 25g" or "Food name 25g 200cal"
    const proteinMatch = input.match(/(\d+)\s*g/i);
    const caloriesMatch = input.match(/(\d+)\s*cal/i);

    const protein = proteinMatch ? parseInt(proteinMatch[1], 10) : 0;
    const calories = caloriesMatch ? parseInt(caloriesMatch[1], 10) : 0;

    let name = input
      .replace(/\d+\s*g/i, '')
      .replace(/\d+\s*cal/i, '')
      .trim();

    if (!name) {
      Alert.alert('Invalid input', 'Please enter a food name');
      return;
    }

    try {
      await addCustomItemToEntry(entryId, name, protein, calories);
      setCustomFood('');
      await loadData();
      setShowAddFood(false);
    } catch (error) {
      console.error('Failed to add custom food:', error);
      Alert.alert('Error', 'Failed to add custom food');
    }
  }, [customFood, entryId, addCustomItemToEntry, loadData]);

  // Handle removing an item
  const handleRemoveItem = useCallback(async (itemId: number, itemName: string) => {
    Alert.alert(
      'Remove Item',
      `Remove "${itemName}" from this entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem(itemId);
              await loadData();
            } catch (error) {
              console.error('Failed to remove item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  }, [removeItem, loadData]);

  // Handle deleting the entire entry
  const handleDeleteEntry = useCallback(() => {
    Alert.alert(
      'Delete Entry',
      'Delete this entire meal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entryId);
              router.back();
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  }, [entryId, deleteEntry, router]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </Pressable>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalProtein = entry.items.reduce((sum, item) => sum + (item.protein * item.quantity), 0);
  const totalCalories = entry.items.reduce((sum, item) => sum + (item.calories * item.quantity), 0);

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
          <Text style={styles.title}>{formatTime(entry.logged_at)}</Text>
          {entry.meal_type && (
            <Text style={styles.mealType}>{entry.meal_type}</Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          onPress={handleDeleteEntry}
        >
          <Trash2 color={colors.accent.red} size={20} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Totals */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalProtein}>{Math.round(totalProtein)}g protein</Text>
          <Text style={styles.totalCalories}>{totalCalories} cal</Text>
        </View>

        {/* Items */}
        <View style={styles.itemsList}>
          {entry.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMacros}>
                  {Math.round(item.protein * item.quantity)}g · {Math.round(item.calories * item.quantity)} cal
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                onPress={() => handleRemoveItem(item.id, item.name)}
              >
                <X color={colors.text.dim} size={18} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Add Food Section */}
        {!showAddFood ? (
          <Pressable
            style={({ pressed }) => [styles.addFoodButton, pressed && styles.addFoodButtonPressed]}
            onPress={() => setShowAddFood(true)}
          >
            <Plus color={colors.accent.green} size={18} />
            <Text style={styles.addFoodButtonText}>Add food to this entry</Text>
          </Pressable>
        ) : (
          <View style={styles.addFoodSection}>
            <View style={styles.addFoodHeader}>
              <Text style={styles.sectionLabel}>ADD FOOD</Text>
              <Pressable onPress={() => setShowAddFood(false)}>
                <X color={colors.text.dim} size={20} />
              </Pressable>
            </View>

            {/* Custom Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Custom... (e.g., Steak 40g 300cal)"
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
            <View style={styles.quickAddList}>
              {foods.map((food) => (
                <Pressable
                  key={food.id}
                  style={({ pressed }) => [styles.quickAddItem, pressed && styles.quickAddItemPressed]}
                  onPress={() => handleAddFood(food)}
                >
                  <Text style={styles.quickAddName}>{food.name}</Text>
                  <Text style={styles.quickAddMacros}>{food.protein}g</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
  mealType: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
    textTransform: 'capitalize',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.red + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  totalProtein: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.green,
  },
  totalCalories: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
  itemsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemMacros: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  addFoodButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.green + '10',
  },
  addFoodButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
  },
  addFoodSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  addFoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
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
  quickAddList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickAddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  quickAddItemPressed: {
    opacity: 0.7,
  },
  quickAddName: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  quickAddMacros: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
});
