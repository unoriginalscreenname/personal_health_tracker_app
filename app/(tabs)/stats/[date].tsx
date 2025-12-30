import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  PenLine,
  Check,
  Circle,
  X,
  Trash2,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import {
  useDailyStats,
  type DailyStats,
} from '@/db';

import { NutritionCard } from '@/components/app/NutritionCard';
import { SupplementsCard } from '@/components/app/SupplementsCard';
import { FoodTimeline } from '@/components/app/FoodTimeline';

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

// Check if date is today (using local timezone)
function isToday(dateString: string): boolean {
  return dateString === formatDateLocal(new Date());
}

export default function DayDetailScreen() {
  const { date: initialDate } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();

  // State
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [dayStats, setDayStats] = useState<DailyStats | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Date picker state
  const [pickerDate, setPickerDate] = useState(() => new Date(currentDate + 'T12:00:00'));
  const [pickerDateHasData, setPickerDateHasData] = useState(false);
  const [isChangingDate, setIsChangingDate] = useState(false);

  // Database hooks
  const { hasDataForDate, moveDateData, getStatsForRange, deleteDate } = useDailyStats();

  // Load page-specific data (stats for section headers)
  const loadData = useCallback(async () => {
    if (!currentDate) return;
    const statsData = await getStatsForRange(currentDate, currentDate);
    setDayStats(statsData[0] ?? null);
  }, [currentDate, getStatsForRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Check if picker date has data whenever it changes
  useEffect(() => {
    const checkPickerDate = async () => {
      const pickerDateStr = formatDateLocal(pickerDate);
      if (pickerDateStr === currentDate) {
        setPickerDateHasData(false);
        return;
      }
      const hasData = await hasDataForDate(pickerDateStr);
      setPickerDateHasData(hasData);
    };
    checkPickerDate();
  }, [pickerDate, currentDate, hasDataForDate]);

  // Navigate to previous/next day
  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = formatDateLocal(d);
    setCurrentDate(newDate);
    setPickerDate(d);
  }, [currentDate]);

  const handleOpenDatePicker = useCallback(() => {
    setPickerDate(new Date(currentDate + 'T12:00:00'));
    setShowDatePicker(true);
  }, [currentDate]);

  const handleChangeDate = useCallback(async () => {
    const newDate = formatDateLocal(pickerDate);
    if (newDate === currentDate) {
      setShowDatePicker(false);
      return;
    }
    setIsChangingDate(true);
    try {
      await moveDateData(currentDate, newDate);
      setShowDatePicker(false);
      router.replace(`/stats/${newDate}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change date. The target date may already have data.');
      setIsChangingDate(false);
    }
  }, [pickerDate, currentDate, moveDateData, router]);

  const handleGoToDate = useCallback(() => {
    const newDate = formatDateLocal(pickerDate);
    setShowDatePicker(false);
    if (newDate !== currentDate) {
      router.replace(`/stats/${newDate}`);
    }
  }, [pickerDate, currentDate, router]);

  const handleLogFood = useCallback(() => {
    router.push(`/add-food?date=${currentDate}`);
  }, [currentDate, router]);

  const handleDeleteDate = useCallback(() => {
    Alert.alert(
      'Delete Date',
      `Delete all data for ${formatDateDisplay(currentDate)}? This includes meals, supplements, workouts, and stats. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDate(currentDate);
            router.back();
          },
        },
      ]
    );
  }, [currentDate, deleteDate, router]);

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
        {/* Fasting Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>FASTING WINDOW</Text>
          {dayStats && (
            <View style={[
              styles.sectionIndicator,
              dayStats.fasting_compliant ? styles.sectionIndicatorSuccess : styles.sectionIndicatorFail,
            ]}>
              {dayStats.fasting_compliant ? (
                <Check color={colors.accent.green} size={14} strokeWidth={3} />
              ) : dayStats.finalized ? (
                <X color={colors.accent.red} size={14} strokeWidth={3} />
              ) : (
                <Circle color={colors.text.dim} size={14} />
              )}
            </View>
          )}
        </View>

        {/* Protein Stats */}
        <NutritionCard date={currentDate} />

        {/* Log Food Button */}
        <Pressable
          style={({ pressed }) => [styles.logButton, pressed && styles.logButtonPressed]}
          onPress={handleLogFood}
        >
          <PenLine color={colors.text.muted} size={16} />
          <Text style={styles.logButtonText}>Log food</Text>
        </Pressable>

        {/* Food Timeline */}
        <FoodTimeline date={currentDate} />

        {/* Supplements Section */}
        <View style={styles.supplementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>SUPPLEMENTS</Text>
            {dayStats && (
              <View style={[
                styles.sectionIndicator,
                dayStats.supplements_complete ? styles.sectionIndicatorSuccess : styles.sectionIndicatorFail,
              ]}>
                {dayStats.supplements_complete ? (
                  <Check color={colors.accent.green} size={14} strokeWidth={3} />
                ) : dayStats.finalized ? (
                  <X color={colors.accent.red} size={14} strokeWidth={3} />
                ) : (
                  <Circle color={colors.text.dim} size={14} />
                )}
              </View>
            )}
          </View>
          <SupplementsCard date={currentDate} onUpdate={loadData} />
        </View>

        {/* Delete Date Button */}
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          onPress={handleDeleteDate}
        >
          <Trash2 color={colors.accent.red} size={16} />
          <Text style={styles.deleteButtonText}>Delete Date</Text>
        </Pressable>
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

                for (let i = 0; i < firstDay; i++) days.push(null);
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

            {pickerDateHasData && (
              <Text style={styles.dateWarning}>
                This date already has entries. Choose another date.
              </Text>
            )}

            <View style={styles.datePickerButtons}>
              <Pressable
                style={[
                  styles.datePickerButton,
                  styles.datePickerButtonChange,
                  (pickerDateHasData || formatDateLocal(pickerDate) === currentDate || isChangingDate) && styles.datePickerButtonDisabled,
                ]}
                onPress={handleChangeDate}
                disabled={pickerDateHasData || formatDateLocal(pickerDate) === currentDate || isChangingDate}
              >
                <Text style={[
                  styles.datePickerButtonText,
                  (pickerDateHasData || formatDateLocal(pickerDate) === currentDate || isChangingDate) && styles.datePickerButtonTextDisabled,
                ]}>
                  {isChangingDate ? 'Moving...' : 'Change to Date'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.datePickerButton,
                  styles.datePickerButtonGo,
                  formatDateLocal(pickerDate) === currentDate && styles.datePickerButtonDisabled,
                ]}
                onPress={handleGoToDate}
                disabled={formatDateLocal(pickerDate) === currentDate}
              >
                <Text style={[
                  styles.datePickerButtonText,
                  styles.datePickerButtonTextGo,
                  formatDateLocal(pickerDate) === currentDate && styles.datePickerButtonTextDisabled,
                ]}>
                  Go to Date
                </Text>
              </Pressable>
              <Pressable
                style={[styles.datePickerButton, styles.datePickerButtonCancel]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerButtonTextCancel}>Cancel</Text>
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

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
  },
  sectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIndicatorSuccess: {
    backgroundColor: colors.accent.green + '20',
  },
  sectionIndicatorFail: {
    backgroundColor: colors.background.tertiary,
  },

  // Supplements
  supplementsSection: {
    marginTop: spacing.lg,
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
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  datePickerButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  datePickerButtonChange: {
    backgroundColor: colors.accent.orange,
  },
  datePickerButtonGo: {
    backgroundColor: colors.accent.blue,
  },
  datePickerButtonCancel: {
    backgroundColor: colors.background.tertiary,
  },
  datePickerButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.5,
  },
  datePickerButtonText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  datePickerButtonTextGo: {
    color: colors.text.primary,
  },
  datePickerButtonTextCancel: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  datePickerButtonTextDisabled: {
    color: colors.text.dim,
  },
  dateWarning: {
    fontSize: fontSize.sm,
    color: colors.accent.red,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.red + '40',
    borderRadius: borderRadius.md,
  },
  deleteButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.red + '10',
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.red,
  },
});
