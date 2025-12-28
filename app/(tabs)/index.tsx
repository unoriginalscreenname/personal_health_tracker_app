import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  Flame,
  Timer,
  Play,
  Pause,
  Check,
  Circle,
  Target,
  Dumbbell,
  ChevronRight,
  Droplets,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFastingState } from '@/hooks/useFastingState';
import { useSupplements, useMealEntries, useDailyStats, type SupplementWithValue } from '@/db';

// WaterDot component for individual dot clicks
const WaterDot = ({
  index,
  isFilled,
  onPress,
}: {
  index: number;
  isFilled: boolean;
  onPress: (index: number) => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      waterDotStyles.dot,
      isFilled && waterDotStyles.dotFilled,
      pressed && waterDotStyles.dotPressed,
    ]}
    onPress={() => onPress(index)}
  />
);

const waterDotStyles = StyleSheet.create({
  dot: {
    width: 24,
    height: 24,
    borderRadius: 100,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.accent.blue + '30',
  },
  dotFilled: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  dotPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});

export default function CommandCenterScreen() {
  const router = useRouter();

  // Fasting state from hook
  const { isFasting, hours, minutes, progress } = useFastingState();

  // Database hooks
  const { getSupplementsForDate, toggleSupplement, setSupplementValue, getToday } = useSupplements();
  const { getTotalsForDate } = useMealEntries();
  const { initializeDay, getStreak, getStatsForRange } = useDailyStats();

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
          const [supps, tots, supplementStreak] = await Promise.all([
            getSupplementsForDate(today),
            getTotalsForDate(today),
            getStreak('supplements_complete'),
          ]);
          setSupplements(supps);
          setTotals(tots);
          setStreakDays(supplementStreak);

          // Calculate current day (days since first entry in daily_stats)
          // Get all stats from a long time ago to today
          const stats = await getStatsForRange('2020-01-01', today);
          setCurrentDay(Math.max(1, stats.length));
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }, [initializeDay, getSupplementsForDate, getTotalsForDate, getToday, getStreak, getStatsForRange])
  );

  // Handle supplement tap (for pills)
  const handleSupplementPress = useCallback(async (supp: SupplementWithValue) => {
    const today = getToday();
    await toggleSupplement(supp.id, today);
    const updated = await getSupplementsForDate(today);
    setSupplements(updated);
  }, [getToday, toggleSupplement, getSupplementsForDate]);

  // Handle water dot tap - clicking a dot sets value to that level, or unselects if already at that level
  const handleWaterDotPress = useCallback(async (supp: SupplementWithValue, dotIndex: number) => {
    const today = getToday();
    const targetValue = dotIndex + 1; // dot 0 = 1 glass, dot 1 = 2 glasses, etc.

    // If clicking on a filled dot at or after current value, set to that dot's level
    // If clicking on the last filled dot, unselect it (set to dotIndex)
    const newValue = supp.value === targetValue ? dotIndex : targetValue;

    await setSupplementValue(supp.id, today, newValue);
    const updated = await getSupplementsForDate(today);
    setSupplements(updated);
  }, [getToday, setSupplementValue, getSupplementsForDate]);

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
        <View style={styles.streakBanner}>
          <Flame color={colors.accent.orange} size={36} fill={colors.accent.orange} />
          <View style={styles.streakInfo}>
            <Text style={styles.streakCount}>{streakDays}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>Day {currentDay}/30</Text>
          </View>
        </View>

        {/* Fasting Status */}
        <View style={[
          styles.card,
          styles.fastingCard,
          !isFasting && styles.eatingCard
        ]}>
          <View style={styles.fastingRow}>
            <Timer
              color={isFasting ? colors.fasting.primary : colors.eating.primary}
              size={36}
            />
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerText, { color: isFasting ? colors.fasting.primary : colors.eating.primary }]}>
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
              </Text>
              {isFasting ? (
                <Text style={styles.timerTarget}>/ 18:00</Text>
              ) : (
                <Text style={[styles.timerTarget, styles.timerRemaining]}>remaining</Text>
              )}
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: isFasting ? colors.fasting.primary : colors.eating.primary
                }
              ]}
            />
          </View>
        </View>

        {/* Two Column Row */}
        <View style={styles.row}>
          {/* Sitting Mode */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.halfCard,
              styles.sitCard,
              pressed && styles.cardPressed
            ]}
          >
            <View style={styles.sitContent}>
              <View style={[
                styles.sitButton,
                isSitting && styles.sitButtonActive
              ]}>
                {isSitting ? (
                  <Pause color={colors.accent.red} size={28} />
                ) : (
                  <Play color={colors.text.primary} size={28} style={{ marginLeft: 3 }} />
                )}
              </View>
              <Text style={styles.sitLabel}>
                {isSitting ? 'SITTING' : 'START SIT'}
              </Text>
              {isSitting && (
                <Text style={styles.sitTimer}>{sittingMinutes}m</Text>
              )}
              {!isSitting && (
                <Text style={styles.sitHint}>Tap to begin</Text>
              )}
            </View>
          </Pressable>

          {/* Log Food */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.halfCard,
              styles.logFoodCard,
              pressed && styles.cardPressed
            ]}
            onPress={() => router.navigate('/nutrition')}
          >
            <View style={styles.logFoodContent}>
              <Text style={styles.proteinValue}>{Math.round(totals.protein)}g</Text>
              <View style={styles.proteinLabelRow}>
                <Target color={colors.accent.green} size={14} />
                <Text style={styles.proteinLabel}>protein</Text>
              </View>
              <Text style={styles.calsValue}>{totals.calories.toLocaleString()} cal</Text>
            </View>
          </Pressable>
        </View>

        {/* Daily Stack - Pills */}
        <View style={styles.card}>
          <View style={styles.supplementGrid}>
            {pillSupplements.map((supplement) => {
              const isComplete = supplement.value >= supplement.target;
              return (
                <Pressable
                  key={supplement.id}
                  style={({ pressed }) => [
                    styles.supplementCell,
                    isComplete && styles.supplementCellTaken,
                    pressed && styles.supplementPressed
                  ]}
                  onPress={() => handleSupplementPress(supplement)}
                >
                  <View style={[
                    styles.supplementCheck,
                    isComplete && styles.supplementCheckActive
                  ]}>
                    {isComplete ? (
                      <Check color={colors.background.primary} size={16} strokeWidth={3} />
                    ) : (
                      <Circle color={colors.text.dim} size={16} />
                    )}
                  </View>
                  <Text style={[
                    styles.supplementName,
                    isComplete && styles.supplementNameTaken
                  ]}>
                    {supplement.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Water Counter */}
          {waterSupplement && (
            <View style={styles.waterRow}>
              <Droplets color={colors.accent.blue} size={20} />
              <Text style={styles.waterLabel}>Water</Text>
              <View style={styles.waterDots}>
                {Array.from({ length: waterSupplement.target }).map((_, i) => (
                  <WaterDot
                    key={i}
                    index={i}
                    isFilled={i < waterSupplement.value}
                    onPress={(dotIndex) => handleWaterDotPress(waterSupplement, dotIndex)}
                  />
                ))}
              </View>
              <Text style={styles.waterCount}>
                {waterSupplement.value}/{waterSupplement.target}L
              </Text>
            </View>
          )}
        </View>

        {/* Workout */}
        <Pressable
          style={({ pressed }) => [styles.workoutCard, pressed && styles.cardPressed]}
        >
          <Dumbbell color={colors.accent.purple} size={36} />
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutStatus}>
              {workedOutToday ? 'Done for today' : 'Start your workout'}
            </Text>
            <Text style={styles.workoutWeekly}>{weeklyWorkouts}/{weeklyTarget} this week</Text>
          </View>
          <ChevronRight color={colors.text.dim} size={20} />
        </Pressable>

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

  // Today Label
  todayLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Streak Banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.orange + '30',
  },
  streakInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  streakCount: {
    fontSize: fontSize.xxxl,
    fontWeight: '200',
    color: colors.text.primary,
    lineHeight: fontSize.xxxl + 4,
  },
  streakLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayBadge: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  dayBadgeText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // Cards
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  // Fasting Card
  fastingCard: {
    borderWidth: 1,
    borderColor: colors.fasting.primary + '30',
  },
  eatingCard: {
    borderColor: colors.eating.primary + '30',
  },
  fastingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: spacing.md,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  timerTarget: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.dim,
    marginLeft: spacing.xs,
  },
  timerRemaining: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },

  // Row Layout
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    marginBottom: spacing.md,
  },

  // Sitting Mode
  sitCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  sitContent: {
    alignItems: 'center',
  },
  sitButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  sitButtonActive: {
    backgroundColor: colors.accent.red + '20',
    borderColor: colors.accent.red,
  },
  sitLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
  },
  sitTimer: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.red,
    marginTop: spacing.xs,
  },
  sitHint: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },

  // Log Food
  logFoodCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  logFoodContent: {
    alignItems: 'center',
  },
  proteinValue: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.accent.green,
    fontVariant: ['tabular-nums'],
  },
  proteinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proteinLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calsValue: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
    marginTop: spacing.sm,
  },

  // Supplements
  supplementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  supplementCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  supplementCellTaken: {
    backgroundColor: colors.accent.green + '20',
  },
  supplementPressed: {
    opacity: 0.7,
  },
  supplementCheck: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementCheckActive: {
    backgroundColor: colors.accent.green,
  },
  supplementName: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  supplementNameTaken: {
    color: colors.accent.green,
  },

  // Water
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
    gap: spacing.sm,
  },
  waterLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  waterDots: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  waterCount: {
    fontSize: fontSize.sm,
    color: colors.accent.blue,
    fontWeight: '600',
  },

  // Workout
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutStatus: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  workoutWeekly: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },
});
