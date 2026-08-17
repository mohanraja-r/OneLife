import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import {
  Check,
  ChevronRight,
  Smartphone,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
import { ChipRow, DateTimeSpinnerSheet } from '../components/ui';
import type { ChipOption } from '../components/ui';
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { formatLongDate, parseDateString, toDateString } from '../services/dates';
import { errorMessage } from '../services/errors';
import type { ConnectionType } from '../services/family';
import { addManagedMember, createInvite } from '../services/family';

/**
 * Adding a family member.
 *
 * The two options are not presentation — they are genuinely different records.
 * An invited member keeps their own account and their own medicines and simply
 * grants read access; a managed member has no account at all, so the link
 * carries their details and the caregiver owns their medicines outright.
 */

const RELATIONSHIPS: readonly ChipOption<string>[] = [
  { label: 'Mother', value: 'Mother' },
  { label: 'Father', value: 'Father' },
  { label: 'Partner', value: 'Partner' },
  { label: 'Sister', value: 'Sister' },
  { label: 'Brother', value: 'Brother' },
  { label: 'Son', value: 'Son' },
  { label: 'Daughter', value: 'Daughter' },
  { label: 'Other', value: 'Other' },
];

interface OptionProps {
  icon: typeof Smartphone;
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}

/** One of the two "how will this person use the app" cards. */
function ConnectionOption({
  icon: Icon,
  title,
  body,
  selected,
  onPress,
}: OptionProps) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${body}`}>
      <View style={[styles.optionTile, selected && styles.optionTileSelected]}>
        <Icon
          size={20}
          color={selected ? Colors.primary : Colors.textSecondary}
          strokeWidth={2}
        />
      </View>

      <View style={styles.optionBody}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionText}>{body}</Text>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && (
          <Check size={12} color={Colors.textInverse} strokeWidth={3} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AddFamilyMemberScreen() {
  const [connectionType, setConnectionType] = useState<ConnectionType>('invite');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Mother');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [dobSheetOpen, setDobSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const managed = connectionType === 'managed';

  /** Opens the platform's date picker for the member's date of birth. */
  const openDatePicker = () => {
    const current = dateOfBirth
      ? parseDateString(dateOfBirth)
      : new Date(1960, 0, 1);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) setDateOfBirth(toDateString(picked));
        },
      });
      return;
    }
    setDobSheetOpen(true);
  };

  /** Creates the managed profile, or mints and shares an invite code. */
  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (managed && !trimmed) {
      Alert.alert('Name needed', 'Please enter their name.');
      return;
    }

    setSaving(true);
    try {
      if (managed) {
        await addManagedMember({
          name: trimmed,
          relationship,
          dateOfBirth,
        });
        router.back();
        return;
      }

      const invite = await createInvite({
        inviteeName: trimmed || null,
        relationship,
      });

      // The code is the whole invite — there is no mail or SMS provider behind
      // this yet, so it goes out through the OS share sheet.
      await Share.share({
        message: `${trimmed ? `${trimmed}, ` : ''}join my family on OneLife so we can keep track of each other's medicines. Your invite code is ${invite.code}.`,
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Add family member" />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.caption}>
            Choose how this person will use the app.
          </Text>

          <View style={styles.options} accessibilityRole="radiogroup">
            <ConnectionOption
              icon={Smartphone}
              title="They have the app"
              body="Send an invite. Once they accept, you'll see their medicine adherence and can set reminders together. They choose what's shared."
              selected={!managed}
              onPress={() => setConnectionType('invite')}
            />
            <ConnectionOption
              icon={UserRound}
              title="Managed profile"
              body="For a parent or grandparent who won't use a phone app. You set up and track their medicines directly, and the reminders come to you."
              selected={managed}
              onPress={() => setConnectionType('managed')}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Name{!managed && ' (optional)'}
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={managed ? 'Their name' : 'Who are you inviting?'}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              accessibilityLabel="Name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Relationship</Text>
            <ChipRow
              options={RELATIONSHIPS}
              value={relationship}
              onChange={setRelationship}
              wrap
            />
          </View>

          {managed && (
            <View style={[styles.card, styles.cardTight]}>
              <TouchableOpacity
                style={styles.detailRow}
                onPress={openDatePicker}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`Date of birth, ${dateOfBirth ? formatLongDate(dateOfBirth) : 'not set'}`}
                accessibilityHint="Opens the date picker">
                <Text style={styles.detailLabel}>Date of birth</Text>
                <Text style={styles.detailValue}>
                  {dateOfBirth ? formatLongDate(dateOfBirth) : 'Not set'}
                </Text>
                <ChevronRight
                  size={18}
                  color={Colors.textMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footnote}>
            {managed
              ? 'Reminders for a managed profile come to your phone. Sending them to their own phone by SMS or call is not available yet.'
              : "They stay in control — before accepting they'll see exactly what you'd be able to see, and they can disconnect at any time."}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={
              saving
                ? 'Saving…'
                : managed
                  ? 'Create profile'
                  : 'Create invite code'
            }
            hideArrow
            disabled={saving}
            onPress={() => void handleSubmit()}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Android opens the system dialog imperatively, so the wheel is iOS-only. */}
      {Platform.OS === 'ios' && (
        <DateTimeSpinnerSheet
          visible={dobSheetOpen}
          onClose={() => setDobSheetOpen(false)}
          title="Date of birth"
          mode="date"
          maximumDate={new Date()}
          value={
            dateOfBirth ? parseDateString(dateOfBirth) : new Date(1960, 0, 1)
          }
          onChange={(picked) => setDateOfBirth(toDateString(picked))}
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
    gap: Spacing.xl,
  },
  caption: { ...Typography.secondary, color: Colors.textSecondary },

  options: { gap: Spacing.md },
  option: {
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionSelected: { borderColor: Colors.primary, ...Shadow.raised },
  optionTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    backgroundColor: Colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTileSelected: { backgroundColor: Colors.primaryTint },
  optionBody: { flex: 1, minWidth: 0 },
  optionTitle: { ...Typography.optionLabel, color: Colors.textPrimary },
  optionText: {
    ...Typography.caption,
    fontWeight: '400',
    lineHeight: 19,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  field: { gap: Spacing.sm },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    ...Shadow.card,
  },
  cardTight: { paddingVertical: Spacing.xs },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  detailLabel: { ...Typography.body, fontSize: 15, color: Colors.textPrimary },
  detailValue: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    color: Colors.textSecondary,
  },

  footnote: {
    ...Typography.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
