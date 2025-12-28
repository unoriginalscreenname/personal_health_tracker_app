import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  PenLine,
  Check,
  Circle,
  Droplets,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import {
  useMealEntries,
  useSupplements,
  useDailyStats,
  type MealEntry,
  type SupplementWithValue,
} from '@/db';

const TARGET_PROTEIN = 160;

// Helper to format Date to YYYY-MM-DD in local timezone
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Format date string to display (e.g., "Saturday, Dec 28")
function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
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

// Check if date is today (using local timezone)
function isToday(dateString: string): boolean {
  return dateString === formatDateLocal(new Date());
}

// WaterDot component for individual dot clicks
const WaterDot = ({
  index,
  isFilled,
  onPress,
}: {
  index: number;
  isFilled: boolean;
  onPress: (index: number) => void;
}) => (
  <Pressable
    style={({ pressed }) => [
      waterDotStyles.dot,
      isFilled && waterDotStyles.dotFilled,
      pressed && waterDotStyles.dotPressed,
    ]}
    onPress={() => onPress(index)}
  />
);

const waterDotStyles = StyleSheet.create({
  dot: {
    width: 24,
    height: 24,
    borderRadius: 100,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: colors.accent.blue + '30',
  },
  dotFilled: {
    backgroundColor: colors.accent.blue,
    borderColor: colors.accent.blue,
  },
  dotPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});

