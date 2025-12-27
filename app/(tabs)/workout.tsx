import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function WorkoutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Armory</Text>
          <Text style={styles.subtitle}>Track your training</Text>
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
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    marginTop: spacing.xs,
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
