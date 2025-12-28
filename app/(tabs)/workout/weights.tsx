import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Minus, Plus, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWorkouts, type WeightSession, type ExerciseLog } from '@/db';

export default function WeightsSessionScreen() {
  const router = useRouter();
  const {
    getToday,
    getWeightSessionForDate,
    updateExerciseLog,
    completeWeightSession,
  } = useWorkouts();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WeightSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);

  const loadData = useCallback(async () => {
    const today = getToday();
    const weightSession = await getWeightSessionForDate(today);
    if (weightSession) {
      setSession(weightSession);
      setExercises(weightSession.exercises);
    }
    setLoading(false);
  }, [getToday, getWeightSessionForDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleWeightChange = useCallback(async (logId: number, delta: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === logId) {
        const newWeight = Math.max(0, ex.weight + delta);
        // Update in background
        updateExerciseLog(logId, newWeight, ex.sets_completed);
        return { ...ex, weight: newWeight };
      }
      return ex;
    }));
  }, [updateExerciseLog]);

  const handleSetToggle = useCallback(async (logId: number, currentSets: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === logId) {
        // Cycle: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0
        const newSets = currentSets >= ex.sets_target ? 0 : currentSets + 1;
        // Update in background
        updateExerciseLog(logId, ex.weight, newSets);
        return { ...ex, sets_completed: newSets };
      }
      return ex;
    }));
  }, [updateExerciseLog]);

  const handleSetDirect = useCallback(async (logId: number, setNumber: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === logId) {
        // If clicking on a filled set, set to that number
        // If clicking on an empty set, fill up to that number
        const newSets = setNumber;
        updateExerciseLog(logId, ex.weight, newSets);
        return { ...ex, sets_completed: newSets };
      }
      return ex;
    }));
  }, [updateExerciseLog]);

  const handleSaveSession = useCallback(async () => {
    if (!session) return;
    await completeWeightSession(session.id);
    router.back();
  }, [session, completeWeightSession, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No session found</Text>
          <Pressable style={styles.backLink} onPress={handleBack}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = !!session.completed_at;
  const allComplete = exercises.every(ex => ex.sets_completed >= ex.sets_target);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleBack}
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <View style={styles.headerTitle}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>
              {session.session_type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>
            Session {session.session_type.toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Exercise List */}
        {exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.display_name}</Text>
              {exercise.sets_completed >= exercise.sets_target && (
                <Check color={colors.accent.green} size={20} />
              )}
            </View>

            {/* Weight Control */}
            <View style={styles.weightRow}>
              <Text style={styles.weightLabel}>Weight</Text>
              <View style={styles.weightControls}>
                <Pressable
                  style={({ pressed }) => [
                    styles.weightButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleWeightChange(exercise.id, -5)}
                >
                  <Minus color={colors.text.primary} size={16} />
                </Pressable>
                <Text style={styles.weightValue}>{exercise.weight} lbs</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.weightButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleWeightChange(exercise.id, 5)}
                >
                  <Plus color={colors.text.primary} size={16} />
                </Pressable>
              </View>
            </View>

            {/* Sets */}
            <View style={styles.setsRow}>
              <Text style={styles.setsLabel}>Sets</Text>
              <View style={styles.setsCircles}>
                {Array.from({ length: exercise.sets_target }).map((_, idx) => {
                  const setNum = idx + 1;
                  const isFilled = setNum <= exercise.sets_completed;
                  return (
                    <Pressable
                      key={idx}
                      style={({ pressed }) => [
                        styles.setCircle,
                        isFilled && styles.setCircleFilled,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleSetDirect(exercise.id, isFilled ? idx : setNum)}
                    >
                      {isFilled ? (
                        <Check color={colors.background.primary} size={14} />
                      ) : (
                        <Text style={styles.setCircleText}>{setNum}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Save Button */}
      {!isCompleted && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              allComplete && styles.saveButtonReady,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSaveSession}
          >
            <Check color={allComplete ? colors.background.primary : colors.text.primary} size={20} />
            <Text style={[
              styles.saveButtonText,
              allComplete && styles.saveButtonTextReady,
            ]}>
              Save Session
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  backLink: {
    marginTop: spacing.md,
  },
  backLinkText: {
    color: colors.accent.blue,
    fontSize: fontSize.md,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerSpacer: {
    width: 40,
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '200',
    color: colors.text.primary,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Exercise card
  exerciseCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  exerciseName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Weight row
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weightLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  weightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weightButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    minWidth: 70,
    textAlign: 'center',
  },
  // Sets row
  setsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setsLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  setsCircles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  setCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleFilled: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  setCircleText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  // Footer
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  saveButtonReady: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButtonTextReady: {
    color: colors.background.primary,
  },
  // Pressed state
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
