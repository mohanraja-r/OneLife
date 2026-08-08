import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { MealItem, SERVING_UNITS } from '../services/meals';

import BottomSheet, { sheetStyles } from './ui/BottomSheet';
import ChipRow from './ui/ChipRow';

interface Props {
  /** The item being edited, or null when the sheet is closed. */
  item: MealItem | null;
  onSave: (item: MealItem) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Parses a numeric field, treating an empty or malformed entry as zero so the
 *  totals never turn into NaN. */
function toNumber(text: string): number {
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

const unitOptions = SERVING_UNITS.map((unit) => ({ label: unit, value: unit }));

/**
 * The edit sheet behind every row on the confirm screen: rename the food,
 * correct the serving size, and adjust the four macros before saving the meal.
 */
export default function EditMealItemSheet({ item, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<string>(SERVING_UNITS[0]);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');

  // Re-seed the fields whenever a different row opens the sheet.
  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setQuantity(item.quantity !== undefined ? String(item.quantity) : '');
    setUnit(item.unit ?? SERVING_UNITS[0]);
    setCalories(String(item.calories));
    setProtein(String(item.protein));
    setFat(String(item.fat));
    setCarbs(String(item.carbs));
  }, [item]);

  /** Folds the field values back into a MealItem and hands it to the caller. */
  const handleDone = () => {
    const trimmedQuantity = quantity.trim();
    onSave({
      name: name.trim() || 'Untitled item',
      calories: toNumber(calories),
      protein: toNumber(protein),
      carbs: toNumber(carbs),
      fat: toNumber(fat),
      quantity: trimmedQuantity ? toNumber(trimmedQuantity) : undefined,
      unit: trimmedQuantity ? unit : undefined,
    });
  };

  const macroFields = [
    { label: 'Calories', suffix: 'kcal', value: calories, onChange: setCalories },
    { label: 'Protein', suffix: 'g', value: protein, onChange: setProtein },
    { label: 'Fat', suffix: 'g', value: fat, onChange: setFat },
    { label: 'Carbohydrates', suffix: 'g', value: carbs, onChange: setCarbs },
  ];

  return (
    <BottomSheet visible={item !== null} onClose={onClose} avoidKeyboard grabberGap={Spacing.md}>
      <Text style={sheetStyles.pickerTitle}>Edit Item</Text>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={sheetStyles.label}>Food Name</Text>
        <TextInput
          style={sheetStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Grilled chicken"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={sheetStyles.label}>Serving Size</Text>
        <TextInput
          style={sheetStyles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="Amount"
          placeholderTextColor={Colors.textMuted}
        />
        <ChipRow options={unitOptions} value={unit} onChange={setUnit} wrap style={styles.units} />

        <Text style={styles.sectionLabel}>Nutrition Information</Text>
        {macroFields.map((field) => (
          <View key={field.label} style={styles.macroRow}>
            <Text style={styles.macroLabel}>{field.label}</Text>
            <View style={styles.macroInputWrap}>
              <TextInput
                style={styles.macroInput}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.macroSuffix}>{field.suffix}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.delete}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete item">
          <Trash2 size={18} color={Colors.danger} strokeWidth={2} />
          <Text style={styles.deleteText}>Delete Item</Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[sheetStyles.save, styles.done]}
        onPress={handleDone}
        accessibilityRole="button"
        accessibilityLabel="Done editing item">
        <Text style={sheetStyles.saveLabel}>Done</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Capped so a long form scrolls inside the sheet instead of pushing the
  // Done button off screen.
  scroll: { maxHeight: 420 },
  units: { marginTop: Spacing.sm },
  sectionLabel: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  macroLabel: { ...Typography.body, fontSize: 15, color: Colors.textSecondary },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
  },
  macroInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
    textAlign: 'right',
  },
  macroSuffix: { ...Typography.caption, color: Colors.textMuted },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorTint,
  },
  deleteText: { ...Typography.button, fontSize: 15, color: Colors.danger },
  done: { backgroundColor: Colors.primary },
});
