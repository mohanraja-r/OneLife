import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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
import { ChipRow, ErrorNotice } from '../components/ui';
import type { ChipOption } from '../components/ui';
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import type { ConditionStatus, MedicalScope } from '../services/medical';
import {
  deleteCondition,
  deleteContact,
  deleteProcedure,
  deleteProvider,
  getCondition,
  getContact,
  getProcedure,
  getProvider,
  saveCondition,
  saveContact,
  saveProcedure,
  saveProvider,
  selfScope,
} from '../services/medical';

/**
 * The short medical forms: a condition, a past procedure, an emergency contact
 * and a doctor.
 *
 * Four routes would be four copies of the same header, the same scope
 * resolution, the same save/delete plumbing and the same footer — so they share
 * one screen and differ only in the fields between them. The allergy form is
 * deliberately not one of them: it collects nine fields and earns its own file.
 */

/** Which record this screen is editing, taken from the `kind` param. */
type Kind = 'condition' | 'procedure' | 'contact' | 'provider';

/** Every field any of the four kinds collects; each renders only its own. */
interface Draft {
  name: string;
  /** Year of diagnosis or of the procedure, kept as typed text until save. */
  year: string;
  status: ConditionStatus;
  notes: string;
  relationship: string;
  phone: string;
  specialty: string;
  facility: string;
  isPrimary: boolean;
}

const EMPTY: Draft = {
  name: '',
  year: '',
  status: 'managed',
  notes: '',
  relationship: '',
  phone: '',
  specialty: '',
  facility: '',
  isPrimary: false,
};

const TITLES: Record<Kind, { add: string; edit: string; save: string }> = {
  condition: {
    add: 'Add condition',
    edit: 'Edit condition',
    save: 'Save condition',
  },
  procedure: {
    add: 'Add procedure',
    edit: 'Edit procedure',
    save: 'Save procedure',
  },
  contact: { add: 'Add contact', edit: 'Edit contact', save: 'Save contact' },
  provider: {
    add: 'Add provider',
    edit: 'Edit provider',
    save: 'Save provider',
  },
};

const STATUS_OPTIONS: readonly ChipOption<ConditionStatus>[] = [
  { label: 'Active', value: 'active' },
  { label: 'Managed', value: 'managed' },
  { label: 'Controlled', value: 'controlled' },
  { label: 'Resolved', value: 'resolved' },
];

/** Turns a typed year into what the column takes, ignoring anything unusable. */
function yearOrNull(value: string): number | null {
  const year = Number.parseInt(value, 10);
  return Number.isNaN(year) || year < 1900 || year > 2200 ? null : year;
}

