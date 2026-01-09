import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Plus, Check, PenLine, Clock, Zap } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFoods, useMealEntries, type Food, type RecentCustomItem } from '@/db';

type TabType = 'recent' | 'quick';

// Format time for display (e.g., "12:15 PM")
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AddFoodScreen() {
  const { date, entryId, justAddedName, justAddedItemId } = useLocalSearchParams<{
    date?: string;
    entryId?: string;
    justAddedName?: string;
    justAddedItemId?: string;
  }>();
  const router = useRouter();

  // Database hooks
  const { getFoods } = useFoods();
  const { createEntry, addFoodToEntry, addCustomItemToEntry, removeItem, getRecentCustomItems, getToday, getEntry, updateEntryTime } = useMealEntries();

  // Use provided date or default to today
  const targetDate = date || getToday();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [foods, setFoods] = useState<Food[]>([]);
  const [recentItems, setRecentItems] = useState<RecentCustomItem[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(null);
  // Map food ID to entry item ID for removal (quick add)
  const [addedFoods, setAddedFoods] = useState<Map<number, number>>(new Map());
  // Map recent item name to entry item ID for removal
  const [addedRecentItems, setAddedRecentItems] = useState<Map<string, number>>(new Map());

  // Session time state
  const [sessionTime, setSessionTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');

  // Track if we've processed the justAdded params (to avoid re-processing on tab change)
  const processedJustAddedRef = useRef<string | null>(null);

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

  // Load foods and recent items from database - use useFocusEffect to reload on navigation back
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const [dbFoods, dbRecentItems] = await Promise.all([
            getFoods(),
            getRecentCustomItems(),
          ]);
          setFoods(dbFoods);
          setRecentItems(dbRecentItems);
          // Default to quick add if no recent items (only on initial load)
          if (dbRecentItems.length === 0 && !justAddedName) {
            handleTabChange('quick');
          }
        } catch (error) {
          console.error('Failed to load foods:', error);
        }
      };
      loadData();
    }, [getFoods, getRecentCustomItems, handleTabChange, justAddedName])
  );

  // Initialize currentEntryId, sessionTime, and checked state from route params (when returning from custom-food)
  useEffect(() => {
    if (entryId && !currentEntryId) {
      const parsedEntryId = parseInt(entryId, 10);
      setCurrentEntryId(parsedEntryId);

      // Load entry to get its logged_at time and existing items
      const loadEntryData = async () => {
        try {
          const entry = await getEntry(parsedEntryId);
          if (entry) {
            setSessionTime(new Date(entry.logged_at));

            // Reconstruct checked state from existing entry items
            const foodsMap = new Map<number, number>();
            const recentMap = new Map<string, number>();

            for (const item of entry.items) {
              if (item.food_id !== null) {
                // Quick add food item
                foodsMap.set(item.food_id, item.id);
              } else {
                // Custom/recent item
                recentMap.set(item.name, item.id);
              }
            }

            setAddedFoods(foodsMap);
            setAddedRecentItems(recentMap);
          }
        } catch (error) {
          console.error('Failed to load entry data:', error);
        }
      };
      loadEntryData();
    }
  }, [entryId, currentEntryId, getEntry]);

  // Mark just-added item in addedRecentItems and switch to Recent tab
  useEffect(() => {
    if (justAddedName && justAddedItemId && processedJustAddedRef.current !== justAddedItemId) {
      processedJustAddedRef.current = justAddedItemId;
      setAddedRecentItems(prev => new Map(prev).set(justAddedName, parseInt(justAddedItemId, 10)));
      handleTabChange('recent');
    }
  }, [justAddedName, justAddedItemId, handleTabChange]);

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
        let targetEntryId = currentEntryId;

        // Create entry if this is the first item
        if (!targetEntryId) {
          targetEntryId = await createEntry(undefined, targetDate);
          setCurrentEntryId(targetEntryId);
          setSessionTime(new Date()); // Set session time on first add
        }

        // Add food to entry and store the item ID
        const itemId = await addFoodToEntry(targetEntryId, food);
        setAddedFoods(prev => new Map(prev).set(food.id, itemId));
      }
    } catch (error) {
      console.error('Failed to toggle food:', error);
      Alert.alert('Error', 'Failed to update food');
    }
  }, [currentEntryId, targetDate, createEntry, addFoodToEntry, removeItem, addedFoods]);

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
        let targetEntryId = currentEntryId;

        // Create entry if this is the first item
        if (!targetEntryId) {
          targetEntryId = await createEntry(undefined, targetDate);
          setCurrentEntryId(targetEntryId);
          setSessionTime(new Date()); // Set session time on first add
        }

        // Add as custom item and store the item ID
        const itemId = await addCustomItemToEntry(targetEntryId, item.name, item.protein, item.calories);
        setAddedRecentItems(prev => new Map(prev).set(item.name, itemId));
      }
    } catch (error) {
      console.error('Failed to toggle recent item:', error);
      Alert.alert('Error', 'Failed to update food');
    }
  }, [currentEntryId, targetDate, createEntry, addCustomItemToEntry, removeItem, addedRecentItems]);

  // Navigate to custom food screen (now at root level)
  const handleAddCustomFood = useCallback(() => {
    const params: { date: string; entryId?: string } = { date: targetDate };
    if (currentEntryId) {
      params.entryId = currentEntryId.toString();
    }
    router.push({ pathname: '/custom-food', params });
  }, [targetDate, currentEntryId, router]);

  // Open time picker with current session time
  const handleOpenTimePicker = useCallback(() => {
    if (!sessionTime) return;
    let hours = sessionTime.getHours();
    const minutes = sessionTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    setSelectedHour(hours);
    setSelectedMinute(minutes);
    setSelectedAmPm(ampm);
    setShowTimePicker(true);
  }, [sessionTime]);

  // Save the new time
  const handleSaveTime = useCallback(async () => {
    if (!sessionTime || !currentEntryId) return;
    try {
      const newTime = new Date(sessionTime);
      let hours = selectedHour;
      if (selectedAmPm === 'PM' && hours !== 12) hours += 12;
      if (selectedAmPm === 'AM' && hours === 12) hours = 0;
      newTime.setHours(hours, selectedMinute, 0, 0);
      await updateEntryTime(currentEntryId, newTime);
      setSessionTime(newTime);
      setShowTimePicker(false);
    } catch (error) {
      console.error('Failed to update time:', error);
      Alert.alert('Error', 'Failed to update time');
    }
  }, [sessionTime, currentEntryId, selectedHour, selectedMinute, selectedAmPm, updateEntryTime]);

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
        {sessionTime && (
          <Pressable
            style={({ pressed }) => [styles.timeButton, pressed && styles.timeButtonPressed]}
            onPress={handleOpenTimePicker}
          >
            <Clock color={colors.text.dim} size={14} />
            <Text style={styles.timeText}>{formatTime(sessionTime)}</Text>
          </Pressable>
        )}
        {totalAdded > 0 && (
          <Pressable
            style={({ pressed }) => [styles.addedBadge, pressed && styles.addedBadgePressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.addedBadgeText}>{totalAdded} added</Text>
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

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.timePickerContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.timePickerTitle}>Set Time</Text>

            <View style={styles.timePickerRow}>
              {/* Hour */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedHour(h => h === 12 ? 1 : h + 1)}
                >
                  <Text style={styles.timePickerArrowText}>▲</Text>
                </Pressable>
                <Text style={styles.timePickerValue}>{selectedHour}</Text>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedHour(h => h === 1 ? 12 : h - 1)}
                >
                  <Text style={styles.timePickerArrowText}>▼</Text>
                </Pressable>
              </View>

              <Text style={styles.timePickerColon}>:</Text>

              {/* Minute */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedMinute(m => (m + 5) % 60)}
                >
                  <Text style={styles.timePickerArrowText}>▲</Text>
                </Pressable>
                <Text style={styles.timePickerValue}>{String(selectedMinute).padStart(2, '0')}</Text>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedMinute(m => (m - 5 + 60) % 60)}
                >
                  <Text style={styles.timePickerArrowText}>▼</Text>
                </Pressable>
              </View>

              {/* AM/PM */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={[styles.amPmButton, selectedAmPm === 'AM' && styles.amPmButtonActive]}
                  onPress={() => setSelectedAmPm('AM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'AM' && styles.amPmTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.amPmButton, selectedAmPm === 'PM' && styles.amPmButtonActive]}
                  onPress={() => setSelectedAmPm('PM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'PM' && styles.amPmTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <Pressable
                style={styles.timePickerCancel}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.timePickerSave}
                onPress={handleSaveTime}
              >
                <Text style={styles.timePickerSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  // Time button styles
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  timeButtonPressed: {
    opacity: 0.7,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
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
  // Time picker modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: 280,
  },
  timePickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  timePickerColumn: {
    alignItems: 'center',
  },
  timePickerArrow: {
    padding: spacing.sm,
  },
  timePickerArrowText: {
    fontSize: fontSize.lg,
    color: colors.text.muted,
  },
  timePickerValue: {
    fontSize: fontSize.xxl,
    fontWeight: '200',
    color: colors.text.primary,
    minWidth: 50,
    textAlign: 'center',
  },
  timePickerColon: {
    fontSize: fontSize.xxl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  amPmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  amPmButtonActive: {
    backgroundColor: colors.accent.green + '30',
  },
  amPmText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  amPmTextActive: {
    color: colors.accent.green,
    fontWeight: '600',
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timePickerCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  timePickerSave: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.green,
    alignItems: 'center',
  },
  timePickerSaveText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
