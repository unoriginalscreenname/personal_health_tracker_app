import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trash2, Calendar, Utensils } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries, useFoods, type MealEntry, type Food } from '@/db';

type TabType = 'entries' | 'foods';

// Format date string to display (e.g., "Dec 27, 2025")
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Check if date is today
function isToday(dateString: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
}

// Format ISO timestamp to display time
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function NutritionSettingsScreen() {
  const router = useRouter();
  const { getDaysWithEntries, getEntriesForDate, deleteEntriesForDate, deleteAllEntries, deleteEntry } = useMealEntries();
  const { getFoods } = useFoods();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('entries');
  const [days, setDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<MealEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);

  // Load days with entries
  const loadDays = useCallback(async () => {
    try {
      const daysData = await getDaysWithEntries();
      setDays(daysData);
    } catch (error) {
      console.error('Failed to load days:', error);
    }
  }, [getDaysWithEntries]);

  // Load entries for selected day
  const loadDayEntries = useCallback(async (date: string) => {
    try {
      const entries = await getEntriesForDate(date);
      setDayEntries(entries);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  }, [getEntriesForDate]);

  // Load foods list
  const loadFoods = useCallback(async () => {
    try {
      const foodsData = await getFoods();
      setFoods(foodsData);
    } catch (error) {
      console.error('Failed to load foods:', error);
    }
  }, [getFoods]);

  useEffect(() => {
    loadDays();
    loadFoods();
  }, [loadDays, loadFoods]);

  useEffect(() => {
    if (selectedDay) {
      loadDayEntries(selectedDay);
    }
  }, [selectedDay, loadDayEntries]);

  // Handle selecting a day
  const handleSelectDay = (date: string) => {
    setSelectedDay(date);
  };

  // Handle going back to day list
  const handleBackToDays = () => {
    setSelectedDay(null);
    setDayEntries([]);
  };

  // Handle deleting all entries for a day
  const handleDeleteDay = (date: string) => {
    Alert.alert(
      'Delete All Entries',
      `Delete all food entries for ${formatDate(date)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntriesForDate(date);
              if (selectedDay === date) {
                setSelectedDay(null);
                setDayEntries([]);
              }
              await loadDays();
            } catch (error) {
              console.error('Failed to delete entries:', error);
              Alert.alert('Error', 'Failed to delete entries');
            }
          },
        },
      ]
    );
  };

  // Handle deleting a single entry
  const handleDeleteEntry = (entry: MealEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete this entry from ${formatTime(entry.logged_at)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              if (selectedDay) {
                await loadDayEntries(selectedDay);
              }
              await loadDays();
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  // Handle reset all data
  const handleResetAll = () => {
    Alert.alert(
      'Reset All Food Data',
      'This will delete ALL food entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllEntries();
              setDays([]);
              setSelectedDay(null);
              setDayEntries([]);
            } catch (error) {
              console.error('Failed to reset data:', error);
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ]
    );
  };

  // Get header title based on state
  const getHeaderTitle = () => {
    if (selectedDay) return formatDate(selectedDay);
    return 'Food Settings';
  };

  // Handle back button
  const handleBack = () => {
    if (selectedDay) {
      handleBackToDays();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>{getHeaderTitle()}</Text>
        {selectedDay && (
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            onPress={() => handleDeleteDay(selectedDay)}
          >
            <Trash2 color={colors.accent.red} size={20} />
          </Pressable>
        )}
      </View>

      {/* Tab Bar - only show when not viewing a specific day */}
      {!selectedDay && (
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'entries' && styles.tabActive]}
            onPress={() => setActiveTab('entries')}
          >
            <Calendar
              color={activeTab === 'entries' ? colors.text.primary : colors.text.dim}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'entries' && styles.tabTextActive]}>
              Entries
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'foods' && styles.tabActive]}
            onPress={() => setActiveTab('foods')}
          >
            <Utensils
              color={activeTab === 'foods' ? colors.text.primary : colors.text.dim}
              size={18}
            />
            <Text style={[styles.tabText, activeTab === 'foods' && styles.tabTextActive]}>
              Foods
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!selectedDay && activeTab === 'entries' && (
          // Entries tab - Day list view
          <>
            {days.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar color={colors.text.dim} size={48} />
                <Text style={styles.emptyStateText}>No food data</Text>
                <Text style={styles.emptyStateSubtext}>Start logging to see entries here</Text>
              </View>
            ) : (
              <View style={styles.daysList}>
                {days.map((date) => (
                  <Pressable
                    key={date}
                    style={({ pressed }) => [styles.dayRow, pressed && styles.dayRowPressed]}
                    onPress={() => handleSelectDay(date)}
                  >
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayDate}>{formatDate(date)}</Text>
                      {isToday(date) && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Today</Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight color={colors.text.dim} size={20} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Reset button */}
            {days.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                onPress={handleResetAll}
              >
                <Trash2 color={colors.accent.red} size={18} />
                <Text style={styles.resetButtonText}>Reset all food data</Text>
              </Pressable>
            )}
          </>
        )}

        {!selectedDay && activeTab === 'foods' && (
          // Foods tab - List of food items
          <>
            {foods.length === 0 ? (
              <View style={styles.emptyState}>
                <Utensils color={colors.text.dim} size={48} />
                <Text style={styles.emptyStateText}>No food items</Text>
              </View>
            ) : (
              <View style={styles.foodsList}>
                {foods.map((food) => (
                  <View key={food.id} style={styles.foodRow}>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodItemName}>{food.name}</Text>
                      <Text style={styles.foodItemMacros}>
                        {food.protein}g protein · {food.calories} cal
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {selectedDay && (
          // Day detail view (timeline)
          <>
            {dayEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No entries</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {dayEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={({ pressed }) => [styles.timelineEntry, pressed && styles.timelineEntryPressed]}
                    onPress={() => router.push(`/nutrition/entry/${entry.id}`)}
                  >
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineTime}>{formatTime(entry.logged_at)}</Text>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.foodItems}>
                        {entry.items.map((item) => (
                          <View key={item.id} style={styles.foodChip}>
                            <Text style={styles.foodName}>{item.name}</Text>
                            <Text style={styles.foodProtein}>{Math.round(item.protein * item.quantity)}g</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.entryDeleteButton, pressed && styles.entryDeleteButtonPressed]}
                      onPress={() => handleDeleteEntry(entry)}
                    >
                      <Trash2 color={colors.text.dim} size={16} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </>
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
    fontWeight: '600',
    color: colors.text.primary,
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.text.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text.dim,
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
  daysList: {
    gap: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  dayRowPressed: {
    opacity: 0.7,
  },
  dayInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayDate: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  todayBadge: {
    backgroundColor: colors.accent.green + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  todayBadgeText: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.red + '40',
    borderRadius: borderRadius.md,
  },
  resetButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.red + '10',
  },
  resetButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.red,
  },
  // Timeline styles (copied from nutrition index)
  timeline: {
    gap: spacing.sm,
  },
  timelineEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineEntryPressed: {
    opacity: 0.7,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: spacing.md,
  },
  timelineTime: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginBottom: spacing.xs,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.background.tertiary,
    marginTop: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  foodItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  foodName: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  foodProtein: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
  entryDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  entryDeleteButtonPressed: {
    opacity: 0.7,
  },

  // Foods list
  foodsList: {
    gap: spacing.sm,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  foodItemMacros: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
});
