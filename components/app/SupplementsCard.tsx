import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { Check, Circle, Droplets } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useSupplements, type SupplementWithValue } from '@/db';

interface SupplementsCardProps {
  date: string;
}

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

export function SupplementsCard({ date }: SupplementsCardProps) {
  const { getSupplementsForDate, toggleSupplement, setSupplementValue } = useSupplements();
  const [supplements, setSupplements] = useState<SupplementWithValue[]>([]);

  // Load supplements when date changes
  useEffect(() => {
    const load = async () => {
      const data = await getSupplementsForDate(date);
      setSupplements(data);
    };
    load();
  }, [date, getSupplementsForDate]);

  // Handle pill supplement tap
  const handleSupplementPress = useCallback(async (supp: SupplementWithValue) => {
    await toggleSupplement(supp.id, date);
    const updated = await getSupplementsForDate(date);
    setSupplements(updated);
  }, [date, toggleSupplement, getSupplementsForDate]);

  // Handle water dot tap
  const handleWaterDotPress = useCallback(async (supp: SupplementWithValue, dotIndex: number) => {
    const targetValue = dotIndex + 1;
    const newValue = supp.value === targetValue ? dotIndex : targetValue;
    await setSupplementValue(supp.id, date, newValue);
    const updated = await getSupplementsForDate(date);
    setSupplements(updated);
  }, [date, setSupplementValue, getSupplementsForDate]);

  const pillSupplements = supplements.filter(s => s.target === 1);
  const waterSupplement = supplements.find(s => s.name === 'Water');

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
              onPress={() => handleSupplementPress(supplement)}
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
