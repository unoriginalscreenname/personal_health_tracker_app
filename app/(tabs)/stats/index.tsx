import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback } from 'react';
import { ChevronLeft, Check, X, Circle } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useDailyStats, type DailyStats } from '@/db';

// Format date string to display (e.g., "Saturday, Dec 28")
function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// Check if date is today (using local timezone)
function isToday(dateString: string): boolean {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dateString === today;
}

export default function StatsHistoryScreen() {
  const router = useRouter();
  const { getStatsForRange, getToday } = useDailyStats();

  const [stats, setStats] = useState<DailyStats[]>([]);

  // Load all stats
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const today = getToday();
        // Get all stats from the beginning
        const allStats = await getStatsForRange('2020-01-01', today);
        // Reverse to show newest first
        setStats(allStats.reverse());
      };
      loadData();
    }, [getStatsForRange, getToday])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text.secondary} size={24} />
        </Pressable>
        <Text style={styles.title}>Stats History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {stats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stats recorded yet</Text>
          </View>
        ) : (
          stats.map((day) => (
            <Pressable
              key={day.date}
              style={({ pressed }) => [
                styles.dayRow,
                isToday(day.date) && styles.dayRowToday,
                pressed && styles.dayRowPressed,
              ]}
              onPress={() => router.push(`/stats/${day.date}`)}
            >
              <View style={styles.dayInfo}>
                <Text style={[styles.dayDate, isToday(day.date) && styles.dayDateToday]}>
                  {isToday(day.date) ? 'Today' : formatDateDisplay(day.date)}
                </Text>
                {!day.finalized && (
                  <Text style={styles.inProgressLabel}>In Progress</Text>
                )}
              </View>
              <View style={styles.indicators}>
                {/* Fasting indicator */}
                <View style={[
                  styles.indicator,
                  day.fasting_compliant ? styles.indicatorSuccess : styles.indicatorFail,
                ]}>
                  {day.fasting_compliant ? (
                    <Check color={colors.accent.green} size={14} strokeWidth={3} />
                  ) : day.finalized ? (
                    <X color={colors.accent.red} size={14} strokeWidth={3} />
                  ) : (
                    <Circle color={colors.text.dim} size={14} />
                  )}
                </View>
                {/* Supplements indicator */}
                <View style={[
                  styles.indicator,
                  day.supplements_complete ? styles.indicatorSuccess : styles.indicatorFail,
                ]}>
                  {day.supplements_complete ? (
                    <Check color={colors.accent.green} size={14} strokeWidth={3} />
                  ) : day.finalized ? (
                    <X color={colors.accent.red} size={14} strokeWidth={3} />
                  ) : (
                    <Circle color={colors.text.dim} size={14} />
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  backButtonPressed: {
    backgroundColor: colors.background.secondary,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  dayRowToday: {
    borderWidth: 1,
    borderColor: colors.accent.orange + '50',
  },
  dayRowPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  dayDateToday: {
    color: colors.accent.orange,
  },
  inProgressLabel: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },
  indicators: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSuccess: {
    backgroundColor: colors.accent.green + '20',
  },
  indicatorFail: {
    backgroundColor: colors.background.tertiary,
  },
});
