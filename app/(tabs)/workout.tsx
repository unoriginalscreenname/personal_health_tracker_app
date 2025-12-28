import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function WorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Dumbbell color={colors.text.primary} size={24} />
          <Text style={styles.title}>Work</Text>
        </View>

        {/* Workout Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Workout</Text>
          <Text style={styles.cardText}>Workout type selector will go here</Text>
          <Text style={styles.workoutOptions}>Upper A | Lower A | Upper B | Lower B | Rest</Text>
        </View>

        {/* Exercise List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exercises</Text>
          <Text style={styles.cardText}>Exercise inputs will go here</Text>
        </View>

        {/* Supplements */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Stack</Text>
          <Text style={styles.cardText}>Creatine, Magnesium, NAC, Water</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '200',
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  workoutOptions: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
});
