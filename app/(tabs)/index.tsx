import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { colors, spacing, fontSize } from '@/constants/theme';
import { useDailyStats } from '@/db';
import { StreakBanner } from '@/components/app/StreakBanner';
import { FastingCard } from '@/components/app/FastingCard';
import { SittingModeCard } from '@/components/app/SittingModeCard';
import { NutritionCard } from '@/components/app/NutritionCard';
import { SupplementsCard } from '@/components/app/SupplementsCard';
import { WorkoutCard } from '@/components/app/WorkoutCard';

// Helper to get today's date as YYYY-MM-DD
function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CommandCenterScreen() {
  const router = useRouter();
  const today = getToday();

  // Database hooks for streak only
  const { initializeDay, getCombinedStreak, getStatsForRange } = useDailyStats();

  // State for streak banner (still needs page-level data)
  const [streakDays, setStreakDays] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);

  // Mock data - will be replaced with real state
  const isSitting = false;
  const sittingMinutes = 23;

  // Workout data
  const workedOutToday = false;
  const weeklyWorkouts = 3;
  const weeklyTarget = 4;

  // Load streak data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          await initializeDay();
          const streakData = await getCombinedStreak();
          setStreakDays(streakData.baseStreak + (streakData.todayComplete ? 1 : 0));

          const stats = await getStatsForRange('2020-01-01', today);
          setCurrentDay(Math.max(1, stats.length));
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }, [initializeDay, getCombinedStreak, getStatsForRange, today])
  );

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
        <FastingCard date={today} />

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
            date={today}
            variant="compact"
            onPress={() => router.navigate('/nutrition')}
          />
        </View>

        {/* Daily Stack - Supplements */}
        <SupplementsCard date={today} />

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
