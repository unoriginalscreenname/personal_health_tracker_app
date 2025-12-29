import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export interface FoodFormData {
  name: string;
  protein: number;
  calories: number;
  description?: string | null;
}

interface FoodFormProps {
  initialValues?: FoodFormData;
  onSave: (data: FoodFormData) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}

export function FoodForm({ initialValues, onSave, onCancel, saveLabel = 'Save' }: FoodFormProps) {
  // Form state
  const [name, setName] = useState(initialValues?.name ?? '');
  const [protein, setProtein] = useState(initialValues?.protein?.toString() ?? '0');
  const [calories, setCalories] = useState(initialValues?.calories?.toString() ?? '0');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [saving, setSaving] = useState(false);

  // Reset form when initialValues change (for edit mode)
  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name);
      setProtein(initialValues.protein.toString());
      setCalories(initialValues.calories.toString());
      setDescription(initialValues.description ?? '');
    }
  }, [initialValues]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);

    try {
      await onSave({
        name: trimmedName,
        protein: parseInt(protein, 10) || 0,
        calories: parseInt(calories, 10) || 0,
        description: description.trim() || null,
      });
    } catch (error) {
      console.error('Failed to save food:', error);
      setSaving(false);
    }
  }, [name, protein, calories, description, onSave]);

  const canSave = name.trim().length > 0 && !saving;

  return (
    <View style={styles.form}>
      {/* Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Lamb Curry"
          placeholderTextColor={colors.text.dim}
          value={name}
          onChangeText={setName}
          autoFocus={!initialValues}
          returnKeyType="next"
        />
      </View>

      {/* Protein & Calories Row */}
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>PROTEIN (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.dim}
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
        <View style={[styles.fieldGroup, styles.halfField]}>
          <Text style={styles.label}>CALORIES</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.dim}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>DESCRIPTION (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add details about this food..."
          placeholderTextColor={colors.text.dim}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          Use this for notes or details for future AI estimation
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {onCancel && (
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            !onCancel && styles.saveButtonFull,
            pressed && styles.saveButtonPressed,
            !canSave && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            {saving ? 'Saving...' : saveLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.dim,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.text.dim,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonFull: {
    flex: undefined,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButtonTextDisabled: {
    color: colors.text.dim,
  },
});
