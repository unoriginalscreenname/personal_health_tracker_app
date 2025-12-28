import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Target } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries } from '@/db';

const TARGET_PROTEIN = 160;

interface NutritionCardProps {
  date: string;
  variant?: 'compact' | 'full';
  onPress?: () => void;
}

export function NutritionCard({ date, variant = 'full', onPress }: NutritionCardProps) {
  const { getTotalsForDate } = useMealEntries();
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await getTotalsForDate(date);
        setTotals(data);
      };
      load();
    }, [date, getTotalsForDate])
  );

  const progressPercent = Math.min((totals.protein / TARGET_PROTEIN) * 100, 100);

  // Compact variant - half-width card for command center row
  if (variant === 'compact') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.halfCard,
          styles.compactCard,
          pressed && styles.cardPressed
        ]}
        onPress={onPress}
      >
        <View style={styles.compactContent}>
          <Text style={styles.compactProteinValue}>{Math.round(totals.protein)}g</Text>
          <View style={styles.proteinLabelRow}>
            <Target color={colors.accent.green} size={14} />
            <Text style={styles.proteinLabel}>protein</Text>
          </View>
          <Text style={styles.compactCalsValue}>{totals.calories.toLocaleString()} cal</Text>
        </View>
      </Pressable>
    );
  }

  // Full variant - full-width with progress bar (no card background)
  const content = (
    <View style={styles.fullContainer}>
      <View style={styles.proteinRow}>
        <Text style={styles.proteinValue}>{Math.round(totals.protein)}</Text>
        <Text style={styles.proteinTarget}>/ {TARGET_PROTEIN}g</Text>
        <Text style={styles.calsValue}>{totals.calories.toLocaleString()} cal</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => pressed && styles.cardPressed}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  // Shared
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

  // Compact variant (half-width)
  halfCard: {
    flex: 1,
  },
  compactCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  compactContent: {
    alignItems: 'center',
  },
  compactProteinValue: {
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
  compactCalsValue: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
    marginTop: spacing.sm,
  },

  // Full variant (no card background)
  fullContainer: {
    marginBottom: spacing.md,
  },
  proteinRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  proteinValue: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.accent.green,
    fontVariant: ['tabular-nums'],
  },
  proteinTarget: {
    fontSize: 28,
    fontWeight: '200',
    color: colors.text.dim,
    fontVariant: ['tabular-nums'],
  },
  calsValue: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginLeft: 'auto',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.full,
  },
});
