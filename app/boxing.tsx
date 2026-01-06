import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Check, Trash2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useWorkouts, type BoxingSession } from '@/db';

export default function BoxingSessionScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const {
    getToday,
    formatTimeLocal,
    getBoxingSessionForDate,
    createBoxingSession,
    completeBoxingSession,
    updateBoxingDuration,
    deleteBoxingSession,
  } = useWorkouts();

  // Use date from param or default to today
  const targetDate = useMemo(() => dateParam || getToday(), [dateParam, getToday]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<BoxingSession | null>(null);
  const [duration, setDuration] = useState(15);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [tempDuration, setTempDuration] = useState('15');

  const loadData = useCallback(async () => {
    let boxingSession = await getBoxingSessionForDate(targetDate);

    // Auto-create session if none exists
    if (!boxingSession) {
      await createBoxingSession(15, targetDate);
      boxingSession = await getBoxingSessionForDate(targetDate);
    }

    if (boxingSession) {
      setSession(boxingSession);
      setDuration(boxingSession.duration_minutes);
    }
    setLoading(false);
  }, [targetDate, getBoxingSessionForDate, createBoxingSession]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenDurationModal = useCallback(() => {
    setTempDuration(String(duration));
    setShowDurationModal(true);
  }, [duration]);

  const handleSaveDuration = useCallback(async () => {
    const newDuration = Math.max(5, Math.min(120, parseInt(tempDuration) || 15));
    setDuration(newDuration);
    setShowDurationModal(false);

    if (session) {
      await updateBoxingDuration(session.id, newDuration);
      const updated = await getBoxingSessionForDate(targetDate);
      setSession(updated);
    }
  }, [tempDuration, session, updateBoxingDuration, targetDate, getBoxingSessionForDate]);

  const handleComplete = useCallback(async () => {
    if (!session) return;

    await updateBoxingDuration(session.id, duration);
    await completeBoxingSession(session.id);
    router.back();
  }, [session, duration, updateBoxingDuration, completeBoxingSession, router]);

  const handleUpdate = useCallback(async () => {
    if (!session) return;
    await updateBoxingDuration(session.id, duration);
    router.back();
  }, [session, duration, updateBoxingDuration, router]);

  const handleDeleteSession = useCallback(() => {
    if (!session) return;

    Alert.alert(
      'Delete Session',
      'Delete this boxing session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBoxingSession(session.id);
            router.back();
          },
        },
      ]
    );
  }, [session, deleteBoxingSession, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCompleted = !!session?.completed_at;

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
        <Text style={styles.title}>Boxing</Text>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
          onPress={handleDeleteSession}
        >
          <Trash2 color={colors.text.muted} size={20} />
        </Pressable>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Duration - tappable */}
        <Pressable
          style={({ pressed }) => [styles.durationCard, pressed && styles.buttonPressed]}
          onPress={handleOpenDurationModal}
        >
          <Text style={styles.durationValue}>{duration}</Text>
          <Text style={styles.durationUnit}>min</Text>
        </Pressable>

        {/* Status */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Check color={colors.accent.green} size={16} />
            <Text style={styles.completedText}>
              {formatTimeLocal(session!.completed_at!)}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            !isCompleted && styles.saveButtonReady,
            pressed && styles.buttonPressed,
          ]}
          onPress={isCompleted ? handleUpdate : handleComplete}
        >
          <Check color={!isCompleted ? colors.background.primary : colors.text.primary} size={20} />
          <Text style={[
            styles.saveButtonText,
            !isCompleted && styles.saveButtonTextReady,
          ]}>
            {isCompleted ? 'Update' : 'Complete'}
          </Text>
        </Pressable>
      </View>

      {/* Duration Modal */}
      <Modal
        visible={showDurationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDurationModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Duration (minutes)</Text>
            <TextInput
              style={styles.modalInput}
              value={tempDuration}
              onChangeText={setTempDuration}
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
                onPress={() => setShowDurationModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSave,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSaveDuration}
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
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '200',
    color: colors.text.primary,
    textAlign: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  durationCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
  },
  durationValue: {
    fontSize: 80,
    fontWeight: '200',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    lineHeight: 88,
  },
  durationUnit: {
    fontSize: fontSize.lg,
    fontWeight: '200',
    color: colors.text.muted,
    marginTop: -spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  completedText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
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
  },
  saveButtonReady: {
    backgroundColor: colors.accent.green,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButtonTextReady: {
    color: colors.background.primary,
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
    backgroundColor: colors.accent.orange,
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
