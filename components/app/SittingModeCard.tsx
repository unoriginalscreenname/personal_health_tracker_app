import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface SittingModeCardProps {
  isSitting: boolean;
  sittingMinutes: number;
  onPress: () => void;
}

export function SittingModeCard({ isSitting, sittingMinutes, onPress }: SittingModeCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.halfCard,
        styles.sitCard,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
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
});
