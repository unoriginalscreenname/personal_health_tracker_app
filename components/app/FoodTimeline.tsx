import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries, type MealEntry } from '@/db';

interface FoodTimelineProps {
  date: string;
  onDeleteEntry?: (entry: MealEntry) => void;
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

export function FoodTimeline({ date, onDeleteEntry }: FoodTimelineProps) {
  const router = useRouter();
  const { getEntriesForDate } = useMealEntries();
  const [entries, setEntries] = useState<MealEntry[]>([]);

  // Load entries when screen comes into focus or date changes
  const loadEntries = useCallback(async () => {
    const data = await getEntriesForDate(date);
    setEntries(data);
  }, [date, getEntriesForDate]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  // Reload after delete
  const handleDelete = useCallback((entry: MealEntry) => {
    onDeleteEntry?.(entry);
  }, [onDeleteEntry]);

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
        <View key={entry.id} style={styles.timelineRow}>
          <Pressable
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
          {onDeleteEntry && (
            <Pressable
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
              onPress={() => handleDelete(entry)}
            >
              <Trash2 color={colors.text.dim} size={16} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    marginBottom: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  timelineEntry: {
    flex: 1,
    flexDirection: 'row',
  },
  timelineEntryPressed: {
    opacity: 0.7,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  deleteButtonPressed: {
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
