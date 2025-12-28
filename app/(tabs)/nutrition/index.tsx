import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Sunrise, Sun, Sunset, PenLine, Settings, Utensils } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries, type MealEntry } from '@/db';

const meals = [
  { id: 'opener', name: 'Opener', time: '12 PM', icon: Sunrise, color: colors.accent.orange },
  { id: 'bridge', name: 'Bridge', time: '3 PM', icon: Sun, color: colors.accent.blue },
  { id: 'closer', name: 'Closer', time: '6 PM', icon: Sunset, color: colors.accent.purple },
];

const TARGET_PROTEIN = 160;

// Format ISO timestamp to display time (e.g., "12:15 PM")
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function NutritionScreen() {
  const router = useRouter();
  const { getEntriesForDate, getTotalsForDate, getToday } = useMealEntries();

  // State
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const today = getToday();
        const [entriesData, totalsData] = await Promise.all([
          getEntriesForDate(today),
          getTotalsForDate(today),
        ]);
        setEntries(entriesData);
        setTotals(totalsData);
      };
      loadData();
    }, [getEntriesForDate, getTotalsForDate, getToday])
  );

  const progressPercent = Math.min((totals.protein / TARGET_PROTEIN) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with settings */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Utensils color={colors.text.primary} size={24} />
            <Text style={styles.title}>Food</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            onPress={() => router.push('/nutrition/settings')}
          >
            <Settings color={colors.text.dim} size={20} />
          </Pressable>
        </View>

        {/* Today's Stats */}
        <View style={styles.statsCard}>
          <View style={styles.proteinRow}>
            <Text style={styles.proteinValue}>{Math.round(totals.protein)}</Text>
            <Text style={styles.proteinTarget}>/ {TARGET_PROTEIN}g</Text>
            <Text style={styles.calsValue}>{totals.calories.toLocaleString()} cal</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* TODO: Remove meal grid code entirely - hidden for now */}
        {/* Meal Grid - HIDDEN
        <View style={styles.mealGrid}>
          {meals.map((meal) => {
            const IconComponent = meal.icon;
            return (
              <Pressable
                key={meal.id}
                style={({ pressed }) => [
                  styles.mealCard,
                  pressed && styles.mealCardPressed
                ]}
                onPress={() => router.push(`/nutrition/${meal.id}`)}
              >
                <IconComponent color={meal.color} size={32} style={{ marginBottom: spacing.sm }} />
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </Pressable>
            );
          })}
        </View>
        */}

        {/* Log Food CTA */}
        <Pressable
          style={({ pressed }) => [styles.logButton, pressed && styles.logButtonPressed]}
          onPress={() => router.push('/nutrition/opener')}
        >
          <PenLine color={colors.accent.green} size={18} />
          <Text style={styles.logButtonText}>Log food</Text>
        </Pressable>

        {/* Timeline */}
        {entries.length > 0 && (
          <View style={styles.timeline}>
            {entries.map((entry) => (
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
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No food logged today</Text>
            <Text style={styles.emptyStateSubtext}>Tap "Log food" to start tracking</Text>
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
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonPressed: {
    opacity: 0.5,
    backgroundColor: colors.background.secondary,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  proteinRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  proteinValue: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.accent.green,
    fontVariant: ['tabular-nums'],
  },
  proteinTarget: {
    fontSize: 28,
    fontWeight: '200',
    color: colors.text.dim,
    fontVariant: ['tabular-nums'],
  },
  calsValue: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginLeft: 'auto',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.full,
  },
  mealGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  mealCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  mealName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  mealTime: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
  },

  // Log Button
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  logButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.green + '10',
  },
  logButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
  },

  // Timeline
  timeline: {
    marginTop: spacing.xl,
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: spacing.md,
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

  // Empty state
  emptyState: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
});
