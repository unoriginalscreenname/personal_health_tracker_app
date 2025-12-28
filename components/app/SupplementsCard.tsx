import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check, Circle, Droplets } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { type SupplementWithValue } from '@/db';

interface SupplementsCardProps {
  pillSupplements: SupplementWithValue[];
  waterSupplement: SupplementWithValue | undefined;
  onSupplementPress: (supplement: SupplementWithValue) => void;
  onWaterDotPress: (supplement: SupplementWithValue, dotIndex: number) => void;
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
      styles.dot,
      isFilled && styles.dotFilled,
      pressed && styles.dotPressed,
    ]}
    onPress={() => onPress(index)}
  />
);

export function SupplementsCard({
  pillSupplements,
  waterSupplement,
  onSupplementPress,
  onWaterDotPress,
}: SupplementsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.supplementGrid}>
        {pillSupplements.map((supplement) => {
          const isComplete = supplement.value >= supplement.target;
          return (
            <Pressable
              key={supplement.id}
              style={({ pressed }) => [
                styles.supplementCell,
                isComplete && styles.supplementCellTaken,
                pressed && styles.supplementPressed
              ]}
              onPress={() => onSupplementPress(supplement)}
            >
              <View style={[
                styles.supplementCheck,
                isComplete && styles.supplementCheckActive
              ]}>
                {isComplete ? (
                  <Check color={colors.background.primary} size={16} strokeWidth={3} />
                ) : (
                  <Circle color={colors.text.dim} size={16} />
                )}
              </View>
              <Text style={[
                styles.supplementName,
                isComplete && styles.supplementNameTaken
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
                onPress={(dotIndex) => onWaterDotPress(waterSupplement, dotIndex)}
              />
            ))}
          </View>
          <Text style={styles.waterCount}>
            {waterSupplement.value}/{waterSupplement.target}L
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
