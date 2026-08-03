import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getMedicineById,
  FoodRelation,
  DurationType,
} from '../services/medicine';
import { requestNotificationPermission, scheduleMedicineReminder } from '../services/notifications';
import { Colors, Spacing, Radius } from '../constants/theme';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Custom'];
const FOOD_RELATIONS: { value: FoodRelation; label: string }[] = [
  { value: 'before', label: 'Before food' },
  { value: 'after', label: 'After food' },
  { value: 'any', label: 'Any time' },
];

export default function AddMedicineScreen() {
  const { medicineId } = useLocalSearchParams<{ medicineId?: string }>();
  const isEditing = !!medicineId;

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState(FREQUENCIES[0]);
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [foodRelation, setFoodRelation] = useState<FoodRelation>('after');
  const [durationType, setDurationType] = useState<DurationType>('ongoing');
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  useEffect(() => {
    if (!medicineId) return;
    getMedicineById(medicineId)
      .then((med) => {
        setName(med.name);
        setDosage(med.dosage);
        setFrequency(med.frequency);
        setTimes(med.times);
        setFoodRelation(med.food_relation);
        setDurationType(med.duration_type);
      })
      .catch((err) => Alert.alert('Error loading medicine', err.message))
      .finally(() => setLoadingExisting(false));
  }, [medicineId]);

  const addTimeSlot = () => setTimes([...times, '09:00']);
  const updateTime = (index: number, value: string) => {
    const updated = [...times];
    updated[index] = value;
    setTimes(updated);
  };
  const removeTime = (index: number) => setTimes(times.filter((_, i) => i !== index));

  const canSave = name.trim() && dosage.trim() && times.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = { name, dosage, frequency, times, foodRelation, durationType };
      const medicine = isEditing
        ? await updateMedicine(medicineId!, input)
        : await addMedicine(input);

      if (Platform.OS !== 'android') {
        const granted = await requestNotificationPermission();
        if (granted) {
          for (const time of times) {
            await scheduleMedicineReminder(medicine.name, medicine.dosage, time);
          }
        }
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error saving medicine', err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete medicine?', `This removes ${name} and its dose history. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMedicine(medicineId!);
            router.back();
          } catch (err: any) {
            Alert.alert('Error deleting medicine', err.message ?? 'Something went wrong');
          }
        },
      },
    ]);
  };

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.placeholder}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Medicine' : 'Add Medicine'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave || saving}>
          <Text style={[styles.save, (!canSave || saving) && styles.saveDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Medicine name — single flat input, matches mockup exactly */}
        <TextInput
          style={styles.input}
          placeholder="Medicine name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Dosage — mockup shows this as TWO fields side by side: mg amount + form,
            e.g. "500mg" and "1 tablet" as separate chips-turned-inputs. Fixed here. */}
        <Text style={styles.label}>DOSAGE</Text>
        <View style={styles.dosageRow}>
          <TextInput
            style={[styles.input, styles.dosageInput]}
            placeholder="500mg"
            placeholderTextColor={Colors.textMuted}
            value={dosage.split(',')[0]?.trim() ?? ''}
            onChangeText={(v) => setDosage(`${v}, ${dosage.split(',')[1]?.trim() ?? '1 tablet'}`)}
          />
          <TextInput
            style={[styles.input, styles.dosageInput]}
            placeholder="1 tablet"
            placeholderTextColor={Colors.textMuted}
            value={dosage.split(',')[1]?.trim() ?? ''}
            onChangeText={(v) => setDosage(`${dosage.split(',')[0]?.trim() ?? ''}, ${v}`)}
          />
        </View>

        <Text style={styles.label}>FREQUENCY</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, frequency === f && styles.chipActive]}
              onPress={() => setFrequency(f)}
            >
              <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>REMINDER TIMES</Text>
        {times.map((time, index) => (
          <View key={index} style={styles.timeRow}>
            <View style={styles.timeInputWrapper}>
              <Text style={styles.clockIcon}>🕐</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="09:00"
                placeholderTextColor={Colors.textMuted}
                value={time}
                onChangeText={(v) => updateTime(index, v)}
              />
            </View>
            {times.length > 1 && (
              <TouchableOpacity onPress={() => removeTime(index)} style={styles.removeTime}>
                <Text style={styles.removeTimeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={addTimeSlot}>
          <Text style={styles.addTime}>+ Add another time</Text>
        </TouchableOpacity>

        <Text style={styles.label}>RELATION TO FOOD</Text>
        <View style={styles.chipRow}>
          {FOOD_RELATIONS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, foodRelation === f.value && styles.chipActive]}
              onPress={() => setFoodRelation(f.value)}
            >
              <Text style={[styles.chipText, foodRelation === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>DURATION</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, durationType === 'ongoing' && styles.chipActive]}
            onPress={() => setDurationType('ongoing')}
          >
            <Text style={[styles.chipText, durationType === 'ongoing' && styles.chipTextActive]}>
              Ongoing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, durationType === 'course' && styles.chipActive]}
            onPress={() => setDurationType('course')}
          >
            <Text style={[styles.chipText, durationType === 'course' && styles.chipTextActive]}>
              Set end date
            </Text>
          </TouchableOpacity>
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete medicine</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  save: { fontSize: 15, color: Colors.accent, fontWeight: '700' },
  saveDisabled: { color: Colors.textMuted },
  content: { padding: Spacing.md },
  placeholder: { color: Colors.textMuted, fontSize: 13, padding: Spacing.md },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dosageRow: { flexDirection: 'row', gap: Spacing.sm },
  dosageInput: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  chipActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: '#0F6E56' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  timeInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  clockIcon: { fontSize: 14 },
  timeInput: { flex: 1, paddingVertical: Spacing.sm + 4, fontSize: 15, color: Colors.textPrimary },
  removeTime: { padding: Spacing.sm },
  removeTimeText: { color: Colors.danger, fontSize: 16 },
  addTime: { color: Colors.accent, fontSize: 13, fontWeight: '600', marginBottom: Spacing.md },
  deleteButton: { marginTop: Spacing.lg, padding: Spacing.md, alignItems: 'center' },
  deleteButtonText: { color: Colors.danger, fontSize: 14, fontWeight: '600' },
});
