import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

const mealInfo: Record<string, { name: string; time: string }> = {
  opener: { name: 'The Opener', time: '12 PM' },
  bridge: { name: 'The Bridge', time: '3 PM' },
  closer: { name: 'The Closer', time: '6 PM' },
};

const commonFoods = [
  { id: '1', name: 'Chicken Breast', protein: 31, calories: 165 },
  { id: '2', name: 'Greek Yogurt', protein: 17, calories: 100 },
  { id: '3', name: 'Eggs (2)', protein: 12, calories: 140 },
  { id: '4', name: 'Salmon Fillet', protein: 25, calories: 208 },
  { id: '5', name: 'Protein Shake', protein: 25, calories: 120 },
  { id: '6', name: 'Cottage Cheese', protein: 14, calories: 98 },
  { id: '7', name: 'Turkey Slices', protein: 18, calories: 70 },
  { id: '8', name: 'Tuna Can', protein: 20, calories: 90 },
];

export default function MealDetailScreen() {
  const { meal } = useLocalSearchParams<{ meal: string }>();
  const router = useRouter();
  const info = mealInfo[meal] || { name: 'Meal', time: '' };

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
        <View style={styles.headerText}>
          <Text style={styles.title}>{info.name}</Text>
          <Text style={styles.time}>{info.time}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add Food Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add custom food..."
            placeholderTextColor={colors.text.dim}
          />
          <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
            <Plus color={colors.text.primary} size={20} />
          </Pressable>
        </View>

        {/* Common Foods */}
        <Text style={styles.sectionLabel}>QUICK ADD</Text>
        <View style={styles.foodList}>
          {commonFoods.map((food) => (
            <Pressable
              key={food.id}
              style={({ pressed }) => [styles.foodItem, pressed && styles.foodItemPressed]}
            >
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodMacros}>{food.protein}g protein · {food.calories} cal</Text>
              </View>
              <View style={styles.foodAdd}>
                <Plus color={colors.accent.green} size={20} />
              </View>
            </Pressable>
          ))}
        </View>
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
  },
  time: {
    fontSize: fontSize.sm,
    color: colors.text.dim,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  foodList: {
    gap: spacing.sm,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  foodItemPressed: {
    opacity: 0.7,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  foodMacros: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  foodAdd: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
