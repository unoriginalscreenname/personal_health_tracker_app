import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { PenLine, Settings, Utensils } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries } from '@/db';
import { FoodTimeline } from '@/components/app/FoodTimeline';

const TARGET_PROTEIN = 160;

export default function NutritionScreen() {
  const router = useRouter();
  const { getTotalsForDate, getToday } = useMealEntries();

  // State
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });
  const today = getToday();

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const totalsData = await getTotalsForDate(today);
        setTotals(totalsData);
      };
      loadData();
    }, [getTotalsForDate, today])
  );

  const progressPercent = Math.min((totals.protein / TARGET_PROTEIN) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with settings */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Utensils color={colors.text.primary} size={24} />
            <Text style={styles.title}>Food</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
            onPress={() => router.push('/nutrition/settings')}
          >
            <Settings color={colors.text.dim} size={20} />
          </Pressable>
        </View>

        {/* Today's Stats */}
        <View style={styles.statsCard}>
          <View style={styles.proteinRow}>
            <Text style={styles.proteinValue}>{Math.round(totals.protein)}</Text>
            <Text style={styles.proteinTarget}>/ {TARGET_PROTEIN}g</Text>
            <Text style={styles.calsValue}>{totals.calories.toLocaleString()} cal</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Log Food CTA */}
        <Pressable
          style={({ pressed }) => [styles.logButton, pressed && styles.logButtonPressed]}
          onPress={() => router.push('/add-food')}
        >
          <PenLine color={colors.accent.green} size={18} />
          <Text style={styles.logButtonText}>Log food</Text>
        </Pressable>

        {/* Food Timeline */}
        <FoodTimeline date={today} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonPressed: {
    opacity: 0.5,
    backgroundColor: colors.background.secondary,
  },
  statsCard: {
    marginBottom: spacing.lg,
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

  // Log Button
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  logButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.green + '10',
  },
  logButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
  },

});
