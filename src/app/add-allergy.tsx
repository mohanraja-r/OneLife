import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Trash2 } from 'lucide-react-native';
import { type JSX, useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
import { DateTimeSpinnerSheet, ErrorNotice } from '../components/ui';
import {
  Accents,
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { formatLongDate, parseDateString, toDateString } from '../services/dates';
import { errorMessage } from '../services/errors';
import type {
  AllergyInput,
  AllergySeverity,
  AllergyType,
  MedicalScope,
} from '../services/medical';
import {
  deleteAllergy,
  getAllergy,
  saveAllergy,
  selfScope,
} from '../services/medical';

/**
 * The allergy form — the one record in Medical Info detailed enough to need a
 * screen of its own.
 *
 * Reached both ways: with no `id` it adds, with one it edits and offers delete.
 * A `memberId` files the allergy under a managed family member instead of the
 * signed-in user.
 */

const TYPES: readonly { value: AllergyType; label: string }[] = [
  { value: 'medicine', label: 'Medicine' },
  { value: 'food', label: 'Food' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'other', label: 'Other' },
];

/** Severity is the field a caregiver reads first, so each level has a colour. */
const SEVERITY: readonly {
  value: AllergySeverity;
  label: string;
  main: string;
  tint: string;
}[] = [
  {
    value: 'mild',
    label: 'Mild',
    main: Accents.amber.dark,
    tint: Accents.amber.tint,
  },
  {
    value: 'moderate',
    label: 'Moderate',
    main: Accents.orange.dark,
    tint: Accents.orange.tint,
  },
  {
    value: 'severe',
    label: 'Severe',
    main: Colors.error,
    tint: Colors.errorTint,
  },
];

/** A blank allergy — what the form starts from when nothing is being edited. */
const EMPTY: AllergyInput = {
  name: '',
  allergyType: 'medicine',
  severity: 'moderate',
  reaction: null,
  treatment: null,
  doctorConfirmed: false,
  lastVerified: null,
};

export default function AddAllergyScreen(): JSX.Element {
  const { id, memberId } = useLocalSearchParams<{
    id?: string;
    memberId?: string;
  }>();

  const [draft, setDraft] = useState<AllergyInput>(EMPTY);
  const [scope, setScope] = useState<MedicalScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  /** Resolves whose record this is, and loads the allergy when editing one. */
  const load = useCallback(async () => {
    setError(null);
    try {
      const own = await selfScope();
      setScope({ ...own, memberId: memberId ?? null });

      if (!id) return;
      const existing = await getAllergy(id);
      if (!existing) {
        setError('This allergy could not be found.');
        return;
      }
      // Everything but the id, which is already in the route.
      setDraft({
        name: existing.name,
        allergyType: existing.allergyType,
        severity: existing.severity,
        reaction: existing.reaction,
        treatment: existing.treatment,
        doctorConfirmed: existing.doctorConfirmed,
        lastVerified: existing.lastVerified,
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not open this allergy.'));
    }
  }, [id, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Applies an edit to the in-memory draft; nothing is written until Save. */
  const patch = (changes: Partial<AllergyInput>) =>
    setDraft((current) => ({ ...current, ...changes }));

  /** Writes the allergy and returns to the medical record. */
  const handleSave = async () => {
    if (!scope) return;
    if (!draft.name.trim()) {
      Alert.alert('Name needed', 'Please enter what the allergy is to.');
      return;
    }

    setSaving(true);
    try {
      await saveAllergy(scope, draft, id);
      router.back();
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  /** Deletes the allergy after confirming, then leaves the screen. */
  const confirmDelete = () => {
    if (!id) return;

    Alert.alert(
      `Remove ${draft.name || 'this allergy'}?`,
      'It will no longer show in an emergency. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deleteAllergy(id)
              .then(() => router.back())
              .catch((err: unknown) =>
                Alert.alert(
                  'Could not remove',
                  errorMessage(err, 'Something went wrong')
                )
              );
          },
        },
      ]
    );
  };

  /** Opens the platform's date picker for the last-verified date. */
  const openDatePicker = () => {
    const current = draft.lastVerified
      ? parseDateString(draft.lastVerified)
      : new Date();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) {
            patch({ lastVerified: toDateString(picked) });
          }
        },
      });
      return;
    }
    setDateSheetOpen(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={id ? 'Edit allergy' : 'Add allergy'}
        action={
          id ? (
            <TouchableOpacity
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove this allergy">
              <Trash2 size={21} color={Colors.danger} strokeWidth={1.9} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ErrorNotice message={error} onRetry={() => void load()} />

          <Text style={styles.label}>TYPE OF ALLERGY</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((type) => {
              const active = draft.allergyType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => patch({ allergyType: type.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}>
                  <Text
                    style={[
                      styles.typeLabel,
                      active && styles.typeLabelActive,
                    ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>NAME OF ALLERGEN</Text>
          <TextInput
            style={styles.input}
            value={draft.name}
            onChangeText={(name) => patch({ name })}
            placeholder="e.g., Penicillin, Peanuts, Pollen"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            accessibilityLabel="Name of allergen"
          />
          <Text style={styles.hint}>
            Be specific — this info could be critical in an emergency
          </Text>

          <Text style={styles.label}>SEVERITY</Text>
          <View style={styles.severityRow}>
            {SEVERITY.map((level) => {
              const active = draft.severity === level.value;
              return (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.severityChip,
                    { borderColor: level.main },
                    active && { backgroundColor: level.tint },
                  ]}
                  onPress={() => patch({ severity: level.value })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}>
                  {active && (
                    <Check size={14} color={level.main} strokeWidth={3} />
                  )}
                  <Text style={[styles.severityLabel, { color: level.main }]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>
            Severity affects caregiver alerts and medication warnings
          </Text>

          <Text style={styles.label}>WHAT HAPPENS WHEN EXPOSED?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={draft.reaction ?? ''}
            onChangeText={(reaction) => patch({ reaction })}
            placeholder="e.g., 'Anaphylaxis — difficulty breathing, swelling', 'Rash on skin', 'Stomach upset'"
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
            accessibilityLabel="What happens when exposed"
          />
          <Text style={styles.hint}>
            Describe the typical reaction so caregivers recognise the symptoms
          </Text>

          <View style={styles.switchCard}>
            <View style={styles.switchBody}>
              <Text style={styles.switchTitle}>Confirmed by doctor</Text>
              <Text style={styles.switchMeta}>Tested and verified</Text>
            </View>
            <Switch
              value={draft.doctorConfirmed}
              onValueChange={(doctorConfirmed) => patch({ doctorConfirmed })}
              trackColor={{ false: Colors.surfaceSunken, true: Colors.primary }}
              thumbColor={Colors.surface}
              accessibilityLabel="Confirmed by doctor"
            />
          </View>

          <Text style={styles.label}>HOW TO TREAT (IF NEEDED)</Text>
          <TextInput
            style={styles.input}
            value={draft.treatment ?? ''}
            onChangeText={(treatment) => patch({ treatment })}
            placeholder="e.g., 'Use EpiPen', 'Take antihistamine'"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="How to treat"
          />
          <Text style={styles.hint}>
            Caregivers will see this if an emergency occurs
          </Text>

          <Text style={styles.label}>LAST VERIFIED</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateField]}
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel="Last verified"
            accessibilityHint="Opens the date picker">
            <Text
              style={
                draft.lastVerified ? styles.dateValue : styles.datePlaceholder
              }>
              {draft.lastVerified
                ? formatLongDate(draft.lastVerified)
                : 'Not recorded'}
            </Text>
            {!!draft.lastVerified && (
              <TouchableOpacity
                onPress={() => patch({ lastVerified: null })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear the last verified date">
                <Text style={styles.clear}>Clear</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>When was this allergy last confirmed?</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancel}
            onPress={() => router.back()}
            accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.fill}>
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save allergy'}
              hideArrow
              disabled={saving || !scope}
              onPress={() => void handleSave()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Android opens the system dialog imperatively, so the wheel is iOS-only. */}
      {Platform.OS === 'ios' && (
        <DateTimeSpinnerSheet
          visible={dateSheetOpen}
          onClose={() => setDateSheetOpen(false)}
          title="Last verified"
          mode="date"
          maximumDate={new Date()}
          value={
            draft.lastVerified ? parseDateString(draft.lastVerified) : new Date()
          }
          onChange={(picked) => patch({ lastVerified: toDateString(picked) })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  label: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  typeChip: {
    // Two per row on any width: half the space, less half the gap.
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md + 2,
    ...Shadow.card,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeLabel: { ...Typography.body, fontSize: 15, color: Colors.textPrimary },
  typeLabelActive: { color: Colors.onPrimary, fontWeight: '600' },

  input: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 96 },
  hint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },

  severityRow: { flexDirection: 'row', gap: Spacing.md },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 1,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  severityLabel: { ...Typography.caption, fontWeight: '700' },

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  switchBody: { flex: 1 },
  switchTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  switchMeta: { ...Typography.caption, color: Colors.textSecondary },

  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  dateValue: { ...Typography.body, fontSize: 15, color: Colors.textPrimary },
  datePlaceholder: { ...Typography.body, fontSize: 15, color: Colors.textMuted },
  clear: { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  cancel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  cancelText: { ...Typography.button, fontSize: 15, color: Colors.primary },
});
