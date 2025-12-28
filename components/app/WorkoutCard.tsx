import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Dumbbell, ChevronRight } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface WorkoutCardProps {
  workedOutToday: boolean;
  weeklyWorkouts: number;
  weeklyTarget: number;
  onPress: () => void;
}

export function WorkoutCard({ workedOutToday, weeklyWorkouts, weeklyTarget, onPress }: WorkoutCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.workoutCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Dumbbell color={colors.accent.purple} size={36} />
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutStatus}>
          {workedOutToday ? 'Done for today' : 'Start your workout'}
        </Text>
        <Text style={styles.workoutWeekly}>{weeklyWorkouts}/{weeklyTarget} this week</Text>
      </View>
      <ChevronRight color={colors.text.dim} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  workoutInfo: {
    flex: 1,
  },
  workoutStatus: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  workoutWeekly: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },
});
