import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Dumbbell, CircleDot, Check, ChevronRight, Minus, Plus } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import {
  useWorkouts,
  type BoxingSession,
  type WeightSession,
  type LastWeightSessionInfo,
} from '@/db';

export default function WorkoutScreen() {
  const router = useRouter();
  const {
    getToday,
    formatTimeLocal,
    getBoxingSessionForDate,
    createBoxingSession,
    completeBoxingSession,
    updateBoxingDuration,
    getWeightSessionForDate,
    getLastWeightSession,
    createWeightSession,
  } = useWorkouts();

  const [loading, setLoading] = useState(true);
  const [boxingSession, setBoxingSession] = useState<BoxingSession | null>(null);
  const [weightSession, setWeightSession] = useState<WeightSession | null>(null);
  const [lastWeightInfo, setLastWeightInfo] = useState<LastWeightSessionInfo | null>(null);
  const [boxingDuration, setBoxingDuration] = useState(15);

  const loadData = useCallback(async () => {
    const today = getToday();
    const [boxing, weights, lastWeight] = await Promise.all([
      getBoxingSessionForDate(today),
      getWeightSessionForDate(today),
      getLastWeightSession(),
    ]);
    setBoxingSession(boxing);
    setWeightSession(weights);
    setLastWeightInfo(lastWeight);
    if (boxing) {
      setBoxingDuration(boxing.duration_minutes);
    }
    setLoading(false);
  }, [getToday, getBoxingSessionForDate, getWeightSessionForDate, getLastWeightSession]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Boxing handlers
  const handleStartBoxing = useCallback(async () => {
    const id = await createBoxingSession(boxingDuration);
    const today = getToday();
    const session = await getBoxingSessionForDate(today);
    setBoxingSession(session);
  }, [createBoxingSession, boxingDuration, getToday, getBoxingSessionForDate]);

  const handleCompleteBoxing = useCallback(async () => {
    if (!boxingSession) return;
    await updateBoxingDuration(boxingSession.id, boxingDuration);
    await completeBoxingSession(boxingSession.id);
    const today = getToday();
    const session = await getBoxingSessionForDate(today);
    setBoxingSession(session);
  }, [boxingSession, boxingDuration, updateBoxingDuration, completeBoxingSession, getToday, getBoxingSessionForDate]);

  const handleBoxingDurationChange = useCallback(async (delta: number) => {
    const newDuration = Math.max(5, Math.min(60, boxingDuration + delta));
    setBoxingDuration(newDuration);
    if (boxingSession) {
      await updateBoxingDuration(boxingSession.id, newDuration);
    }
  }, [boxingDuration, boxingSession, updateBoxingDuration]);

  // Weights handlers
  const handleStartWeights = useCallback(async (type: 'a' | 'b') => {
    await createWeightSession(type);
    const today = getToday();
    const session = await getWeightSessionForDate(today);
    setWeightSession(session);
    // Navigate to weights session screen
    router.push('/(tabs)/workout/weights' as any);
  }, [createWeightSession, getToday, getWeightSessionForDate, router]);

  const handleContinueWeights = useCallback(() => {
    router.push('/(tabs)/workout/weights' as any);
  }, [router]);

  // Suggest next session type
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
            // No session - show start button
            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleStartBoxing}
            >
              <CircleDot color={colors.accent.orange} size={20} />
              <Text style={styles.startButtonText}>Start Boxing Session</Text>
            </Pressable>
          ) : !boxingSession.completed_at ? (
            // In progress - show duration picker and complete button
            <View style={styles.card}>
              <View style={styles.durationRow}>
                <Text style={styles.durationLabel}>Duration</Text>
                <View style={styles.durationControls}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.durationButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleBoxingDurationChange(-5)}
                  >
                    <Minus color={colors.text.primary} size={18} />
                  </Pressable>
                  <Text style={styles.durationValue}>{boxingDuration} min</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.durationButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleBoxingDurationChange(5)}
                  >
                    <Plus color={colors.text.primary} size={18} />
                  </Pressable>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.completeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleCompleteBoxing}
              >
                <Check color={colors.background.primary} size={18} />
                <Text style={styles.completeButtonText}>Complete Session</Text>
              </Pressable>
            </View>
          ) : (
            // Completed - show summary
            <Pressable
              style={({ pressed }) => [
                styles.completedCard,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                // Allow editing by resetting completed_at
                // For now, just show the info
              }}
            >
              <View style={styles.completedInfo}>
                <Check color={colors.accent.green} size={20} />
                <Text style={styles.completedText}>
                  {boxingSession.duration_minutes} min
                </Text>
                <Text style={styles.completedTime}>
                  @ {formatTimeLocal(boxingSession.completed_at!)}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        {/* Weights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weights (5x5)</Text>

          {!weightSession ? (
            // No session today
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
          ) : (
            // Session exists - show summary and continue button
            <Pressable
              style={({ pressed }) => [
                weightSession.completed_at ? styles.completedCard : styles.inProgressCard,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleContinueWeights}
            >
              <View style={styles.weightSessionInfo}>
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>
                    {weightSession.session_type.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sessionSummary}>
                  {weightSession.completed_at ? (
                    <>
                      <View style={styles.completedInfo}>
                        <Check color={colors.accent.green} size={18} />
                        <Text style={styles.completedText}>
                          {weightSession.exercises.filter(e => e.sets_completed > 0).length}/{weightSession.exercises.length} exercises
                        </Text>
                      </View>
                      <Text style={styles.completedTime}>
                        @ {formatTimeLocal(weightSession.completed_at)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.inProgressText}>In Progress</Text>
                  )}
                </View>
                <ChevronRight color={colors.text.muted} size={20} />
              </View>
            </Pressable>
          )}
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
  // Start button (dashed border style)
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
  // Card styles
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  completedCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.green,
  },
  inProgressCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.orange,
  },
  // Duration controls
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  durationLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  durationButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  // Complete button
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.green,
  },
  completeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.background.primary,
  },
  // Completed state
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  completedTime: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  // Weights section
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
  // Weight session card
  weightSessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
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
  sessionSummary: {
    flex: 1,
  },
  inProgressText: {
    fontSize: fontSize.md,
    color: colors.accent.orange,
    fontWeight: '500',
  },
  // Pressed state
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
