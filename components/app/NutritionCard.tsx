import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Target } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

interface NutritionCardProps {
  protein: number;
  calories: number;
  onPress: () => void;
}

export function NutritionCard({ protein, calories, onPress }: NutritionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        styles.halfCard,
        styles.logFoodCard,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.logFoodContent}>
        <Text style={styles.proteinValue}>{Math.round(protein)}g</Text>
        <View style={styles.proteinLabelRow}>
          <Target color={colors.accent.green} size={14} />
          <Text style={styles.proteinLabel}>protein</Text>
        </View>
        <Text style={styles.calsValue}>{calories.toLocaleString()} cal</Text>
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
});
