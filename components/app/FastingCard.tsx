import { View, Text, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Timer } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFastingState } from '@/hooks/useFastingState';
import { useDailyStats } from '@/db';

interface FastingCardProps {
  date: string;
}

// Helper to check if date is today
function isToday(dateString: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateString === todayStr;
}

export function FastingCard({ date }: FastingCardProps) {
  const liveState = useFastingState();
  const { getStatsForRange } = useDailyStats();
  const [historicalCompliant, setHistoricalCompliant] = useState<boolean | null>(null);

  const isLive = isToday(date);

  // Load historical data for past dates when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isLive) {
        const load = async () => {
          const stats = await getStatsForRange(date, date);
          setHistoricalCompliant(stats[0]?.fasting_compliant === 1 ? true : stats[0]?.fasting_compliant === 0 ? false : null);
        };
        load();
      }
    }, [date, isLive, getStatsForRange])
  );

  // For today, show live timer
  if (isLive) {
    const { isFasting, hours, minutes, progress } = liveState;
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
            <Text style={[styles.timerTarget, styles.timerRemaining]}>remaining</Text>
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

  // For past dates, show compliance status
  const isCompliant = historicalCompliant === true;
  const color = historicalCompliant === null
    ? colors.text.dim
    : isCompliant ? colors.accent.green : colors.accent.red;

  return (
    <View style={[
      styles.card,
      { borderWidth: 1, borderColor: color + '30' }
    ]}>
      <View style={styles.fastingRow}>
        <Timer color={color} size={36} />
        <View style={styles.timerDisplay}>
          <Text style={[styles.statusText, { color }]}>
            {historicalCompliant === null ? 'No data' : isCompliant ? 'Compliant' : 'Not compliant'}
          </Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: historicalCompliant === null ? '0%' : '100%',
              backgroundColor: color
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
  statusText: {
    fontSize: fontSize.xl,
    fontWeight: '500',
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
