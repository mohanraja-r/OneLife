import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '../constants/theme';

import BottomSheet, { sheetStyles } from './ui/BottomSheet';

/**
 * What the sheet is editing, which decides its copy and bounds.
 *
 * Steps are not here: they come from the device pedometer now, so the only
 * numbers a user types are the two goals and a one-off water amount.
 */
export type HealthField = 'stepGoal' | 'waterGoal' | 'addWater';

interface FieldConfig {
  title: string;
  subtitle: string;
  unit: string;
  /** Rejected below this, so a goal can never be saved at zero. */
  min: number;
  /** Rejected above this — a guard against a stray extra digit. */
  max: number;
}

/** Copy and bounds for each editable number. */
export const HEALTH_FIELDS: Record<HealthField, FieldConfig> = {
  stepGoal: {
    title: 'Daily step goal',
    subtitle: '10,000 is the usual target, but pick what suits you.',
    unit: 'steps',
    min: 1,
    max: 200000,
  },
  waterGoal: {
    title: 'Daily water goal',
    subtitle: 'Around 2,000 ml suits most adults.',
    unit: 'ml',
    min: 1,
    max: 10000,
  },
  addWater: {
    title: 'Add water',
    subtitle: 'How much did you just drink?',
    unit: 'ml',
    min: 1,
    max: 5000,
  },
};

interface Props {
  /** Which number to edit, or null to keep the sheet closed. */
  field: HealthField | null;
  /** Value the input opens on. */
  initialValue: number;
  onClose: () => void;
  onSave: (field: HealthField, value: number) => void;
}

/**
 * The numeric-entry sheet behind every editable number on the Health tab —
 * today's step count and both goals — so the three share one keyboard, one set
 * of bounds checks and one save action.
 */
export default function HealthValueSheet({
  field,
  initialValue,
  onClose,
  onSave,
}: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Re-seeded whenever the sheet opens on a different number, so it never
  // shows the value left behind by the last field edited.
  useEffect(() => {
    if (field) {
      setText(initialValue > 0 ? String(initialValue) : '');
      setError(null);
    }
  }, [field, initialValue]);

  const config = field ? HEALTH_FIELDS[field] : null;

  /** Validates the typed number and passes it up, or shows why it was rejected. */
  const handleSave = () => {
    if (!field || !config) return;

    const value = Number(text.trim());
    if (!text.trim() || !Number.isFinite(value)) {
      setError('Enter a number.');
      return;
    }
    if (value < config.min || value > config.max) {
      setError(
        `Enter a value between ${config.min.toLocaleString()} and ${config.max.toLocaleString()}.`
      );
      return;
    }

    onSave(field, Math.round(value));
    onClose();
  };

  return (
    <BottomSheet visible={field !== null} onClose={onClose} avoidKeyboard>
      {config && (
        <View>
          <Text style={sheetStyles.title}>{config.title}</Text>
          <Text style={sheetStyles.subtitle}>{config.subtitle}</Text>

          <Text style={sheetStyles.label}>{config.unit.toUpperCase()}</Text>
          <TextInput
            style={sheetStyles.input}
            value={text}
            onChangeText={(next) => {
              // Digits only: the keyboard type is a hint, not a guarantee, and
              // pasting can still deliver anything.
              setText(next.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel={config.title}
          />

          {error && (
            <Text style={[sheetStyles.subtitle, { color: Colors.error }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[sheetStyles.save, { backgroundColor: Colors.primary }]}
            onPress={handleSave}
            accessibilityRole="button">
            <Text style={sheetStyles.saveLabel}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={sheetStyles.cancel}
            onPress={onClose}
            accessibilityRole="button">
            <Text style={sheetStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
}
