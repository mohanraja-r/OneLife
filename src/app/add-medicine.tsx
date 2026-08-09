import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import TimePickerField from '../components/TimePickerField';
import { ChipOption, ChipRow, LoadingState } from '../components/ui';
import {
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import {
  DurationType,
  FoodRelation,
  MedicineInput,
  addMedicine,
  deleteMedicine,
  formatTimeLabel,
  getMedicineById,
  toDateString,
  updateMedicine,
} from '../services/medicine';

const FREQUENCIES: ChipOption<string>[] = [
  { value: 'Once daily', label: 'Once daily' },
  { value: 'Twice daily', label: 'Twice daily' },
  { value: 'Three times daily', label: 'Three times daily' },
  { value: 'As needed', label: 'As needed' },
];

const FOOD_RELATIONS: ChipOption<FoodRelation>[] = [
  { value: 'before', label: 'Before food' },
  { value: 'after', label: 'After food' },
  { value: 'any', label: 'Any time' },
];

const DURATIONS: ChipOption<DurationType>[] = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'course', label: 'Fixed course' },
];

/**
 * Repairs a stored slot that is not a valid `HH:MM`.
 *
 * The picker can only produce valid times, but rows saved before it existed
 * may hold anything the old free-text field accepted.
 */
function repairTime(value: string): string {
  return formatTimeLabel(value) === value ? '09:00' : value;
}

/** Counts whole days from today up to and including an end date. */
function daysUntil(endDate: string): string {
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - today.getTime()) / 86400000);
  return days > 0 ? String(days) : '';
}

/** Turns a course length in days into the `YYYY-MM-DD` date it ends on. */
function endDateAfter(days: number): string {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + days);
  return toDateString(end);
}