export default function DayDetailScreen() {
  const { date: initialDate } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();

  // State
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [totals, setTotals] = useState({ protein: 0, calories: 0 });
  const [supplements, setSupplements] = useState<SupplementWithValue[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Date picker state
  const [pickerDate, setPickerDate] = useState(() => new Date(currentDate + 'T12:00:00'));

  // Database hooks
  const { getEntriesForDate, getTotalsForDate, createEntry } = useMealEntries();
  const { getSupplementsForDate, toggleSupplement, setSupplementValue } = useSupplements();
  const { getStatsForRange } = useDailyStats();

  // Load data when screen comes into focus or date changes
  const loadData = useCallback(async () => {
    if (!currentDate) return;
    const [entriesData, totalsData, suppsData] = await Promise.all([
      getEntriesForDate(currentDate),
      getTotalsForDate(currentDate),
      getSupplementsForDate(currentDate),
    ]);
    setEntries(entriesData);
    setTotals(totalsData);
    setSupplements(suppsData);
  }, [currentDate, getEntriesForDate, getTotalsForDate, getSupplementsForDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Navigate to previous/next day
  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = formatDateLocal(d);
    setCurrentDate(newDate);
    setPickerDate(d);
  }, [currentDate]);

  // Open date picker
  const handleOpenDatePicker = useCallback(() => {
    setPickerDate(new Date(currentDate + 'T12:00:00'));
    setShowDatePicker(true);
  }, [currentDate]);

  // Apply date from picker
  const handleApplyDate = useCallback(() => {
    const newDate = formatDateLocal(pickerDate);
    setCurrentDate(newDate);
    setShowDatePicker(false);
  }, [pickerDate]);

  // Handle log food - create entry and navigate to it
  const handleLogFood = useCallback(async () => {
    const entryId = await createEntry(undefined, currentDate);
    router.push(`/nutrition/entry/${entryId}`);
  }, [createEntry, currentDate, router]);

  // Handle supplement tap (for pills)
  const handleSupplementPress = useCallback(async (supp: SupplementWithValue) => {
    await toggleSupplement(supp.id, currentDate);
    const updated = await getSupplementsForDate(currentDate);
    setSupplements(updated);
  }, [currentDate, toggleSupplement, getSupplementsForDate]);

  // Handle water dot tap
  const handleWaterDotPress = useCallback(async (supp: SupplementWithValue, dotIndex: number) => {
    const targetValue = dotIndex + 1;
    const newValue = supp.value === targetValue ? dotIndex : targetValue;
    await setSupplementValue(supp.id, currentDate, newValue);
    const updated = await getSupplementsForDate(currentDate);
    setSupplements(updated);
  }, [currentDate, setSupplementValue, getSupplementsForDate]);

  // Separate water from other supplements
  const pillSupplements = supplements.filter(s => s.target === 1);
  const waterSupplement = supplements.find(s => s.name === 'Water');

  const progressPercent = Math.min((totals.protein / TARGET_PROTEIN) * 100, 100);
  const todayDate = formatDateLocal(new Date());
  const canGoNext = currentDate < todayDate;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text.secondary} size={24} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.dateButton, pressed && styles.buttonPressed]}
          onPress={handleOpenDatePicker}
        >
          <Calendar color={colors.accent.orange} size={18} />
          <Text style={styles.dateText}>
            {isToday(currentDate) ? 'Today' : formatDateDisplay(currentDate)}
          </Text>
        </Pressable>

        <View style={styles.navButtons}>
          <Pressable
            style={({ pressed }) => [styles.navButton, pressed && styles.buttonPressed]}
            onPress={() => navigateDay('prev')}
          >
            <ChevronLeft color={colors.text.secondary} size={20} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.navButton,
              !canGoNext && styles.navButtonDisabled,
              pressed && canGoNext && styles.buttonPressed,
            ]}
            onPress={() => canGoNext && navigateDay('next')}
            disabled={!canGoNext}
          >
            <ChevronRight color={canGoNext ? colors.text.secondary : colors.text.dim} size={20} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Protein Stats */}
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

        {/* Log Food Button */}
        <Pressable
          style={({ pressed }) => [styles.logButton, pressed && styles.logButtonPressed]}
          onPress={handleLogFood}
        >
          <PenLine color={colors.text.muted} size={16} />
          <Text style={styles.logButtonText}>Log food</Text>
        </Pressable>

        {/* Food Timeline */}
        {entries.length > 0 && (
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
        )}

        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No food logged</Text>
          </View>
        )}

        {/* Supplements Section */}
        <View style={styles.supplementsSection}>
          <Text style={styles.sectionLabel}>SUPPLEMENTS</Text>
          <View style={styles.supplementCard}>
            <View style={styles.supplementGrid}>
              {pillSupplements.map((supplement) => {
                const isComplete = supplement.value >= supplement.target;
                return (
                  <Pressable
                    key={supplement.id}
                    style={({ pressed }) => [
                      styles.supplementCell,
                      isComplete && styles.supplementCellTaken,
                      pressed && styles.supplementPressed,
                    ]}
                    onPress={() => handleSupplementPress(supplement)}
                  >
                    <View style={[
                      styles.supplementCheck,
                      isComplete && styles.supplementCheckActive,
                    ]}>
                      {isComplete ? (
                        <Check color={colors.background.primary} size={16} strokeWidth={3} />
                      ) : (
                        <Circle color={colors.text.dim} size={16} />
                      )}
                    </View>
                    <Text style={[
                      styles.supplementName,
                      isComplete && styles.supplementNameTaken,
                    ]}>
                      {supplement.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Water Counter */}
            {waterSupplement && (
              <View style={styles.waterRow}>
                <Droplets color={colors.accent.blue} size={20} />
                <Text style={styles.waterLabel}>Water</Text>
                <View style={styles.waterDots}>
                  {Array.from({ length: waterSupplement.target }).map((_, i) => (
                    <WaterDot
                      key={i}
                      index={i}
                      isFilled={i < waterSupplement.value}
                      onPress={(dotIndex) => handleWaterDotPress(waterSupplement, dotIndex)}
                    />
                  ))}
                </View>
                <Text style={styles.waterCount}>
                  {waterSupplement.value}/{waterSupplement.target}L
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.datePickerContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.datePickerTitle}>Select Date</Text>

            {/* Month/Year Navigation */}
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => {
                  const d = new Date(pickerDate);
                  d.setMonth(d.getMonth() - 1);
                  setPickerDate(d);
                }}
              >
                <ChevronLeft color={colors.text.secondary} size={24} />
              </Pressable>
              <Text style={styles.monthText}>
                {pickerDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() => {
                  const d = new Date(pickerDate);
                  d.setMonth(d.getMonth() + 1);
                  setPickerDate(d);
                }}
              >
                <ChevronRight color={colors.text.secondary} size={24} />
              </Pressable>
            </View>

            {/* Day selector */}
            <View style={styles.dayGrid}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <Text key={i} style={styles.dayHeader}>{day}</Text>
              ))}
              {(() => {
                const year = pickerDate.getFullYear();
                const month = pickerDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days: (number | null)[] = [];

                // Add empty slots for days before the 1st
                for (let i = 0; i < firstDay; i++) days.push(null);
                // Add days of the month
                for (let i = 1; i <= daysInMonth; i++) days.push(i);

                return days.map((day, i) => {
                  if (day === null) {
                    return <View key={i} style={styles.daySlot} />;
                  }
                  const thisDate = new Date(year, month, day);
                  const thisDateStr = formatDateLocal(thisDate);
                  const isSelected = thisDateStr === formatDateLocal(pickerDate);
                  const isFuture = thisDateStr > todayDate;

                  return (
                    <Pressable
                      key={i}
                      style={[
                        styles.daySlot,
                        isSelected && styles.daySlotSelected,
                        isFuture && styles.daySlotDisabled,
                      ]}
                      onPress={() => !isFuture && setPickerDate(thisDate)}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isFuture && styles.dayTextDisabled,
                      ]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                });
              })()}
            </View>

            <View style={styles.datePickerButtons}>
              <Pressable
                style={styles.datePickerCancel}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.datePickerApply}
                onPress={handleApplyDate}
              >
                <Text style={styles.datePickerApplyText}>Go to Date</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  buttonPressed: {
    backgroundColor: colors.background.secondary,
    opacity: 0.7,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  dateText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },

  // Stats
  statsCard: {
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

  // Log Button
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  logButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.background.secondary,
  },
  logButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },

  // Timeline
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

  // Empty state
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },

  // Supplements
  supplementsSection: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  supplementCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
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
    flex: 1,
  },
  supplementNameTaken: {
    color: colors.accent.green,
  },

  // Water
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
    gap: spacing.sm,
  },
  waterLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  waterDots: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  waterCount: {
    fontSize: fontSize.sm,
    color: colors.accent.blue,
    fontWeight: '600',
  },

  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 360,
  },
  datePickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.text.dim,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  daySlot: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySlotSelected: {
    backgroundColor: colors.accent.orange,
    borderRadius: borderRadius.full,
  },
  daySlotDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  dayTextSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.text.dim,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  datePickerApply: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.orange,
    alignItems: 'center',
  },
  datePickerApplyText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
