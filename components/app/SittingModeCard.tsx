import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { Play, Pause, AlertCircle, X } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useSittingTimer, formatTimeRemaining, DURATION_PRESETS } from '@/hooks/useSittingTimer';

interface SittingModeCardProps {
  onStandDue?: () => void;  // Callback when user should navigate to stand-up screen
}

export function SittingModeCard({ onStandDue }: SittingModeCardProps) {
  const {
    status,
    timeRemaining,
    sitDurationSeconds,
    startSitting,
    cancelSitting,
    startStanding,
    setSitDuration,
  } = useSittingTimer();

  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Format duration for display in button label
  const getDurationLabel = () => {
    if (sitDurationSeconds < 60) return `${sitDurationSeconds}s`;
    return `${Math.round(sitDurationSeconds / 60)}`;
  };

  const handleCancelConfirmed = async () => {
    try {
      await cancelSitting();
    } catch (error) {
      console.error('Failed to cancel sitting:', error);
    }
  };

  const handleDurationSelect = async (seconds: number) => {
    setSitDuration(seconds);
    setShowDurationPicker(false);
    try {
      await startSitting();
    } catch (err) {
      console.error('Failed to start sitting:', err);
    }
  };

  const handlePress = () => {
    switch (status) {
      case 'idle':
        startSitting().catch(err => console.error('Failed to start sitting:', err));
        break;

      case 'sitting':
        // Prompt to cancel
        Alert.alert(
          'Cancel Timer?',
          'Are you sure you want to cancel the sit timer?',
          [
            { text: 'Keep Going', style: 'cancel' },
            {
              text: 'Cancel Timer',
              style: 'destructive',
              onPress: handleCancelConfirmed,
            },
          ]
        );
        break;

      case 'stand_due':
        // Start standing first, then navigate
        startStanding();
        // Small delay to ensure state updates before navigation
        setTimeout(() => {
          onStandDue?.();
        }, 50);
        break;

      case 'standing':
        // Already on stand screen, do nothing
        break;
    }
  };

  const handleLongPress = () => {
    if (status === 'idle') {
      setShowDurationPicker(true);
    }
  };

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <>
            <View style={styles.sitButton}>
              <Play color={colors.text.primary} size={28} style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.sitLabel}>START SIT ({getDurationLabel()})</Text>
            <Text style={styles.sitHint}>Hold to change</Text>
          </>
        );

      case 'sitting':
        return (
          <>
            <View style={[styles.sitButton, styles.sitButtonActive]}>
              <Pause color={colors.accent.red} size={28} />
            </View>
            <Text style={styles.sitLabel}>SITTING</Text>
            <Text style={styles.sitTimer}>{formatTimeRemaining(timeRemaining)}</Text>
          </>
        );

      case 'stand_due':
        return (
          <>
            <View style={[styles.sitButton, styles.sitButtonStandDue]}>
              <AlertCircle color={colors.accent.orange} size={28} />
            </View>
            <Text style={[styles.sitLabel, styles.standDueLabel]}>STAND UP!</Text>
            <Text style={styles.standDueHint}>Tap to start exercises</Text>
          </>
        );

      case 'standing':
        return (
          <>
            <View style={[styles.sitButton, styles.sitButtonStanding]}>
              <Play color={colors.accent.green} size={28} />
            </View>
            <Text style={styles.sitLabel}>EXERCISING</Text>
            <Text style={styles.standingTimer}>{formatTimeRemaining(timeRemaining)}</Text>
          </>
        );
    }
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.halfCard,
          styles.sitCard,
          status === 'stand_due' && styles.sitCardStandDue,
          pressed && styles.cardPressed
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <View style={styles.sitContent}>
          {renderContent()}
        </View>
      </Pressable>

      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDurationPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sit Duration</Text>
              <Pressable
                onPress={() => setShowDurationPicker(false)}
                style={styles.modalClose}
              >
                <X color={colors.text.muted} size={20} />
              </Pressable>
            </View>
            <View style={styles.durationOptions}>
              {DURATION_PRESETS.map((preset) => (
                <Pressable
                  key={preset.seconds}
                  style={({ pressed }) => [
                    styles.durationOption,
                    preset.seconds === sitDurationSeconds && styles.durationOptionActive,
                    pressed && styles.durationOptionPressed,
                  ]}
                  onPress={() => handleDurationSelect(preset.seconds)}
                >
                  <Text
                    style={[
                      styles.durationOptionText,
                      preset.seconds === sitDurationSeconds && styles.durationOptionTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  halfCard: {
    flex: 1,
    marginBottom: spacing.md,
  },
  sitCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  sitCardStandDue: {
    borderWidth: 2,
    borderColor: colors.accent.orange,
    backgroundColor: colors.accent.orange + '10',
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
  sitButtonStandDue: {
    backgroundColor: colors.accent.orange + '20',
    borderColor: colors.accent.orange,
  },
  sitButtonStanding: {
    backgroundColor: colors.accent.green + '20',
    borderColor: colors.accent.green,
  },
  sitLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
  },
  standDueLabel: {
    color: colors.accent.orange,
  },
  sitTimer: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.red,
    marginTop: spacing.xs,
  },
  standingTimer: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.green,
    marginTop: spacing.xs,
  },
  sitHint: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },
  standDueHint: {
    fontSize: fontSize.xs,
    color: colors.accent.orange,
    marginTop: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '80%',
    maxWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalClose: {
    padding: spacing.xs,
  },
  durationOptions: {
    gap: spacing.sm,
  },
  durationOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  durationOptionActive: {
    backgroundColor: colors.accent.blue + '30',
    borderWidth: 1,
    borderColor: colors.accent.blue,
  },
  durationOptionPressed: {
    opacity: 0.7,
  },
  durationOptionText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  durationOptionTextActive: {
    color: colors.accent.blue,
    fontWeight: '600',
  },
});
