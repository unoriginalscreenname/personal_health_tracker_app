import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Dumbbell, CircleDot, Check, ChevronRight, Circle } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import {
  useWorkouts,
  type BoxingSession,
  type WeightSession,
  type LastWeightSessionInfo,
} from '@/db';

export default function WorkoutScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const {
    getToday,
    formatTimeLocal,
    getBoxingSessionForDate,
    getWeightSessionForDate,
    getLastWeightSession,
    createWeightSession,
  } = useWorkouts();

  // Use date from param or default to today
  const targetDate = useMemo(() => dateParam || getToday(), [dateParam, getToday]);

  const [loading, setLoading] = useState(true);
  const [boxingSession, setBoxingSession] = useState<BoxingSession | null>(null);
  const [weightSession, setWeightSession] = useState<WeightSession | null>(null);
  const [lastWeightInfo, setLastWeightInfo] = useState<LastWeightSessionInfo | null>(null);

  const loadData = useCallback(async () => {
    const [boxing, weights, lastWeight] = await Promise.all([
      getBoxingSessionForDate(targetDate),
      getWeightSessionForDate(targetDate),
      getLastWeightSession(),
    ]);
    setBoxingSession(boxing);
    setWeightSession(weights);
    setLastWeightInfo(lastWeight);
    setLoading(false);
  }, [targetDate, getBoxingSessionForDate, getWeightSessionForDate, getLastWeightSession]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleBoxingPress = useCallback(() => {
    // Navigate to root-level boxing screen with date if provided
    if (dateParam) {
      router.push(`/boxing?date=${targetDate}`);
    } else {
      router.push('/boxing');
    }
  }, [router, dateParam, targetDate]);

  const handleStartWeights = useCallback(async (type: 'a' | 'b') => {
    await createWeightSession(type, targetDate);
    const session = await getWeightSessionForDate(targetDate);
    setWeightSession(session);
    // Navigate to root-level weights screen with date if provided
    if (dateParam) {
      router.push(`/weights?date=${targetDate}`);
    } else {
      router.push('/weights');
    }
  }, [createWeightSession, targetDate, getWeightSessionForDate, router, dateParam]);

  const handleWeightsPress = useCallback(() => {
    // Navigate to root-level weights screen with date if provided
    if (dateParam) {
      router.push(`/weights?date=${targetDate}`);
    } else {
      router.push('/weights');
    }
  }, [router, dateParam, targetDate]);

  const suggestedType = lastWeightInfo
    ? (lastWeightInfo.type === 'a' ? 'b' : 'a')
    : 'a';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Dumbbell color={colors.text.primary} size={24} />
          <Text style={styles.title}>Workout</Text>
        </View>

        {/* Boxing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boxing</Text>

          {!boxingSession ? (
            <Pressable
              style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
              onPress={handleBoxingPress}
            >
              <CircleDot color={colors.accent.orange} size={20} />
              <Text style={styles.startButtonText}>Start Boxing Session</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.summaryCard,
                boxingSession.completed_at && styles.summaryCardComplete,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleBoxingPress}
            >
              <View style={styles.summaryHeader}>
                <View style={[
                  styles.checkCircle,
                  boxingSession.completed_at && styles.checkCircleActive,
                ]}>
                  {boxingSession.completed_at ? (
                    <Check color={colors.background.primary} size={16} strokeWidth={3} />
                  ) : (
                    <CircleDot color={colors.text.dim} size={16} />
                  )}
                </View>
                <View style={styles.summaryInfo}>
                  <Text style={[
                    styles.summaryTitle,
                    boxingSession.completed_at && styles.summaryTitleComplete,
                  ]}>
                    {boxingSession.duration_minutes} min
                  </Text>
                  {boxingSession.completed_at ? (
                    <Text style={styles.summaryTime}>
                      {formatTimeLocal(boxingSession.completed_at)}
                    </Text>
                  ) : (
                    <Text style={styles.summarySubtext}>In Progress</Text>
                  )}
                </View>
                <ChevronRight color={colors.text.dim} size={20} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Weights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weights (5x5)</Text>

          {!weightSession ? (
            <View>
              {lastWeightInfo ? (
                <Text style={styles.lastSessionText}>
                  Last: Session {lastWeightInfo.type.toUpperCase()}, {lastWeightInfo.daysAgo} day{lastWeightInfo.daysAgo !== 1 ? 's' : ''} ago
                </Text>
              ) : (
                <Text style={styles.lastSessionText}>No previous sessions</Text>
              )}

              <View style={styles.sessionButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sessionButton,
                    suggestedType === 'a' && styles.sessionButtonSuggested,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleStartWeights('a')}
                >
                  <Text style={[
                    styles.sessionButtonText,
                    suggestedType === 'a' && styles.sessionButtonTextSuggested,
                  ]}>
                    Session A
                  </Text>
                  <Text style={styles.sessionButtonSubtext}>
                    Squat • Bench • Row
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.sessionButton,
                    suggestedType === 'b' && styles.sessionButtonSuggested,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleStartWeights('b')}
                >
                  <Text style={[
                    styles.sessionButtonText,
                    suggestedType === 'b' && styles.sessionButtonTextSuggested,
                  ]}>
                    Session B
                  </Text>
                  <Text style={styles.sessionButtonSubtext}>
                    Squat • OHP • Deadlift
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (() => {
            const exercisesDone = weightSession.exercises.filter(
              e => e.sets_completed >= e.sets_target
            ).length;
            const allComplete = exercisesDone === weightSession.exercises.length;

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.summaryCard,
                  allComplete && styles.summaryCardComplete,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleWeightsPress}
              >
                {/* Header row */}
                <View style={styles.summaryHeader}>
                  <View style={[
                    styles.checkCircle,
                    allComplete && styles.checkCircleActive,
                  ]}>
                    {allComplete ? (
                      <Check color={colors.background.primary} size={16} strokeWidth={3} />
                    ) : (
                      <Dumbbell color={colors.text.dim} size={16} />
                    )}
                  </View>
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>
                      {weightSession.session_type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={[
                      styles.summaryTitle,
                      allComplete && styles.summaryTitleComplete,
                    ]}>
                      {exercisesDone}/{weightSession.exercises.length} done
                    </Text>
                    {weightSession.completed_at ? (
                      <Text style={styles.summaryTime}>
                        {formatTimeLocal(weightSession.completed_at)}
                      </Text>
                    ) : (
                      <Text style={styles.summarySubtext}>In Progress</Text>
                    )}
                  </View>
                  <ChevronRight color={colors.text.dim} size={20} />
                </View>

                {/* Exercise details */}
                <View style={styles.exerciseList}>
                  {weightSession.exercises.map((exercise) => {
                    const isDone = exercise.sets_completed >= exercise.sets_target;
                    return (
                      <View key={exercise.id} style={styles.exerciseRow}>
                        <View style={[
                          styles.exerciseCheck,
                          isDone && styles.exerciseCheckActive,
                        ]}>
                          {isDone ? (
                            <Check color={colors.background.primary} size={12} strokeWidth={3} />
                          ) : (
                            <Circle color={colors.text.dim} size={12} />
                          )}
                        </View>
                        <Text style={[
                          styles.exerciseName,
                          isDone && styles.exerciseNameComplete,
                        ]}>
                          {exercise.display_name}
                        </Text>
                        <Text style={styles.exerciseDetail}>
                          {exercise.weight} lbs
                        </Text>
                        <Text style={styles.exerciseDetail}>
                          {exercise.sets_completed}/{exercise.sets_target}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            );
          })()}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.muted,
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  // Start button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent.orange + '50',
  },
  startButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.accent.orange,
  },
  // Summary card
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  summaryCardComplete: {
    backgroundColor: colors.accent.green + '15',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  summaryTitleComplete: {
    color: colors.accent.green,
  },
  summaryTime: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  summarySubtext: {
    fontSize: fontSize.xs,
    color: colors.accent.orange,
  },
  // Check circle
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: colors.accent.green,
  },
  // Session badge
  sessionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent.blue + '20',
  },
  sessionBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent.blue,
  },
  // Exercise list (inside summary card)
  exerciseList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exerciseCheck: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseCheckActive: {
    backgroundColor: colors.accent.green,
  },
  exerciseName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  exerciseNameComplete: {
    color: colors.accent.green,
  },
  exerciseDetail: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    minWidth: 50,
    textAlign: 'right',
  },
  // Session buttons (A/B selection)
  lastSessionText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  sessionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sessionButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  sessionButtonSuggested: {
    borderColor: colors.accent.blue,
    borderWidth: 2,
  },
  sessionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sessionButtonTextSuggested: {
    color: colors.accent.blue,
  },
  sessionButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  // Pressed state
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
