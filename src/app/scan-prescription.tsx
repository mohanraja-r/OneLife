import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Camera,
  Check,
  CircleCheck,
  Images,
  Pencil,
  Pill,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { type JSX, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
import { ChipOption, ChipRow } from '../components/ui';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { errorMessage } from '../services/errors';
import { FoodRelation, MedicineInput, addMedicine } from '../services/medicine';
import {
  ScannedMedicine,
  scanPrescription,
} from '../services/prescriptionScan';

/** Height of the captured-photo preview, also the travel of the scan line. */
const PREVIEW_HEIGHT = 240;

const FOOD_RELATIONS: ChipOption<FoodRelation>[] = [
  { value: 'before', label: 'Before food' },
  { value: 'after', label: 'After food' },
  { value: 'any', label: 'Any time' },
];

/** What makes a prescription photo readable, shown before the first capture. */
const TIPS = [
  'Lay the paper flat and fill the frame',
  'Bright, even light — avoid shadows and glare',
  'Include the lines with dose and duration',
];

export default function ScanPrescriptionScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [medicines, setMedicines] = useState<ScannedMedicine[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  /** Takes or picks a photo, then sends it to the prescription reader. */
  const pickAndScan = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Camera and photo access is required to scan a prescription.'
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    };

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    setPhotoUri(asset.uri);
    setMedicines([]);
    setEditingIndex(null);
    setScanning(true);

    try {
      const scan = await scanPrescription(
        asset.base64,
        asset.mimeType ?? 'image/jpeg'
      );

      if (scan.error) {
        Alert.alert('Could not read prescription', scan.error);
      } else if (scan.medicines.length === 0) {
        Alert.alert(
          'No medicines found',
          'Try a clearer photo, or add the medicine manually.'
        );
      } else {
        setMedicines(scan.medicines);
      }
    } catch (err) {
      Alert.alert(
        'Error scanning prescription',
        errorMessage(err, 'Something went wrong.')
      );
    } finally {
      setScanning(false);
    }
  };

  /** Clears the current scan so a fresh photo can be taken. */
  const rescan = () => {
    setPhotoUri(null);
    setMedicines([]);
    setEditingIndex(null);
  };

  /** Drops a detected medicine the user does not want to add. */
  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  /** Applies an inline correction to one detected medicine. */
  const editMedicine = (index: number, patch: Partial<ScannedMedicine>) => {
    setMedicines(
      medicines.map((med, i) => (i === index ? { ...med, ...patch } : med))
    );
  };

  /** Saves every reviewed medicine, then returns to the Medicine screen. */
  const handleAddAll = async () => {
    setSaving(true);
    try {
      for (const med of medicines) {
        const input: MedicineInput = {
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          times: deriveDefaultTimes(med.frequency),
          foodRelation: med.foodRelation,
          durationType: med.durationDays ? 'course' : 'ongoing',
          durationEndDate: med.durationDays
            ? new Date(Date.now() + med.durationDays * 86400000)
                .toISOString()
                .slice(0, 10)
            : null,
        };
        await addMedicine(input);

        // TODO(notifications): reminders are not wired up yet. Once
        // implemented, schedule one local notification per entry in
        // `input.times` here — same as the add-medicine.tsx call site.
      }
      router.back();
    } catch (err) {
      Alert.alert(
        'Error adding medicines',
        errorMessage(err, 'Something went wrong.')
      );
    } finally {
      setSaving(false);
    }
  };

  const showTips = !photoUri && !scanning;
  const showReview = medicines.length > 0 && !scanning;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* This screen draws under the status bar, so the inset lands here
          rather than on a SafeAreaView. */}
      <View style={{ paddingTop: insets.top }}>
        <AppHeader title="Scan prescription" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {photoUri ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: photoUri }} style={styles.preview} />
            {scanning && (
              <View style={styles.scanOverlay}>
                <MotiView
                  from={{ translateY: 0 }}
                  animate={{ translateY: PREVIEW_HEIGHT - 4 }}
                  transition={{
                    type: 'timing',
                    duration: 1600,
                    loop: true,
                    repeatReverse: true,
                  }}
                  style={styles.scanLine}
                />
              </View>
            )}
          </View>
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}
            style={styles.captureFrame}>
            <LinearGradient
              colors={Gradients.primary}
              start={Gradients.diagonal.start}
              end={Gradients.diagonal.end}
              style={styles.captureTile}>
              <Camera size={28} color={Colors.onPrimary} strokeWidth={1.9} />
            </LinearGradient>
            <Text style={styles.captureTitle}>Photograph the prescription</Text>
            <Text style={styles.captureSubtitle}>
              We read the medicine names, doses and duration off the page so you
              don&apos;t have to type them.
            </Text>
          </MotiView>
        )}

        {scanning && (
          <View style={styles.scanningRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.scanningText}>Reading prescription…</Text>
          </View>
        )}

        {!scanning && !showReview && (
          <View style={styles.actions}>
            <PrimaryButton
              label={photoUri ? 'Take another photo' : 'Take photo'}
              icon={Camera}
              hideArrow
              onPress={() => void pickAndScan(true)}
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void pickAndScan(false)}
              activeOpacity={0.7}
              accessibilityRole="button">
              <Images size={20} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.secondaryButtonText}>
                Choose from gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showTips && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>For the cleanest read</Text>
            {TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipTile}>
                  <Check size={12} color={Colors.primary} strokeWidth={3} />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {showReview && (
          <>
            <View style={styles.detectedBanner}>
              <CircleCheck
                size={18}
                color={Accents.green.dark}
                strokeWidth={2.2}
              />
              <Text style={styles.detectedText}>
                {medicines.length} medicine{medicines.length > 1 ? 's' : ''}{' '}
                detected — review before adding
              </Text>
            </View>

            <TouchableOpacity
              style={styles.rescanRow}
              onPress={rescan}
              activeOpacity={0.7}
              accessibilityRole="button">
              <RefreshCw size={15} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.rescanText}>Scan a different photo</Text>
            </TouchableOpacity>

            {medicines.map((med, index) => {
              const isEditing = editingIndex === index;
              return (
                <MotiView
                  key={`${med.name}-${index}`}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: 'timing',
                    duration: Motion.fast,
                    delay: Motion.enterDelay + index * Motion.stagger,
                  }}
                  style={[styles.medCard, isEditing && styles.medCardEditing]}>
                  <View style={styles.medHeader}>
                    <View style={styles.medTile}>
                      <Pill size={18} color={Colors.primary} strokeWidth={2} />
                    </View>

                    <View style={styles.medHeaderText}>
                      {isEditing ? (
                        <TextInput
                          style={styles.medNameInput}
                          value={med.name}
                          onChangeText={(value) =>
                            editMedicine(index, { name: value })
                          }
                          placeholder="Medicine name"
                          placeholderTextColor={Colors.textMuted}
                        />
                      ) : (
                        <Text style={styles.medName} numberOfLines={1}>
                          {med.name}
                        </Text>
                      )}
                      <Text style={styles.medMeta} numberOfLines={2}>
                        {describeDose(med)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setEditingIndex(isEditing ? null : index)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isEditing ? 'Finish editing' : `Edit ${med.name}`
                      }>
                      {isEditing ? (
                        <Check
                          size={18}
                          color={Colors.primary}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <Pencil
                          size={16}
                          color={Colors.textMuted}
                          strokeWidth={2}
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeMedicine(index)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${med.name}`}>
                      <X size={18} color={Colors.textMuted} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>

                  {isEditing && (
                    <View style={styles.medEditBody}>
                      <Text style={styles.fieldLabel}>Dose</Text>
                      <TextInput
                        style={styles.field}
                        value={med.dosage}
                        onChangeText={(value) =>
                          editMedicine(index, { dosage: value })
                        }
                        placeholder="500mg"
                        placeholderTextColor={Colors.textMuted}
                      />

                      <Text style={styles.fieldLabel}>Relation to food</Text>
                      <ChipRow
                        options={FOOD_RELATIONS}
                        value={med.foodRelation}
                        onChange={(foodRelation) =>
                          editMedicine(index, { foodRelation })
                        }
                        wrap
                      />
                    </View>
                  )}
                </MotiView>
              );
            })}
          </>
        )}
      </ScrollView>

      {showReview && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}>
          <PrimaryButton
            label={
              saving
                ? 'Adding…'
                : `Add ${medicines.length === 1 ? 'medicine' : `all ${medicines.length}`} to Medicine`
            }
            hideArrow
            disabled={saving}
            onPress={() => void handleAddAll()}
          />
          <Text style={styles.disclaimer}>
            Always verify against the physical prescription before your first
            dose.
          </Text>
        </View>
      )}
    </View>
  );
}

/** Summarises a detected medicine as one readable line of dose details. */
function describeDose(med: ScannedMedicine): string {
  const food =
    med.foodRelation === 'any' ? 'any time' : `${med.foodRelation} food`;
  const duration = med.durationDays ? `${med.durationDays} days` : 'Ongoing';
  return [med.dosage, med.frequency, food, duration]
    .filter(Boolean)
    .join(' · ');
}

/** Picks sensible reminder slots for a frequency the scanner reported. */
function deriveDefaultTimes(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (f.includes('four')) return ['08:00', '12:00', '16:00', '20:00'];
  if (f.includes('three') || f.includes('thrice'))
    return ['08:00', '14:00', '20:00'];
  if (f.includes('twice')) return ['09:00', '21:00'];
  return ['09:00'];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  captureFrame: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  captureTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  captureTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  captureSubtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  previewWrapper: {
    height: PREVIEW_HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  preview: { width: '100%', height: '100%' },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryTint,
    opacity: 0.5,
  },
  scanLine: {
    height: 4,
    backgroundColor: Colors.primary,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  scanningText: {
    ...Typography.secondary,
    color: Colors.textSecondary,
  },
  actions: { gap: Spacing.md },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.primary,
  },
  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
    ...Shadow.card,
  },
  tipsTitle: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  tipTile: {
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detectedText: {
    ...Typography.caption,
    color: Accents.green.dark,
    fontWeight: '600',
    flex: 1,
  },
  rescanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rescanText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  medCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  medCardEditing: {
    borderColor: Colors.primary,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  medTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.tile,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medHeaderText: { flex: 1 },
  medName: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  medNameInput: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
    padding: 0,
  },
  medMeta: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  medEditBody: {
    marginTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
  },
  fieldLabel: {
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
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    ...Shadow.floating,
  },
  disclaimer: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
