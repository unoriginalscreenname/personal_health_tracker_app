import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { colors, spacing, fontSize } from '@/constants/theme';
import { useFastingState } from '@/hooks/useFastingState';
import { useSupplements, useMealEntries, useDailyStats, type SupplementWithValue } from '@/db';
import { StreakBanner } from '@/components/app/StreakBanner';
import { FastingCard } from '@/components/app/FastingCard';
import { SittingModeCard } from '@/components/app/SittingModeCard';
import { NutritionCard } from '@/components/app/NutritionCard';
import { SupplementsCard } from '@/components/app/SupplementsCard';
import { WorkoutCard } from '@/components/app/WorkoutCard';

export default function CommandCenterScreen() {
  const router = useRouter();

  // Fasting state from hook
  const { isFasting, hours, minutes, progress } = useFastingState();

  // Database hooks
  const { getSupplementsForDate, toggleSupplement, setSupplementValue, getToday } = useSupplements();
  const { getTotalsForDate } = useMealEntries();
  const { initializeDay, getCombinedStreak, getStatsForRange } = useDailyStats();

  // State
  const [supplements, setSupplements] = useState<SupplementWithValue[]>([]);
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);

  // Mock data - will be replaced with real state
  const isSitting = false;
  const sittingMinutes = 23;

  // Workout data
  const workedOutToday = false;
  const weeklyWorkouts = 3;
  const weeklyTarget = 4;

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // Initialize day (handles day rollover, backfilling gaps, etc.)
          await initializeDay();

          const today = getToday();
          const [supps, tots, streakData] = await Promise.all([
            getSupplementsForDate(today),
            getTotalsForDate(today),
            getCombinedStreak(),
          ]);
          setSupplements(supps);
          setTotals(tots);
          // Streak = consecutive successful finalized days + 1 if today is also complete
          setStreakDays(streakData.baseStreak + (streakData.todayComplete ? 1 : 0));

          // Calculate current day (days since first entry in daily_stats)
          // Get all stats from a long time ago to today
          const stats = await getStatsForRange('2020-01-01', today);
          setCurrentDay(Math.max(1, stats.length));
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }, [initializeDay, getSupplementsForDate, getTotalsForDate, getToday, getCombinedStreak, getStatsForRange])
  );

  // Handle supplement tap (for pills)
  const handleSupplementPress = useCallback(async (supp: SupplementWithValue) => {
    const today = getToday();
    await toggleSupplement(supp.id, today);
    const [updated, streakData] = await Promise.all([
      getSupplementsForDate(today),
      getCombinedStreak(),
    ]);
    setSupplements(updated);
    setStreakDays(streakData.baseStreak + (streakData.todayComplete ? 1 : 0));
  }, [getToday, toggleSupplement, getSupplementsForDate, getCombinedStreak]);

  // Handle water dot tap - clicking a dot sets value to that level, or unselects if already at that level
  const handleWaterDotPress = useCallback(async (supp: SupplementWithValue, dotIndex: number) => {
    const today = getToday();
    const targetValue = dotIndex + 1; // dot 0 = 1 glass, dot 1 = 2 glasses, etc.

    // If clicking on a filled dot at or after current value, set to that dot's level
    // If clicking on the last filled dot, unselect it (set to dotIndex)
    const newValue = supp.value === targetValue ? dotIndex : targetValue;

    await setSupplementValue(supp.id, today, newValue);
    const [updated, streakData] = await Promise.all([
      getSupplementsForDate(today),
      getCombinedStreak(),
    ]);
    setSupplements(updated);
    setStreakDays(streakData.baseStreak + (streakData.todayComplete ? 1 : 0));
  }, [getToday, setSupplementValue, getSupplementsForDate, getCombinedStreak]);

  // Separate water from other supplements for different rendering
  const pillSupplements = supplements.filter(s => s.target === 1);
  const waterSupplement = supplements.find(s => s.name === 'Water');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Today Label */}
        <Text style={styles.todayLabel}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          })}
        </Text>

        {/* Streak Banner */}
        <StreakBanner
          streakDays={streakDays}
          currentDay={currentDay}
          onPress={() => router.push('/stats')}
        />

        {/* Fasting Status */}
        <FastingCard
          isFasting={isFasting}
          hours={hours}
          minutes={minutes}
          progress={progress}
        />

        {/* Two Column Row */}
        <View style={styles.row}>
          {/* Sitting Mode */}
          <SittingModeCard
            isSitting={isSitting}
            sittingMinutes={sittingMinutes}
            onPress={() => {}}
          />

          {/* Log Food */}
          <NutritionCard
            protein={totals.protein}
            calories={totals.calories}
            onPress={() => router.navigate('/nutrition')}
          />
        </View>

        {/* Daily Stack - Supplements */}
        <SupplementsCard
          pillSupplements={pillSupplements}
          waterSupplement={waterSupplement}
          onSupplementPress={handleSupplementPress}
          onWaterDotPress={handleWaterDotPress}
        />

        {/* Workout */}
        <WorkoutCard
          workedOutToday={workedOutToday}
          weeklyWorkouts={weeklyWorkouts}
          weeklyTarget={weeklyTarget}
          onPress={() => {}}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  todayLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
