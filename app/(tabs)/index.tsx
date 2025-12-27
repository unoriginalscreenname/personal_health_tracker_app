import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Flame,
  Timer,
  Play,
  Pause,
  Pill,
  Check,
  Circle,
  Target,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function CommandCenterScreen() {
  // Mock data - will be replaced with real state
  const currentDay = 7;
  const streakDays = 7;
  const isFasting = true;
  const fastingHours = 14;
  const fastingMinutes = 32;
  const targetHours = 18;
  const isSitting = false;
  const sittingMinutes = 23;

  const supplements = [
    { name: 'Creatine', taken: true },
    { name: 'Omega-3', taken: true },
    { name: 'Vitamin D', taken: false },
    { name: 'Magnesium', taken: false },
  ];

  const fastingProgress = (fastingHours * 60 + fastingMinutes) / (targetHours * 60);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Banner */}
        <View style={styles.streakBanner}>
          <Flame color={colors.accent.orange} size={36} fill={colors.accent.orange} />
          <View style={styles.streakInfo}>
            <Text style={styles.streakCount}>{streakDays}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>Day {currentDay}/30</Text>
          </View>
        </View>

        {/* Fasting Status */}
        <View style={[styles.card, styles.fastingCard]}>
          <View style={styles.fastingRow}>
            <Timer
              color={isFasting ? colors.fasting.primary : colors.eating.primary}
              size={36}
            />
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerText, { color: isFasting ? colors.fasting.primary : colors.eating.primary }]}>
                {String(fastingHours).padStart(2, '0')}:{String(fastingMinutes).padStart(2, '0')}
              </Text>
              <Text style={styles.timerTarget}>/ {targetHours}:00</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(fastingProgress * 100, 100)}%`,
                  backgroundColor: isFasting ? colors.fasting.primary : colors.eating.primary
                }
              ]}
            />
          </View>
        </View>

        {/* Two Column Row */}
        <View style={styles.row}>
          {/* Sitting Mode */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.halfCard,
              styles.sitCard,
              pressed && styles.cardPressed
            ]}
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

          {/* Log Food */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.halfCard,
              styles.logFoodCard,
              pressed && styles.cardPressed
            ]}
          >
            <View style={styles.logFoodContent}>
              <Text style={styles.proteinValue}>142g</Text>
              <View style={styles.proteinLabelRow}>
                <Target color={colors.accent.green} size={14} />
                <Text style={styles.proteinLabel}>protein</Text>
              </View>
              <Text style={styles.calsValue}>2,847 cal</Text>
            </View>
          </Pressable>
        </View>

        {/* Daily Stack */}
        <View style={styles.card}>
          <View style={styles.supplementGrid}>
            {supplements.map((supplement, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.supplementCell,
                  supplement.taken && styles.supplementCellTaken,
                  pressed && styles.supplementPressed
                ]}
              >
                <View style={[
                  styles.supplementCheck,
                  supplement.taken && styles.supplementCheckActive
                ]}>
                  {supplement.taken ? (
                    <Check color={colors.background.primary} size={16} strokeWidth={3} />
                  ) : (
                    <Circle color={colors.text.dim} size={16} />
                  )}
                </View>
                <Text style={[
                  styles.supplementName,
                  supplement.taken && styles.supplementNameTaken
                ]}>
                  {supplement.name}
                </Text>
              </Pressable>
            ))}
          </View>
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
    paddingBottom: spacing.xxl,
  },

  // Streak Banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.orange + '30',
  },
  streakInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  streakCount: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: fontSize.xxxl + 4,
  },
  streakLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayBadge: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  dayBadgeText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // Cards
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1.5,
    flex: 1,
  },
  cardCount: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
    fontWeight: '500',
  },

  // Fasting Card
  fastingCard: {
    borderWidth: 1,
    borderColor: colors.fasting.primary + '30',
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

  // Row Layout
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCard: {
    flex: 1,
    marginBottom: spacing.md,
  },

  // Sitting Mode
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

  // Log Food
  logFoodCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  logFoodContent: {
    alignItems: 'center',
  },
  proteinValue: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.accent.green,
    fontVariant: ['tabular-nums'],
  },
  proteinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  proteinLabel: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calsValue: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
    marginTop: spacing.sm,
  },

  // Supplements
  supplementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  supplementCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  supplementCellTaken: {
    backgroundColor: colors.accent.green + '20',
  },
  supplementPressed: {
    opacity: 0.7,
  },
  supplementCheck: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplementCheckActive: {
    backgroundColor: colors.accent.green,
  },
  supplementName: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  supplementNameTaken: {
    color: colors.accent.green,
  },
});
