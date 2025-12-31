import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Check, X, Activity } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useSittingTimer, formatTimeRemaining } from '@/hooks/useSittingTimer';
import { useSittingSessions } from '@/db';

const EXERCISES = [
  { id: 'squats', name: 'Squats' },
  { id: 'pushups', name: 'Push-ups' },
  { id: 'mountain_climbers', name: 'Mountain Climbers' },
];

export default function StandupScreen() {
  const router = useRouter();
  const {
    status,
    timeRemaining,
    sitDurationMinutes,
    startStanding,
    completeStanding,
    cancelStanding,
  } = useSittingTimer();
  const { logSession } = useSittingSessions();

  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [timerComplete, setTimerComplete] = useState(false);

  // Check if timer is complete
  useEffect(() => {
    if (timeRemaining <= 0 && status === 'standing') {
      setTimerComplete(true);
    }
  }, [timeRemaining, status]);

  // If status becomes idle (cancelled or completed), redirect back
  // Don't redirect on initial mount - allow stand_due to transition to standing
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      // On first render, if we're in stand_due, start standing
      if (status === 'stand_due') {
        startStanding();
      }
      hasInitialized.current = true;
      return;
    }

    // After initialization, only redirect if we go back to idle
    if (status === 'idle') {
      router.back();
    }
  }, [status, router, startStanding]);

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const handleComplete = async () => {
    try {
      // Log the session to database
      const exerciseNames = EXERCISES
        .filter(e => completedExercises.has(e.id))
        .map(e => e.name);

      await logSession(sitDurationMinutes, exerciseNames);

      // Complete standing and auto-restart sit timer
      // This will change status which triggers navigation via useEffect
      await completeStanding(exerciseNames, true);

      // Navigate back since we're now in 'sitting' state (auto-restart), not 'idle'
      router.back();
    } catch (error) {
      console.error('Failed to complete standing:', error);
    }
  };

  const handleCancelConfirmed = () => {
    // This changes status to 'idle' which triggers navigation via useEffect
    cancelStanding();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Exercise?',
      'This session will not be logged.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: handleCancelConfirmed,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Activity color={colors.accent.green} size={24} />
        <Text style={styles.title}>Stand Up & Move</Text>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={[
          styles.timer,
          timerComplete && styles.timerComplete
        ]}>
          {formatTimeRemaining(timeRemaining)}
        </Text>
        <Text style={styles.timerLabel}>
          {timerComplete ? 'Time Complete!' : 'Time Remaining'}
        </Text>
      </View>

      {/* Exercise Checklist */}
      <View style={styles.exerciseList}>
        <Text style={styles.sectionLabel}>EXERCISES</Text>
        {EXERCISES.map(exercise => (
          <Pressable
            key={exercise.id}
            style={({ pressed }) => [
              styles.exerciseRow,
              completedExercises.has(exercise.id) && styles.exerciseRowCompleted,
              pressed && styles.exerciseRowPressed,
            ]}
            onPress={() => toggleExercise(exercise.id)}
          >
            <View style={[
              styles.checkbox,
              completedExercises.has(exercise.id) && styles.checkboxChecked
            ]}>
              {completedExercises.has(exercise.id) && (
                <Check color={colors.text.primary} size={16} strokeWidth={3} />
              )}
            </View>
            <Text style={[
              styles.exerciseName,
              completedExercises.has(exercise.id) && styles.exerciseNameCompleted
            ]}>
              {exercise.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {timerComplete ? (
          <Pressable
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleComplete}
          >
            <Check color={colors.text.primary} size={20} />
            <Text style={styles.completeButtonText}>Complete Stand</Text>
          </Pressable>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Complete the timer to finish
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.buttonPressed
          ]}
          onPress={handleCancel}
        >
          <X color={colors.accent.red} size={20} />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  timer: {
    fontSize: 72,
    fontWeight: '200',
    color: colors.accent.green,
    fontVariant: ['tabular-nums'],
  },
  timerComplete: {
    color: colors.accent.orange,
  },
  timerLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  exerciseRowCompleted: {
    backgroundColor: colors.accent.green + '20',
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
  },
  exerciseRowPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  exerciseName: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  exerciseNameCompleted: {
    color: colors.accent.green,
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.green,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  completeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  waitingContainer: {
    alignItems: 'center',
    padding: spacing.md,
  },
  waitingText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent.red + '40',
    gap: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.accent.red,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
