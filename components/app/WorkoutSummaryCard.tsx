import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Check, Circle, Plus, ChevronRight } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWorkouts, type BoxingSession, type WeightSession } from '@/db';

interface WorkoutSummaryCardProps {
  date: string;
  onUpdate?: () => void;
}

export function WorkoutSummaryCard({ date, onUpdate }: WorkoutSummaryCardProps) {
  const router = useRouter();
  const {
    getBoxingSessionForDate,
    getWeightSessionForDate,
    formatTimeLocal,
  } = useWorkouts();

  const [boxingSession, setBoxingSession] = useState<BoxingSession | null>(null);
  const [weightsSession, setWeightsSession] = useState<WeightSession | null>(null);

  // Load workout data when screen comes into focus or date changes
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [boxing, weights] = await Promise.all([
          getBoxingSessionForDate(date),
          getWeightSessionForDate(date),
        ]);
        setBoxingSession(boxing);
        setWeightsSession(weights);
      };
      load();
    }, [date, getBoxingSessionForDate, getWeightSessionForDate])
  );

  // Navigate to boxing screen with date (root-level screen)
  const handleBoxingPress = useCallback(() => {
    router.push(`/boxing?date=${date}`);
  }, [router, date]);

  // Navigate to weights screen (or workout index if no session exists)
  const handleWeightsPress = useCallback(() => {
    if (weightsSession) {
      // Edit existing session (root-level screen)
      router.push(`/weights?date=${date}`);
    } else {
      // Create new session - go to workout index to select type
      router.push(`/workout?date=${date}`);
    }
  }, [router, date, weightsSession]);

  const boxingComplete = !!boxingSession?.completed_at;
  const weightsComplete = !!weightsSession?.completed_at;

  return (
    <View style={styles.card}>
      {/* Boxing Row */}
      <Pressable
        style={({ pressed }) => [
          styles.workoutRow,
          boxingComplete && styles.workoutRowComplete,
          pressed && styles.workoutRowPressed,
        ]}
        onPress={handleBoxingPress}
      >
        <View style={[
          styles.statusIndicator,
          boxingComplete && styles.statusIndicatorComplete,
        ]}>
          {boxingComplete ? (
            <Check color={colors.background.primary} size={14} strokeWidth={3} />
          ) : boxingSession ? (
            <Circle color={colors.text.dim} size={14} />
          ) : (
            <Plus color={colors.text.dim} size={14} />
          )}
        </View>
        <Text style={[
          styles.workoutName,
          boxingComplete && styles.workoutNameComplete,
        ]}>
          Boxing
        </Text>
        {boxingSession ? (
          <View style={styles.workoutDetails}>
            <Text style={styles.workoutValue}>{boxingSession.duration_minutes} min</Text>
            {boxingComplete && (
              <Text style={styles.completedTime}>
                {formatTimeLocal(boxingSession.completed_at!)}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.addText}>Add</Text>
        )}
        <ChevronRight color={colors.text.dim} size={18} />
      </Pressable>

      {/* Weights Row */}
      <Pressable
        style={({ pressed }) => [
          styles.workoutRow,
          styles.workoutRowLast,
          weightsComplete && styles.workoutRowComplete,
          pressed && styles.workoutRowPressed,
        ]}
        onPress={handleWeightsPress}
      >
        <View style={[
          styles.statusIndicator,
          weightsComplete && styles.statusIndicatorComplete,
        ]}>
          {weightsComplete ? (
            <Check color={colors.background.primary} size={14} strokeWidth={3} />
          ) : weightsSession ? (
            <Circle color={colors.text.dim} size={14} />
          ) : (
            <Plus color={colors.text.dim} size={14} />
          )}
        </View>
        <Text style={[
          styles.workoutName,
          weightsComplete && styles.workoutNameComplete,
        ]}>
          Weights
        </Text>
        {weightsSession ? (
          <View style={styles.workoutDetails}>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>
                {weightsSession.session_type.toUpperCase()}
              </Text>
            </View>
            {weightsComplete && (
              <Text style={styles.completedTime}>
                {formatTimeLocal(weightsSession.completed_at!)}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.addText}>Add</Text>
        )}
        <ChevronRight color={colors.text.dim} size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  workoutRowLast: {
    borderBottomWidth: 0,
  },
  workoutRowComplete: {
    backgroundColor: colors.accent.green + '10',
  },
  workoutRowPressed: {
    opacity: 0.7,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicatorComplete: {
    backgroundColor: colors.accent.green,
  },
  workoutName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  workoutNameComplete: {
    color: colors.accent.green,
  },
  workoutDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workoutValue: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  completedTime: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
  },
  addText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  sessionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent.blue + '20',
  },
  sessionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent.blue,
  },
});
