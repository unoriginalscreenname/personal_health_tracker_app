import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface StreakBannerProps {
  streakDays: number;
  currentDay: number;
  onPress: () => void;
}

export function StreakBanner({ streakDays, currentDay, onPress }: StreakBannerProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.streakBanner,
        pressed && styles.streakBannerPressed,
      ]}
      onPress={onPress}
    >
      <Flame color={colors.accent.orange} size={36} fill={colors.accent.orange} />
      <View style={styles.streakInfo}>
        <Text style={styles.streakCount}>{streakDays}</Text>
      </View>
      <View style={styles.dayBadge}>
        <Text style={styles.dayBadgeText}>Day {currentDay}/30</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  streakBannerPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  streakInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  streakCount: {
    fontSize: fontSize.xxxl,
    fontWeight: '200',
    color: colors.text.primary,
    lineHeight: fontSize.xxxl + 4,
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
});
