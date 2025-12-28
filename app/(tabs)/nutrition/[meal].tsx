import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check, PenLine, Clock, Zap } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFoods, useMealEntries, type Food, type RecentCustomItem } from '@/db';

type TabType = 'recent' | 'quick';

export default function MealDetailScreen() {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const router = useRouter();

  // Database hooks
  const { getFoods } = useFoods();
  const { createEntry, addFoodToEntry, addCustomItemToEntry, removeItem, getRecentCustomItems } = useMealEntries();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [foods, setFoods] = useState<Food[]>([]);
  const [recentItems, setRecentItems] = useState<RecentCustomItem[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  // Map food ID to entry item ID for removal (quick add)
  const [addedFoods, setAddedFoods] = useState<Map<number, number>>(new Map());
  // Map recent item name to entry item ID for removal
  const [addedRecentItems, setAddedRecentItems] = useState<Map<string, number>>(new Map());

  // Animated slide indicator
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Handle tab change with animation
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'recent' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [slideAnim]);

  // Load foods and recent items from database
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dbFoods, dbRecentItems] = await Promise.all([
          getFoods(),
          getRecentCustomItems(),
        ]);
        setFoods(dbFoods);
        setRecentItems(dbRecentItems);
        // Default to quick add if no recent items
        if (dbRecentItems.length === 0) {
          handleTabChange('quick');
        }
      } catch (error) {
        console.error('Failed to load foods:', error);
      }
    };
    loadData();
  }, [getFoods, getRecentCustomItems, handleTabChange]);

  // Handle toggling a food from the quick add list
  const handleToggleFood = useCallback(async (food: Food) => {
    try {
      const existingItemId = addedFoods.get(food.id);

      if (existingItemId) {
        // Food is already added - remove it
        await removeItem(existingItemId);
        setAddedFoods(prev => {
          const newMap = new Map(prev);
          newMap.delete(food.id);
          return newMap;
        });
      } else {
        // Food not added - add it
        let entryId = currentEntryId;

        // Create entry if this is the first item
        if (!entryId) {
          entryId = await createEntry(meal);
          setCurrentEntryId(entryId);
        }

        // Add food to entry and store the item ID
        const itemId = await addFoodToEntry(entryId, food);
        setAddedFoods(prev => new Map(prev).set(food.id, itemId));
      }
    } catch (error) {
      console.error('Failed to toggle food:', error);
      Alert.alert('Error', 'Failed to update food');
    }
  }, [currentEntryId, meal, createEntry, addFoodToEntry, removeItem, addedFoods]);

  // Handle toggling a recent custom item
  const handleToggleRecentItem = useCallback(async (item: RecentCustomItem) => {
    try {
      const existingItemId = addedRecentItems.get(item.name);

      if (existingItemId) {
        // Item is already added - remove it
        await removeItem(existingItemId);
        setAddedRecentItems(prev => {
          const newMap = new Map(prev);
          newMap.delete(item.name);
          return newMap;
        });
      } else {
        // Item not added - add it
        let entryId = currentEntryId;

        // Create entry if this is the first item
        if (!entryId) {
          entryId = await createEntry(meal);
          setCurrentEntryId(entryId);
        }

        // Add as custom item and store the item ID
        const itemId = await addCustomItemToEntry(entryId, item.name, item.protein, item.calories);
        setAddedRecentItems(prev => new Map(prev).set(item.name, itemId));
      }
    } catch (error) {
      console.error('Failed to toggle recent item:', error);
      Alert.alert('Error', 'Failed to update food');
    }
  }, [currentEntryId, meal, createEntry, addCustomItemToEntry, removeItem, addedRecentItems]);

  // Navigate to custom food screen
  const handleAddCustomFood = useCallback(() => {
    const params: { mealType: string; entryId?: string } = { mealType: meal };
    if (currentEntryId) {
      params.entryId = currentEntryId.toString();
    }
    router.push({ pathname: '/nutrition/custom-food', params });
  }, [meal, currentEntryId, router]);

  // Total added count
  const totalAdded = addedFoods.size + addedRecentItems.size;

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
        <PenLine color={colors.text.primary} size={24} />
        <Text style={styles.title}>Log Food</Text>
        {totalAdded > 0 && (
          <Pressable
            style={({ pressed }) => [styles.addedBadge, pressed && styles.addedBadgePressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.addedBadgeText}>{totalAdded} added ✓</Text>
          </Pressable>
        )}
      </View>

      {/* Add Custom Food Button */}
      <Pressable
        style={({ pressed }) => [styles.customFoodButton, pressed && styles.customFoodButtonPressed]}
        onPress={handleAddCustomFood}
      >
        <PenLine color={colors.accent.green} size={18} />
        <Text style={styles.customFoodButtonText}>Add custom food...</Text>
      </Pressable>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <View style={styles.tabButtons}>
          <Pressable
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
            onPress={() => handleTabChange('recent')}
          >
            <Clock color={activeTab === 'recent' ? colors.accent.green : colors.text.muted} size={16} />
            <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>Recent</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
            onPress={() => handleTabChange('quick')}
          >
            <Zap color={activeTab === 'quick' ? colors.accent.green : colors.text.muted} size={16} />
            <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>Quick Add</Text>
          </Pressable>
        </View>
        {/* Sliding indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 150], // Half of container width
                }),
              }],
            },
          ]}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Recent Items Tab */}
        {activeTab === 'recent' && (
          <View style={styles.foodList}>
            {recentItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock color={colors.text.dim} size={32} />
                <Text style={styles.emptyText}>No recent custom foods</Text>
                <Text style={styles.emptySubtext}>Add a custom food to see it here</Text>
              </View>
            ) : (
              recentItems.map((item, index) => {
                const isAdded = addedRecentItems.has(item.name);
                return (
                  <Pressable
                    key={`${item.name}-${index}`}
                    style={({ pressed }) => [
                      styles.foodItem,
                      isAdded && styles.foodItemAdded,
                      pressed && styles.foodItemPressed
                    ]}
                    onPress={() => handleToggleRecentItem(item)}
                  >
                    <View style={styles.foodInfo}>
                      <Text style={[styles.foodName, isAdded && styles.foodNameAdded]}>
                        {item.name}
                      </Text>
                      <Text style={styles.foodMacros}>
                        {item.protein}g protein · {item.calories} cal
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
              })
            )}
          </View>
        )}

        {/* Quick Add Foods Tab */}
        {activeTab === 'quick' && (
          <View style={styles.foodList}>
            {foods.map((food) => {
              const isAdded = addedFoods.has(food.id);
              return (
                <Pressable
                  key={food.id}
                  style={({ pressed }) => [
                    styles.foodItem,
                    isAdded && styles.foodItemAdded,
                    pressed && styles.foodItemPressed
                  ]}
                  onPress={() => handleToggleFood(food)}
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
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  addedBadge: {
    backgroundColor: colors.accent.green + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  addedBadgePressed: {
    opacity: 0.7,
  },
  addedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
  // Tab styles
  tabContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tabButtons: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.accent.green,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 2,
    backgroundColor: colors.accent.green,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
    paddingTop: 0,
  },
  customFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  customFoodButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.green + '10',
  },
  customFoodButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
  },
  foodList: {
    gap: spacing.sm,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
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
