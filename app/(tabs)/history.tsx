import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Log</Text>
          <Text style={styles.subtitle}>Your progress over time</Text>
        </View>

        {/* Calendar View */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Calendar</Text>
          <Text style={styles.cardText}>Calendar with green/red dots will go here</Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stats</Text>
          <Text style={styles.cardText}>Progress charts will go here</Text>
        </View>

        {/* Recent Days */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Days</Text>
          <Text style={styles.cardText}>List of recent day summaries</Text>
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
});
