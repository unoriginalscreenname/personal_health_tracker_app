import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Check, Circle, Trash2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWorkouts, type WeightSession, type ExerciseLog } from '@/db';

export default function WeightsSessionScreen() {
  const router = useRouter();
  const {
    getToday,
    getWeightSessionForDate,
    updateExerciseLog,
    completeWeightSession,
    deleteWeightSession,
  } = useWorkouts();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WeightSession | null>(null);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);

  // Modal state
  const [editingExercise, setEditingExercise] = useState<ExerciseLog | null>(null);
  const [editingField, setEditingField] = useState<'weight' | 'sets' | null>(null);
  const [tempValue, setTempValue] = useState('');

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

  const handleOpenWeightModal = useCallback((exercise: ExerciseLog) => {
    setEditingExercise(exercise);
    setEditingField('weight');
    setTempValue(String(exercise.weight));
  }, []);

  const handleOpenSetsModal = useCallback((exercise: ExerciseLog) => {
    setEditingExercise(exercise);
    setEditingField('sets');
    setTempValue(String(exercise.sets_completed));
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingExercise(null);
    setEditingField(null);
    setTempValue('');
  }, []);

  const handleSaveModal = useCallback(async () => {
    if (!editingExercise || !editingField) return;

    const numValue = parseInt(tempValue) || 0;

    if (editingField === 'weight') {
      const newWeight = Math.max(0, numValue);
      await updateExerciseLog(editingExercise.id, newWeight, editingExercise.sets_completed);
      setExercises(prev => prev.map(ex =>
        ex.id === editingExercise.id ? { ...ex, weight: newWeight } : ex
      ));
    } else {
      const newSets = Math.max(0, Math.min(editingExercise.sets_target, numValue));
      await updateExerciseLog(editingExercise.id, editingExercise.weight, newSets);
      setExercises(prev => prev.map(ex =>
        ex.id === editingExercise.id ? { ...ex, sets_completed: newSets } : ex
      ));
    }

    handleCloseModal();
  }, [editingExercise, editingField, tempValue, updateExerciseLog, handleCloseModal]);

  const handleToggleComplete = useCallback(async (exercise: ExerciseLog) => {
    const newSets = exercise.sets_completed >= exercise.sets_target ? 0 : exercise.sets_target;
    await updateExerciseLog(exercise.id, exercise.weight, newSets);
    setExercises(prev => prev.map(ex =>
      ex.id === exercise.id ? { ...ex, sets_completed: newSets } : ex
    ));
  }, [updateExerciseLog]);

  const handleDone = useCallback(async () => {
    if (!session) return;
    // Mark session complete if all exercises are done
    const allDone = exercises.every(ex => ex.sets_completed >= ex.sets_target);
    if (allDone) {
      await completeWeightSession(session.id);
    }
    router.back();
  }, [session, exercises, completeWeightSession, router]);

  const handleDeleteSession = useCallback(() => {
    if (!session) return;

    Alert.alert(
      'Delete Session',
      'Delete this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWeightSession(session.id);
            router.back();
          },
        },
      ]
    );
  }, [session, deleteWeightSession, router]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={handleBack}
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>
              {session.session_type.toUpperCase()}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
          onPress={handleDeleteSession}
        >
          <Trash2 color={colors.text.muted} size={20} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {exercises.map((exercise) => {
          const isComplete = exercise.sets_completed >= exercise.sets_target;

          return (
            <View key={exercise.id} style={[
              styles.exerciseRow,
              isComplete && styles.exerciseRowComplete,
            ]}>
              <Text style={[
                styles.exerciseName,
                isComplete && styles.exerciseNameComplete,
              ]}>
                {exercise.display_name}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.valueButton, pressed && styles.buttonPressed]}
                onPress={() => handleOpenWeightModal(exercise)}
              >
                <Text style={styles.valueText}>{exercise.weight}</Text>
                <Text style={styles.valueUnit}>lbs</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.valueButton, pressed && styles.buttonPressed]}
                onPress={() => handleOpenSetsModal(exercise)}
              >
                <Text style={styles.valueText}>{exercise.sets_completed}</Text>
                <Text style={styles.valueUnit}>/{exercise.sets_target}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.checkCircle,
                  isComplete && styles.checkCircleActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => handleToggleComplete(exercise)}
              >
                {isComplete ? (
                  <Check color={colors.background.primary} size={16} strokeWidth={3} />
                ) : (
                  <Circle color={colors.text.dim} size={16} />
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* Done button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.doneButton, pressed && styles.buttonPressed]}
          onPress={handleDone}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={!!editingExercise && !!editingField}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingField === 'weight' ? 'Weight (lbs)' : 'Sets Completed'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={tempValue}
              onChangeText={setTempValue}
              keyboardType="number-pad"
              selectTextOnFocus
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonCancel,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSave,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSaveModal}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent.blue + '20',
  },
  sessionBadgeText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent.blue,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  // Exercise row
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  exerciseRowComplete: {
    backgroundColor: colors.accent.green + '15',
  },
  exerciseName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  exerciseNameComplete: {
    color: colors.accent.green,
  },
  valueButton: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  valueText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  valueUnit: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    marginLeft: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    marginLeft: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: colors.accent.green,
  },
  // Footer
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  doneButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalInput: {
    fontSize: fontSize.xxl,
    fontWeight: '200',
    color: colors.text.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background.tertiary,
  },
  modalButtonCancelText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  modalButtonSave: {
    backgroundColor: colors.accent.blue,
  },
  modalButtonSaveText: {
    fontSize: fontSize.md,
    color: colors.background.primary,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
