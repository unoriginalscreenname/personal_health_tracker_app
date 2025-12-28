import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries, type MealEntry } from '@/db';

interface FoodTimelineProps {
  date: string;
}

// Format ISO timestamp to display time (e.g., "12:15 PM")
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function FoodTimeline({ date }: FoodTimelineProps) {
  const router = useRouter();
  const { getEntriesForDate } = useMealEntries();
  const [entries, setEntries] = useState<MealEntry[]>([]);

  // Load entries when screen comes into focus or date changes
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const data = await getEntriesForDate(date);
        setEntries(data);
      };
      load();
    }, [date, getEntriesForDate])
  );

  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No food logged</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          style={({ pressed }) => [styles.timelineEntry, pressed && styles.timelineEntryPressed]}
          onPress={() => router.push(`/nutrition/entry/${entry.id}`)}
        >
          <View style={styles.timelineLeft}>
            <Text style={styles.timelineTime}>{formatTime(entry.logged_at)}</Text>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.foodItems}>
              {entry.items.map((item) => (
                <View key={item.id} style={styles.foodChip}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodProtein}>{Math.round(item.protein * item.quantity)}g</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    marginBottom: spacing.lg,
  },
  timelineEntry: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineEntryPressed: {
    opacity: 0.7,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: spacing.md,
  },
  timelineTime: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginBottom: spacing.xs,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.background.tertiary,
    marginTop: spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  foodItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  foodName: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  foodProtein: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
});