/** Blank strings mean "not recorded", which the column stores as null. */
function textOrNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export default function MedicalEntryScreen() {
  const { kind = 'condition', id, memberId } = useLocalSearchParams<{
    kind?: Kind;
    id?: string;
    memberId?: string;
  }>();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [scope, setScope] = useState<MedicalScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Resolves whose record this is, and loads the row when editing one. */
  const load = useCallback(async () => {
    setError(null);
    try {
      const own = await selfScope();
      setScope({ ...own, memberId: memberId ?? null });
      if (!id) return;

      if (kind === 'condition') {
        const found = await getCondition(id);
        if (!found) throw new Error('This condition could not be found.');
        setDraft({
          ...EMPTY,
          name: found.name,
          year: found.diagnosedYear?.toString() ?? '',
          status: found.status,
          notes: found.notes ?? '',
        });
        return;
      }

      if (kind === 'procedure') {
        const found = await getProcedure(id);
        if (!found) throw new Error('This procedure could not be found.');
        setDraft({
          ...EMPTY,
          name: found.name,
          year: found.performedYear?.toString() ?? '',
          notes: found.notes ?? '',
        });
        return;
      }

      if (kind === 'contact') {
        const found = await getContact(id);
        if (!found) throw new Error('This contact could not be found.');
        setDraft({
          ...EMPTY,
          name: found.name,
          relationship: found.relationship ?? '',
          phone: found.phone,
          isPrimary: found.isPrimary,
        });
        return;
      }

      const found = await getProvider(id);
      if (!found) throw new Error('This provider could not be found.');
      setDraft({
        ...EMPTY,
        name: found.name,
        specialty: found.specialty ?? '',
        facility: found.facility ?? '',
        phone: found.phone ?? '',
        isPrimary: found.isPrimary,
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not open this record.'));
    }
  }, [id, kind, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Applies an edit to the in-memory draft; nothing is written until Save. */
  const patch = (changes: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  /** Writes the record in whichever table this kind belongs to. */
  const handleSave = async () => {
    if (!scope) return;

    setSaving(true);
    try {
      if (kind === 'condition') {
        await saveCondition(
          scope,
          {
            name: draft.name,
            diagnosedYear: yearOrNull(draft.year),
            status: draft.status,
            notes: textOrNull(draft.notes),
          },
          id
        );
      } else if (kind === 'procedure') {
        await saveProcedure(
          scope,
          {
            name: draft.name,
            performedYear: yearOrNull(draft.year),
            notes: textOrNull(draft.notes),
          },
          id
        );
      } else if (kind === 'contact') {
        await saveContact(
          scope,
          {
            name: draft.name,
            relationship: textOrNull(draft.relationship),
            phone: draft.phone,
            isPrimary: draft.isPrimary,
          },
          id
        );
      } else {
        await saveProvider(
          scope,
          {
            name: draft.name,
            specialty: textOrNull(draft.specialty),
            facility: textOrNull(draft.facility),
            phone: textOrNull(draft.phone),
            isPrimary: draft.isPrimary,
          },
          id
        );
      }
      router.back();
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  /** Deletes the record after confirming, then leaves the screen. */
  const confirmDelete = () => {
    if (!id) return;

    const remove = {
      condition: deleteCondition,
      procedure: deleteProcedure,
      contact: deleteContact,
      provider: deleteProvider,
    }[kind];

    Alert.alert(
      `Remove ${draft.name || 'this record'}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void remove(id)
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

  const titles = TITLES[kind];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title={id ? titles.edit : titles.add}
        action={
          id ? (
            <TouchableOpacity
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove this record">
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

          <Field
            label={
              kind === 'contact'
                ? 'NAME'
                : kind === 'provider'
                  ? "DOCTOR'S NAME"
                  : kind === 'procedure'
                    ? 'PROCEDURE'
                    : 'CONDITION'
            }
            value={draft.name}
            onChangeText={(name) => patch({ name })}
            placeholder={
              {
                condition: 'e.g., Type 2 Diabetes',
                procedure: 'e.g., Appendectomy',
                contact: 'e.g., Priya Sharma',
                provider: 'e.g., Dr. Rajesh Kumar',
              }[kind]
            }
            autoCapitalize="words"
          />

          {(kind === 'condition' || kind === 'procedure') && (
            <Field
              label={kind === 'condition' ? 'YEAR DIAGNOSED' : 'YEAR'}
              value={draft.year}
              onChangeText={(year) => patch({ year })}
              placeholder="e.g., 2019"
              keyboardType="number-pad"
              maxLength={4}
              hint="Leave blank if you are not sure"
            />
          )}

          {kind === 'condition' && (
            <>
              <Text style={styles.label}>HOW IS IT NOW?</Text>
              <ChipRow
                options={STATUS_OPTIONS}
                value={draft.status}
                onChange={(status) => patch({ status })}
                wrap
              />
              <Text style={styles.hint}>
                Shown next to the condition, so a caregiver knows where it stands
              </Text>
            </>
          )}

          {kind === 'contact' && (
            <Field
              label="RELATIONSHIP"
              value={draft.relationship}
              onChangeText={(relationship) => patch({ relationship })}
              placeholder="e.g., Sister"
              autoCapitalize="words"
            />
          )}

          {kind === 'provider' && (
            <>
              <Field
                label="SPECIALITY"
                value={draft.specialty}
                onChangeText={(specialty) => patch({ specialty })}
                placeholder="e.g., Endocrinologist"
                autoCapitalize="words"
              />
              <Field
                label="HOSPITAL OR CLINIC"
                value={draft.facility}
                onChangeText={(facility) => patch({ facility })}
                placeholder="e.g., Apollo Hospitals, Delhi"
                autoCapitalize="words"
              />
            </>
          )}

          {(kind === 'contact' || kind === 'provider') && (
            <Field
              label="PHONE"
              value={draft.phone}
              onChangeText={(phone) => patch({ phone })}
              placeholder="e.g., +91 98765 43210"
              keyboardType="phone-pad"
              hint={
                kind === 'contact'
                  ? 'The number dialled from the emergency card'
                  : 'Optional — shown with a call button when set'
              }
            />
          )}

          {(kind === 'condition' || kind === 'procedure') && (
            <Field
              label={kind === 'condition' ? 'NOTES' : 'OUTCOME'}
              value={draft.notes}
              onChangeText={(notes) => patch({ notes })}
              placeholder={
                kind === 'condition'
                  ? 'Anything a doctor should know'
                  : 'e.g., Recovered well'
              }
              multiline
            />
          )}

          {(kind === 'contact' || kind === 'provider') && (
            <View style={styles.switchCard}>
              <View style={styles.switchBody}>
                <Text style={styles.switchTitle}>
                  {kind === 'contact' ? 'Call first' : 'Primary doctor'}
                </Text>
                <Text style={styles.switchMeta}>
                  {kind === 'contact'
                    ? 'Shown at the top of the emergency card'
                    : 'The doctor treating this overall'}
                </Text>
              </View>
              <Switch
                value={draft.isPrimary}
                onValueChange={(isPrimary) => patch({ isPrimary })}
                trackColor={{
                  false: Colors.surfaceSunken,
                  true: Colors.primary,
                }}
                thumbColor={Colors.surface}
                accessibilityLabel={
                  kind === 'contact' ? 'Call first' : 'Primary doctor'
                }
              />
            </View>
          )}
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
              label={saving ? 'Saving…' : titles.save}
              hideArrow
              disabled={saving || !scope}
              onPress={() => void handleSave()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** A labelled text input with the optional line of guidance underneath. */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  multiline = false,
  ...input
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
} & Pick<
  React.ComponentProps<typeof TextInput>,
  'keyboardType' | 'autoCapitalize' | 'maxLength'
>) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        accessibilityLabel={label}
        {...input}
      />
      <Text style={styles.hint}>{hint ?? ''}</Text>
    </>
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
  textArea: { minHeight: 88 },
  hint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },

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
