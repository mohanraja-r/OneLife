import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Images,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import {
  BottomSheet,
  ChipRow,
  DateTimeSpinnerSheet,
  ErrorNotice,
  LoadingState,
  MeasureSheet,
  sheetStyles,
} from '../components/ui';
import type { ChipOption } from '../components/ui';
import {
  HEIGHT_MEASURE,
  WEIGHT_MEASURE,
  formatMeasure,
} from '../constants/measures';
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
import type { Gender, PersonalDetails } from '../services/profile';
import {
  calculateAge,
  getPersonalDetails,
  removeAvatar,
  savePersonalDetails,
  uploadAvatar,
} from '../services/profile';

const heightAccent = Accents.green;
const weightAccent = Accents.amber;

/** What the photo sheet was asked to do, once it has closed. */
type PhotoAction = 'camera' | 'library' | 'remove';

const GENDER_OPTIONS: readonly ChipOption<Gender>[] = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Prefer not to say', value: 'unspecified' },
];

/** A tappable settings row: label on the left, current value and chevron right. */
function DetailRow({
  label,
  value,
  onPress,
  accessibilityHint,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityHint: string;
}) {
  return (
    <TouchableOpacity
      style={styles.detailRow}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={accessibilityHint}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
      <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function PersonalInformationScreen() {
  const [draft, setDraft] = useState<PersonalDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  // A ref, not state: nothing renders from it, and the sheet's dismiss callback
  // must see the value set by the tap that closed it.
  const pendingPhotoAction = useRef<PhotoAction | null>(null);
  const [dobSheetOpen, setDobSheetOpen] = useState(false);
  const [heightSheetOpen, setHeightSheetOpen] = useState(false);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);

  /** Loads the profile record this screen edits. */
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const details = await getPersonalDetails();
      // No details means no session — without one there is nothing to edit and
      // nothing to save, so say so rather than spinning forever.
      if (!details) {
        setLoadError('You need to be signed in to edit your profile.');
        return;
      }
      setDraft(details);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your profile.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Applies an edit to the in-memory draft; nothing is written until Save. */
  const patch = (changes: Partial<PersonalDetails>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  /** Writes the edited fields back to `profiles` and leaves the screen. */
  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      Alert.alert('Name needed', 'Please enter the name you want to be called.');
      return;
    }

    setSaving(true);
    try {
      await savePersonalDetails({
        name: draft.name,
        gender: draft.gender,
        dateOfBirth: draft.dateOfBirth,
        heightCm: draft.heightCm,
        heightUnit: draft.heightUnit,
        weightKg: draft.weightKg,
        weightUnit: draft.weightUnit,
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Closes the photo sheet, then runs the chosen action once it has actually
   * gone.
   *
   * The wait is not cosmetic: on iOS the picker, the permission prompt and any
   * Alert are all presented by the OS, and none of them appear if they are
   * triggered while this sheet's modal is still dismissing — the tap looks like
   * it did nothing. Android has no such rule and fires no dismiss callback, so
   * it goes straight through.
   */
  const choosePhotoAction = (action: PhotoAction) => {
    pendingPhotoAction.current = action;
    setPhotoSheetOpen(false);
    if (Platform.OS !== 'ios') flushPhotoAction();
  };

  /** Runs whatever the photo sheet queued, if anything. */
  const flushPhotoAction = () => {
    const action = pendingPhotoAction.current;
    pendingPhotoAction.current = null;

    if (action === 'remove') void deletePhoto();
    else if (action) void changePhoto(action === 'camera');
  };

  /**
   * Takes or picks a photo and uploads it. The photo is saved immediately
   * rather than with the rest of the form: the bytes are already in storage by
   * the time the picker closes, so leaving without saving would strand them.
   */
  const changePhoto = async (fromCamera: boolean) => {
    // Everything from the permission check onwards is guarded: this runs
    // detached from the tap handler, so anything thrown here would otherwise be
    // an unhandled rejection the user never sees.
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          `${fromCamera ? 'Camera' : 'Photo library'} access is required to change your picture.`
        );
        return;
      }

      // `base64: true` asks the picker for the encoded bytes directly. Reading
      // the file afterwards would mean expo-file-system's legacy API, which
      // throws at runtime on SDK 54.
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      };
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;

      setPhotoBusy(true);
      patch({
        avatarUrl: await uploadAvatar(
          asset.base64,
          asset.mimeType ?? 'image/jpeg'
        ),
      });
    } catch (err) {
      Alert.alert(
        'Could not update photo',
        errorMessage(err, 'Something went wrong')
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  /** Clears the profile photo, deleting the stored image with it. */
  const deletePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeAvatar();
      patch({ avatarUrl: null });
    } catch (err) {
      Alert.alert(
        'Could not remove photo',
        errorMessage(err, 'Something went wrong')
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  /** Opens the platform's date picker for the date of birth. */
  const openDatePicker = () => {
    if (!draft) return;
    const current = draft.dateOfBirth
      ? parseDateString(draft.dateOfBirth)
      : new Date(2000, 0, 1);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) {
            patch({ dateOfBirth: toDateString(picked) });
          }
        },
      });
      return;
    }
    setDobSheetOpen(true);
  };

  const initials = draft?.name.trim().slice(0, 2).toUpperCase() ?? '';
  const dobValue = draft?.dateOfBirth
    ? `${formatLongDate(draft.dateOfBirth)} · ${calculateAge(draft.dateOfBirth)} yrs`
    : 'Not set';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
      </View>

      {!draft ? (
        <View style={styles.loading}>
          <ErrorNotice message={loadError} onRetry={() => void load()} />
          {!loadError && <LoadingState fill />}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Photo */}
            <TouchableOpacity
              style={styles.avatarBlock}
              onPress={() => setPhotoSheetOpen(true)}
              disabled={photoBusy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo">
              {draft.avatarUrl ? (
                <Image
                  source={{ uri: draft.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              <View style={styles.avatarBadge}>
                {photoBusy ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Camera
                    size={16}
                    color={Colors.textInverse}
                    strokeWidth={2.2}
                  />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change your photo</Text>

            {/* Identity */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(name) => patch({ name })}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                accessibilityLabel="Name"
              />

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                Email
              </Text>
              {/* The sign-in address is changed through auth, not here. */}
              <View style={[styles.input, styles.inputReadOnly]}>
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {draft.email}
                </Text>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <Text style={styles.fieldHint}>
                Selecting Woman adds the Women&apos;s Health section to your
                profile.
              </Text>
              <ChipRow
                options={GENDER_OPTIONS}
                value={draft.gender}
                onChange={(gender) => patch({ gender })}
                wrap
                style={styles.genderChips}
              />
            </View>

            {/* Body */}
            <View style={[styles.card, styles.cardTight]}>
              <DetailRow
                label="Date of birth"
                value={dobValue}
                onPress={openDatePicker}
                accessibilityHint="Opens the date picker"
              />
              <View style={styles.divider} />
              <DetailRow
                label="Height"
                value={formatMeasure(
                  HEIGHT_MEASURE,
                  draft.heightCm,
                  draft.heightUnit
                )}
                onPress={() => setHeightSheetOpen(true)}
                accessibilityHint="Opens the height picker"
              />
              <View style={styles.divider} />
              <DetailRow
                label="Weight"
                value={formatMeasure(
                  WEIGHT_MEASURE,
                  draft.weightKg,
                  draft.weightUnit
                )}
                onPress={() => setWeightSheetOpen(true)}
                accessibilityHint="Opens the weight picker"
              />
            </View>

            <Text style={styles.footnote}>
              Your height, weight and date of birth are what your daily calorie
              and macro targets are calculated from.
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save changes'}
              hideArrow
              disabled={saving || photoBusy}
              onPress={() => void handleSave()}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Photo actions — a sheet rather than an Alert, which caps at three
          buttons on Android. */}
      <BottomSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onDismiss={flushPhotoAction}>
        <Text style={sheetStyles.title}>Profile photo</Text>

        <TouchableOpacity
          style={styles.photoAction}
          onPress={() => choosePhotoAction('camera')}
          accessibilityRole="button">
          <Camera size={20} color={Colors.textPrimary} strokeWidth={2} />
          <Text style={styles.photoActionLabel}>Take a photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoAction}
          onPress={() => choosePhotoAction('library')}
          accessibilityRole="button">
          <Images size={20} color={Colors.textPrimary} strokeWidth={2} />
          <Text style={styles.photoActionLabel}>Choose from library</Text>
        </TouchableOpacity>

        {!!draft?.avatarUrl && (
          <TouchableOpacity
            style={styles.photoAction}
            onPress={() => choosePhotoAction('remove')}
            accessibilityRole="button">
            <Trash2 size={20} color={Colors.danger} strokeWidth={2} />
            <Text style={[styles.photoActionLabel, styles.photoActionDanger]}>
              Remove photo
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={sheetStyles.cancel}
          onPress={() => setPhotoSheetOpen(false)}
          accessibilityRole="button">
          <Text style={sheetStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </BottomSheet>

      {draft && (
        <>
          {/* Android opens the system dialog imperatively, so the wheel sheet is
              iOS-only. */}
          {Platform.OS === 'ios' && (
            <DateTimeSpinnerSheet
              visible={dobSheetOpen}
              onClose={() => setDobSheetOpen(false)}
              title="Date of birth"
              mode="date"
              maximumDate={new Date()}
              value={
                draft.dateOfBirth
                  ? parseDateString(draft.dateOfBirth)
                  : new Date(2000, 0, 1)
              }
              onChange={(picked) => patch({ dateOfBirth: toDateString(picked) })}
            />
          )}

          <MeasureSheet
            visible={heightSheetOpen}
            onClose={() => setHeightSheetOpen(false)}
            measure={HEIGHT_MEASURE}
            value={draft.heightCm}
            unit={draft.heightUnit}
            accent={heightAccent}
            onSave={(heightCm, heightUnit) => patch({ heightCm, heightUnit })}
          />

          <MeasureSheet
            visible={weightSheetOpen}
            onClose={() => setWeightSheetOpen(false)}
            measure={WEIGHT_MEASURE}
            value={draft.weightKg}
            unit={draft.weightUnit}
            accent={weightAccent}
            onSave={(weightKg, weightUnit) => patch({ weightKg, weightUnit })}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    height: 52,
  },
  headerTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  loading: { flex: 1, paddingHorizontal: Spacing.screen },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  avatarBlock: { alignSelf: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: Radius.round,
    borderWidth: 3,
    borderColor: Colors.surface,
    ...Shadow.card,
  },
  avatarFallback: {
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...Typography.cardTitle,
    fontSize: 30,
    color: Colors.primaryDark,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    borderWidth: 2,
    borderColor: Colors.background,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  /** Rows bring their own vertical padding, so the card does not add more. */
  cardTight: { paddingVertical: Spacing.xs },

  fieldLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldLabelSpaced: { marginTop: Spacing.lg },
  fieldHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
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
  inputReadOnly: { backgroundColor: Colors.surfaceSunken },
  readOnlyText: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  genderChips: { marginTop: Spacing.xs },

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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
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

  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  photoActionLabel: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  photoActionDanger: { color: Colors.danger, fontWeight: '600' },
});
