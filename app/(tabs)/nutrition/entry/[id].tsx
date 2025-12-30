import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Plus, Trash2, X, PenLine, Clock } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useFoods, useMealEntries, type Food, type MealEntry, type MealEntryItem } from '@/db';
import { FoodForm, type FoodFormData } from '@/components/app/FoodForm';

// Format ISO timestamp to display time (e.g., "12:15 PM")
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const entryId = parseInt(id, 10);

  // Database hooks
  const { getFoods } = useFoods();
  const { getEntry, addFoodToEntry, removeItem, deleteEntry, updateEntryTime, updateItem } = useMealEntries();

  // State
  const [entry, setEntry] = useState<MealEntry | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');
  const [editingItem, setEditingItem] = useState<MealEntryItem | null>(null);

  // Load entry and foods
  const loadData = useCallback(async () => {
    try {
      const [entryData, foodsData] = await Promise.all([
        getEntry(entryId),
        getFoods(),
      ]);
      setEntry(entryData);
      setFoods(foodsData);
    } catch (error) {
      console.error('Failed to load entry:', error);
    }
  }, [entryId, getEntry, getFoods]);

  // Reload data when screen comes into focus (e.g., after adding custom food)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle adding a food from the quick add list
  const handleAddFood = useCallback(async (food: Food) => {
    try {
      await addFoodToEntry(entryId, food);
      await loadData();
      setShowAddFood(false);
    } catch (error) {
      console.error('Failed to add food:', error);
      Alert.alert('Error', 'Failed to add food');
    }
  }, [entryId, addFoodToEntry, loadData]);

  // Navigate to custom food screen (at root level)
  const handleAddCustomFood = useCallback(() => {
    router.push({
      pathname: '/custom-food',
      params: { entryId: entryId.toString() }
    });
  }, [entryId, router]);

  // Handle removing an item (no confirmation)
  const handleRemoveItem = useCallback(async (itemId: number) => {
    try {
      await removeItem(itemId);
      await loadData();
    } catch (error) {
      console.error('Failed to remove item:', error);
      Alert.alert('Error', 'Failed to remove item');
    }
  }, [removeItem, loadData]);

  // Handle editing an item
  const handleEditItem = useCallback((item: MealEntryItem) => {
    setEditingItem(item);
  }, []);

  // Handle saving edited item
  const handleSaveEditedItem = useCallback(async (data: FoodFormData) => {
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, {
        name: data.name,
        protein: data.protein,
        calories: data.calories,
      });
      setEditingItem(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  }, [editingItem, updateItem, loadData]);

  // Handle deleting the entire entry
  const handleDeleteEntry = useCallback(() => {
    Alert.alert(
      'Delete Entry',
      'Delete this entire meal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entryId);
              router.back();
            } catch (error) {
              console.error('Failed to delete entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  }, [entryId, deleteEntry, router]);

  // Open time picker with current entry time
  const handleOpenTimePicker = useCallback(() => {
    if (!entry) return;
    const date = new Date(entry.logged_at);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    setSelectedHour(hours);
    setSelectedMinute(minutes);
    setSelectedAmPm(ampm);
    setShowTimePicker(true);
  }, [entry]);

  // Save the new time
  const handleSaveTime = useCallback(async () => {
    if (!entry) return;
    try {
      const date = new Date(entry.logged_at);
      let hours = selectedHour;
      if (selectedAmPm === 'PM' && hours !== 12) hours += 12;
      if (selectedAmPm === 'AM' && hours === 12) hours = 0;
      date.setHours(hours, selectedMinute, 0, 0);
      await updateEntryTime(entryId, date);
      await loadData();
      setShowTimePicker(false);
    } catch (error) {
      console.error('Failed to update time:', error);
      Alert.alert('Error', 'Failed to update time');
    }
  }, [entry, selectedHour, selectedMinute, selectedAmPm, entryId, updateEntryTime, loadData]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </Pressable>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalProtein = entry.items.reduce((sum, item) => sum + (item.protein * item.quantity), 0);
  const totalCalories = entry.items.reduce((sum, item) => sum + (item.calories * item.quantity), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.text.primary} size={24} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.headerText, pressed && styles.headerTextPressed]}
          onPress={handleOpenTimePicker}
        >
          <Clock color={colors.text.dim} size={16} style={{ marginRight: spacing.xs }} />
          <Text style={styles.title}>{formatTime(entry.logged_at)}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          onPress={handleDeleteEntry}
        >
          <Trash2 color={colors.accent.red} size={20} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Totals */}
        <View style={styles.totalsRow}>
          <Text style={styles.totalProtein}>{Math.round(totalProtein)}g protein</Text>
          <Text style={styles.totalCalories}>{totalCalories} cal</Text>
        </View>

        {/* Items */}
        <View style={styles.itemsList}>
          {entry.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMacros}>
                  {Math.round(item.protein * item.quantity)}g · {Math.round(item.calories * item.quantity)} cal
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
                onPress={() => handleEditItem(item)}
              >
                <PenLine color={colors.text.dim} size={16} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                onPress={() => handleRemoveItem(item.id)}
              >
                <X color={colors.text.dim} size={18} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Add Food Section */}
        {!showAddFood ? (
          <Pressable
            style={({ pressed }) => [styles.addFoodButton, pressed && styles.addFoodButtonPressed]}
            onPress={() => setShowAddFood(true)}
          >
            <Plus color={colors.accent.green} size={18} />
            <Text style={styles.addFoodButtonText}>Add food to this entry</Text>
          </Pressable>
        ) : (
          <View style={styles.addFoodSection}>
            <View style={styles.addFoodHeader}>
              <Text style={styles.sectionLabel}>ADD FOOD</Text>
              <Pressable onPress={() => setShowAddFood(false)}>
                <X color={colors.text.dim} size={20} />
              </Pressable>
            </View>

            {/* Custom Food Button */}
            <Pressable
              style={({ pressed }) => [styles.customFoodButton, pressed && styles.customFoodButtonPressed]}
              onPress={handleAddCustomFood}
            >
              <PenLine color={colors.text.secondary} size={16} />
              <Text style={styles.customFoodButtonText}>Add custom food...</Text>
            </Pressable>

            {/* Quick Add Foods */}
            <Text style={styles.quickAddLabel}>QUICK ADD</Text>
            <View style={styles.quickAddList}>
              {foods.map((food) => (
                <Pressable
                  key={food.id}
                  style={({ pressed }) => [styles.quickAddItem, pressed && styles.quickAddItemPressed]}
                  onPress={() => handleAddFood(food)}
                >
                  <Text style={styles.quickAddName}>{food.name}</Text>
                  <Text style={styles.quickAddMacros}>{food.protein}g</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.timePickerContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.timePickerTitle}>Set Time</Text>

            <View style={styles.timePickerRow}>
              {/* Hour */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedHour(h => h === 12 ? 1 : h + 1)}
                >
                  <Text style={styles.timePickerArrowText}>▲</Text>
                </Pressable>
                <Text style={styles.timePickerValue}>{selectedHour}</Text>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedHour(h => h === 1 ? 12 : h - 1)}
                >
                  <Text style={styles.timePickerArrowText}>▼</Text>
                </Pressable>
              </View>

              <Text style={styles.timePickerColon}>:</Text>

              {/* Minute */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedMinute(m => (m + 5) % 60)}
                >
                  <Text style={styles.timePickerArrowText}>▲</Text>
                </Pressable>
                <Text style={styles.timePickerValue}>{String(selectedMinute).padStart(2, '0')}</Text>
                <Pressable
                  style={styles.timePickerArrow}
                  onPress={() => setSelectedMinute(m => (m - 5 + 60) % 60)}
                >
                  <Text style={styles.timePickerArrowText}>▼</Text>
                </Pressable>
              </View>

              {/* AM/PM */}
              <View style={styles.timePickerColumn}>
                <Pressable
                  style={[styles.amPmButton, selectedAmPm === 'AM' && styles.amPmButtonActive]}
                  onPress={() => setSelectedAmPm('AM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'AM' && styles.amPmTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.amPmButton, selectedAmPm === 'PM' && styles.amPmButtonActive]}
                  onPress={() => setSelectedAmPm('PM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'PM' && styles.amPmTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.timePickerButtons}>
              <Pressable
                style={styles.timePickerCancel}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.timePickerSave}
                onPress={handleSaveTime}
              >
                <Text style={styles.timePickerSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <Pressable style={styles.editModalOverlay} onPress={() => setEditingItem(null)}>
            <Pressable style={styles.editModalContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Food</Text>
                <Pressable onPress={() => setEditingItem(null)}>
                  <X color={colors.text.dim} size={24} />
                </Pressable>
              </View>
              {editingItem && (
                <FoodForm
                  initialValues={{
                    name: editingItem.name,
                    protein: editingItem.protein,
                    calories: editingItem.calories,
                  }}
                  onSave={handleSaveEditedItem}
                  onCancel={() => setEditingItem(null)}
                  saveLabel="Update"
                />
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    padding: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextPressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.red + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  totalProtein: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.green,
  },
  totalCalories: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
  itemsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemMacros: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  editButtonPressed: {
    opacity: 0.7,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.green + '40',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  addFoodButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.accent.green + '10',
  },
  addFoodButtonText: {
    fontSize: fontSize.sm,
    color: colors.accent.green,
  },
  addFoodSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  addFoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
  },
  customFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  customFoodButtonPressed: {
    opacity: 0.7,
  },
  customFoodButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  quickAddLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  quickAddList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickAddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  quickAddItemPressed: {
    opacity: 0.7,
  },
  quickAddName: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  quickAddMacros: {
    fontSize: fontSize.xs,
    color: colors.accent.green,
    fontWeight: '600',
  },

  // Time Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 320,
  },
  timePickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  timePickerColumn: {
    alignItems: 'center',
  },
  timePickerArrow: {
    padding: spacing.sm,
  },
  timePickerArrowText: {
    fontSize: fontSize.lg,
    color: colors.text.muted,
  },
  timePickerValue: {
    fontSize: 32,
    fontWeight: '200',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
  timePickerColon: {
    fontSize: 32,
    fontWeight: '200',
    color: colors.text.dim,
    marginBottom: spacing.md,
  },
  amPmButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  amPmButtonActive: {
    backgroundColor: colors.accent.blue,
  },
  amPmText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    fontWeight: '500',
  },
  amPmTextActive: {
    color: colors.text.primary,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timePickerCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  timePickerSave: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent.green,
    alignItems: 'center',
  },
  timePickerSaveText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
  },

  // Edit Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  editModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
