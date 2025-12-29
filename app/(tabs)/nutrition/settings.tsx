import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Trash2, Calendar, Utensils } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries, useFoods, type MealEntry, type Food } from '@/db';
import { FoodTimeline } from '@/components/app/FoodTimeline';

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

// Check if date is today (using local timezone)
function isToday(dateString: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateString === today;
}

export default function NutritionSettingsScreen() {
  const router = useRouter();
  const { getDaysWithEntries, deleteEntriesForDate, deleteAllEntries, deleteEntry } = useMealEntries();
  const { getFoods } = useFoods();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('entries');
  const [days, setDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [timelineKey, setTimelineKey] = useState(0);

  // Load days with entries
  const loadDays = useCallback(async () => {
    try {
      const daysData = await getDaysWithEntries();
      setDays(daysData);
    } catch (error) {
      console.error('Failed to load days:', error);
    }
  }, [getDaysWithEntries]);

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

  // Handle selecting a day
  const handleSelectDay = (date: string) => {
    setSelectedDay(date);
  };

  // Handle going back to day list
  const handleBackToDays = () => {
    setSelectedDay(null);
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
    const entryTime = new Date(entry.logged_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    Alert.alert(
      'Delete Entry',
      `Delete this entry from ${entryTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              setTimelineKey(k => k + 1); // Refresh timeline
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <FoodTimeline key={timelineKey} date={selectedDay} onDeleteEntry={handleDeleteEntry} />
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
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
