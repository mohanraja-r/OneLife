import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors, Spacing } from '../constants/theme';
import {
  ENERGY_LABELS,
  ENERGY_LEVELS,
  EnergyLevel,
  STRESS_LABELS,
  STRESS_LEVELS,
  StressLevel,
  VITAL_BOUNDS,
  VITAL_LABELS,
  VitalField,
  VitalPatch,
  VitalsEntry,
  splitSleep,
} from '../services/vitals';

import BottomSheet, { sheetStyles } from './ui/BottomSheet';
import ChipRow from './ui/ChipRow';

/** Prompt under each field's title, explaining what is being asked for. */
const SUBTITLES: Record<VitalField, string> = {
  heartRate: 'Your resting heart rate, from a watch, band or a manual count.',
  sleepMinutes: 'How long you actually slept last night.',
  stress: 'How stressed did the day feel?',
  energy: 'How much energy have you had today?',
};

const STRESS_OPTIONS = STRESS_LEVELS.map((value) => ({
  label: STRESS_LABELS[value],
  value,
}));

const ENERGY_OPTIONS = ENERGY_LEVELS.map((value) => ({
  label: ENERGY_LABELS[value],
  value,
}));

interface Props {
  /** Which metric to log, or null to keep the sheet closed. */
  field: VitalField | null;
  /** The day's current readings, which seed the inputs. */
  entry: VitalsEntry;
  onClose: () => void;
  onSave: (patch: VitalPatch) => void;
}

/**
 * The logging sheet behind every row of Home's Health Overview card.
 *
 * One sheet for all four metrics so they share a keyboard, a set of bounds
 * checks and a save action — the same arrangement `HealthValueSheet` uses for
 * steps and the two goals.
 *
 * Clearing the input saves null rather than zero: "I did not log this" and "I
 * slept zero minutes" are different claims and the card renders them
 * differently.
 */
export default function VitalsSheet({ field, entry, onClose, onSave }: Props) {
  const [bpm, setBpm] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [stress, setStress] = useState<StressLevel>('low');
  const [energy, setEnergy] = useState<EnergyLevel>('good');
  const [error, setError] = useState<string | null>(null);

  // Re-seeded whenever the sheet opens, so it never shows the value left behind
  // by the last metric edited.
  useEffect(() => {
    if (!field) return;

    setError(null);
    setBpm(entry.heartRate === null ? '' : String(entry.heartRate));

    const sleep = splitSleep(entry.sleepMinutes ?? 0);
    setHours(entry.sleepMinutes === null ? '' : String(sleep.hours));
    setMinutes(entry.sleepMinutes === null ? '' : String(sleep.minutes));

    setStress(entry.stress ?? 'low');
    setEnergy(entry.energy ?? 'good');
  }, [field, entry]);

  /** Strips anything that is not a digit — paste can deliver more than the keypad. */
  const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

  /** Validates the open field and hands the resulting patch up. */
  const handleSave = () => {
    if (!field) return;

    if (field === 'heartRate') {
      if (!bpm.trim()) {
        onSave({ field: 'heartRate', value: null });
        onClose();
        return;
      }
      const value = Number(bpm);
      const { min, max } = VITAL_BOUNDS.heartRate;
      if (!Number.isFinite(value) || value < min || value > max) {
        setError(`Enter a heart rate between ${min} and ${max} bpm.`);
        return;
      }
      onSave({ field: 'heartRate', value });
      onClose();
      return;
    }

    if (field === 'sleepMinutes') {
      if (!hours.trim() && !minutes.trim()) {
        onSave({ field: 'sleepMinutes', value: null });
        onClose();
        return;
      }
      const mins = Number(minutes || 0);
      if (mins > 59) {
        setError('Minutes must be under 60 — put the rest in hours.');
        return;
      }
      const total = Number(hours || 0) * 60 + mins;
      if (total > VITAL_BOUNDS.sleepMinutes.max) {
        setError('That is more than a day of sleep.');
        return;
      }
      onSave({ field: 'sleepMinutes', value: total });
      onClose();
      return;
    }

    if (field === 'stress') onSave({ field: 'stress', value: stress });
    if (field === 'energy') onSave({ field: 'energy', value: energy });
    onClose();
  };

  return (
    <BottomSheet visible={field !== null} onClose={onClose} avoidKeyboard>
      {field && (
        <View>
          <Text style={sheetStyles.title}>{VITAL_LABELS[field]}</Text>
          <Text style={sheetStyles.subtitle}>{SUBTITLES[field]}</Text>

          {field === 'heartRate' && (
            <>
              <Text style={sheetStyles.label}>BPM</Text>
              <TextInput
                style={sheetStyles.input}
                value={bpm}
                onChangeText={(next) => {
                  setBpm(digitsOnly(next));
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                accessibilityLabel="Resting heart rate in beats per minute"
              />
            </>
          )}

          {field === 'sleepMinutes' && (
            <View style={styles.splitRow}>
              <View style={styles.splitField}>
                <Text style={sheetStyles.label}>HOURS</Text>
                <TextInput
                  style={sheetStyles.input}
                  value={hours}
                  onChangeText={(next) => {
                    setHours(digitsOnly(next));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Hours slept"
                />
              </View>
              <View style={styles.splitField}>
                <Text style={sheetStyles.label}>MINUTES</Text>
                <TextInput
                  style={sheetStyles.input}
                  value={minutes}
                  onChangeText={(next) => {
                    setMinutes(digitsOnly(next));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  accessibilityLabel="Minutes slept"
                />
              </View>
            </View>
          )}

          {field === 'stress' && (
            <ChipRow
              options={STRESS_OPTIONS}
              value={stress}
              onChange={setStress}
              style={styles.chips}
            />
          )}

          {field === 'energy' && (
            <ChipRow
              options={ENERGY_OPTIONS}
              value={energy}
              onChange={setEnergy}
              wrap
              style={styles.chips}
            />
          )}

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

const styles = StyleSheet.create({
  splitRow: { flexDirection: 'row', gap: Spacing.md },
  splitField: { flex: 1 },
  chips: { marginTop: Spacing.md },
});
