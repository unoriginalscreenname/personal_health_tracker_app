import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';
import { useMealEntries } from '@/db';

export default function CustomFoodScreen() {
  const router = useRouter();
  const { mealType, entryId } = useLocalSearchParams<{ mealType?: string; entryId?: string }>();

  const { createEntry, addCustomItemToEntry } = useMealEntries();

  // Form state
  const [name, setName] = useState('');
  const [protein, setProtein] = useState('0');
  const [calories, setCalories] = useState('0');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);

    try {
      let targetEntryId: number;

      // Use existing entry or create new one
      if (entryId) {
        targetEntryId = parseInt(entryId, 10);
      } else {
        targetEntryId = await createEntry(mealType || undefined);
      }

      // Add the custom food item
      await addCustomItemToEntry(
        targetEntryId,
        trimmedName,
        parseInt(protein, 10) || 0,
        parseInt(calories, 10) || 0,
        1,
        description.trim() || null
      );

      router.back();
    } catch (error) {
      console.error('Failed to save custom food:', error);
      setSaving(false);
    }
  }, [name, protein, calories, description, entryId, mealType, createEntry, addCustomItemToEntry, router]);

  const canSave = name.trim().length > 0 && !saving;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </Pressable>
          <Text style={styles.title}>Add Custom Food</Text>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              !canSave && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Check color={canSave ? colors.text.primary : colors.text.dim} size={24} />
          </Pressable>
        </View>

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
              autoFocus
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

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButtonLarge,
              pressed && styles.saveButtonLargePressed,
              !canSave && styles.saveButtonLargeDisabled
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
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
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: {
    opacity: 0.7,
  },
  saveButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  },
  form: {
    padding: spacing.md,
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
  saveButtonLarge: {
    backgroundColor: colors.accent.green,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveButtonLargePressed: {
    opacity: 0.8,
  },
  saveButtonLargeDisabled: {
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