export default function AddMedicineScreen() {
  const insets = useSafeAreaInsets();
  // `memberId` arrives when the form is opened from a managed family member's
  // profile — the medicine is then filed under them rather than the caregiver.
  const { medicineId, memberId } = useLocalSearchParams<{
    medicineId?: string;
    memberId?: string;
  }>();
  const isEditing = !!medicineId;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState(FREQUENCIES[0].value);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [foodRelation, setFoodRelation] = useState<FoodRelation>('after');
  const [durationType, setDurationType] = useState<DurationType>('ongoing');
  const [courseDays, setCourseDays] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!medicineId) return;

    getMedicineById(medicineId)
      .then((med) => {
        if (!med) {
          Alert.alert('Medicine not found', 'It may have been deleted.');
          router.back();
          return;
        }
        setName(med.name);
        setDosage(med.dosage);
        setFrequency(med.frequency);
        setTimes(med.times.length ? med.times.map(repairTime) : ['09:00']);
        setFoodRelation(med.foodRelation);
        setDurationType(med.durationType);
        setCourseDays(
          med.durationEndDate ? daysUntil(med.durationEndDate) : ''
        );
        setActive(med.active);
      })
      .catch((err: unknown) =>
        Alert.alert(
          'Error loading medicine',
          errorMessage(err, 'Something went wrong.')
        )
      )
      .finally(() => setLoading(false));
  }, [medicineId]);

  /** Appends another reminder slot to the schedule. */
  const addTimeSlot = () => setTimes([...times, '09:00']);

  /** Replaces the reminder slot at `index` with a new `HH:MM` value. */
  const updateTime = (index: number, value: string) =>
    setTimes(times.map((time, i) => (i === index ? value : time)));

  /** Removes the reminder slot at `index`. */
  const removeTime = (index: number) =>
    setTimes(times.filter((_, i) => i !== index));

  const canSave = !!name.trim() && !!dosage.trim() && times.length > 0;

  /** Saves the form as a new medicine, or applies it to the one being edited. */
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const days = Number(courseDays);
      const input: MedicineInput = {
        name,
        dosage,
        frequency,
        times,
        foodRelation,
        durationType,
        durationEndDate:
          durationType === 'course' && days > 0 ? endDateAfter(days) : null,
        active,
      };

      if (isEditing) await updateMedicine(medicineId, input);
      else await addMedicine(input, memberId ?? null);

      // TODO(notifications): reminders are not wired up yet. Once implemented,
      // schedule one local notification per entry in `times` here (and cancel
      // the previous ones when editing). See scan-prescription.tsx for the
      // other call site that needs it.

      router.back();
    } catch (err) {
      Alert.alert(
        'Error saving medicine',
        errorMessage(err, 'Something went wrong.')
      );
    } finally {
      setSaving(false);
    }
  };

  /** Confirms, then deletes the medicine and its dose history. */
  const handleDelete = () => {
    Alert.alert(
      'Delete medicine?',
      `This removes ${name || 'this medicine'} and its dose history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMedicine(medicineId!);
                router.back();
              } catch (err) {
                Alert.alert(
                  'Error deleting medicine',
                  errorMessage(err, 'Something went wrong.')
                );
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ChevronLeft size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Medicine' : 'Add Medicine'}
        </Text>
        {isEditing ? (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Delete medicine">
            <Trash2 size={20} color={Colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <LoadingState fill />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: Motion.base }}
              style={styles.card}>
              <Text style={styles.label}>Medicine name</Text>
              <TextInput
                style={styles.field}
                placeholder="e.g. Metformin"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Dose</Text>
              <TextInput
                style={styles.field}
                placeholder="e.g. 500mg · 1 tablet"
                placeholderTextColor={Colors.textMuted}
                value={dosage}
                onChangeText={setDosage}
              />

              <Text style={styles.label}>Frequency</Text>
              <ChipRow
                options={FREQUENCIES}
                value={frequency}
                onChange={setFrequency}
                wrap
                style={styles.chipRow}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: Motion.base,
                delay: Motion.stagger,
              }}
              style={styles.card}>
              <Text style={styles.label}>Reminder times</Text>
              {times.map((time, index) => (
                <TimePickerField
                  key={index}
                  value={time}
                  onChange={(next) => updateTime(index, next)}
                  onRemove={
                    times.length > 1 ? () => removeTime(index) : undefined
                  }
                />
              ))}

              <TouchableOpacity
                onPress={addTimeSlot}
                style={styles.addTimeRow}
                accessibilityRole="button">
                <Plus size={16} color={Colors.primary} strokeWidth={2.4} />
                <Text style={styles.addTimeText}>Add another time</Text>
              </TouchableOpacity>
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: Motion.base,
                delay: Motion.stagger * 2,
              }}
              style={styles.card}>
              <Text style={styles.label}>Relation to food</Text>
              <ChipRow
                options={FOOD_RELATIONS}
                value={foodRelation}
                onChange={setFoodRelation}
                wrap
                style={styles.chipRow}
              />

              <Text style={styles.label}>Duration</Text>
              <ChipRow
                options={DURATIONS}
                value={durationType}
                onChange={setDurationType}
                wrap
                style={styles.chipRow}
              />

              {durationType === 'course' && (
                <View style={styles.courseRow}>
                  <TextInput
                    style={[styles.field, styles.courseInput]}
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                    value={courseDays}
                    onChangeText={(value) =>
                      setCourseDays(value.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.courseUnit}>days from today</Text>
                </View>
              )}

              {isEditing && (
                <View style={styles.pauseRow}>
                  <View style={styles.pauseText}>
                    <Text style={styles.pauseTitle}>Reminders on</Text>
                    <Text style={styles.pauseSubtitle}>
                      Turn off to pause this medicine without losing its
                      history.
                    </Text>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{
                      false: Colors.surfaceSunken,
                      true: Colors.primary,
                    }}
                    thumbColor={Colors.surface}
                    accessibilityLabel="Reminders on"
                  />
                </View>
              )}
            </MotiView>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}>
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save medicine'}
              hideArrow
              disabled={!canSave || saving}
              onPress={() => void handleSave()}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  headerSpacer: { width: 26 },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  field: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  chipRow: { marginBottom: Spacing.lg },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  addTimeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  courseInput: {
    width: 88,
    marginBottom: 0,
    textAlign: 'center',
  },
  courseUnit: {
    ...Typography.secondary,
    color: Colors.textSecondary,
  },
  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
    marginTop: Spacing.xs,
  },
  pauseText: { flex: 1 },
  pauseTitle: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  pauseSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    ...Shadow.floating,
  },
});
