import { View, Text, StyleSheet } from 'react-native';
import { Timer } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface FastingCardProps {
  isFasting: boolean;
  hours: number;
  minutes: number;
  progress: number;
}

export function FastingCard({ isFasting, hours, minutes, progress }: FastingCardProps) {
  return (
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
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
});
