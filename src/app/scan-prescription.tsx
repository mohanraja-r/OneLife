import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { scanPrescription, ScannedMedicine } from '../services/prescriptionScan';
import { addMedicine } from '../services/medicine';
import { requestNotificationPermission, scheduleMedicineReminder } from '../services/notifications';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function ScanPrescriptionScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [medicines, setMedicines] = useState<ScannedMedicine[]>([]);
  const [saving, setSaving] = useState(false);

  const pickAndScan = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera/photo access is required to scan a prescription.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: false });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    setScanning(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mediaType = result.assets[0].mimeType ?? 'image/jpeg';

      const scanResult = await scanPrescription(base64, mediaType);

      if (scanResult.error) {
        Alert.alert('Could not read prescription', scanResult.error);
      } else if (scanResult.medicines.length === 0) {
        Alert.alert('No medicines found', 'Try a clearer photo, or add medicines manually.');
      } else {
        setMedicines(scanResult.medicines);
      }
    } catch (err: any) {
      Alert.alert('Error scanning prescription', err.message ?? 'Something went wrong');
    } finally {
      setScanning(false);
    }
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleAddAll = async () => {
    setSaving(true);
    try {
      for (const med of medicines) {
        const timesForFrequency = deriveDefaultTimes(med.frequency);
        const saved = await addMedicine({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          times: timesForFrequency,
          foodRelation: med.foodRelation,
          durationType: med.durationDays ? 'course' : 'ongoing',
          durationEndDate: med.durationDays
            ? new Date(Date.now() + med.durationDays * 86400000).toISOString().slice(0, 10)
            : undefined,
        });

        const granted = await requestNotificationPermission();
        if (granted) {
          for (const time of timesForFrequency) {
            await scheduleMedicineReminder(saved.name, saved.dosage, time);
          }
        }
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Error adding medicines', err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Prescription</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!photoUri && (
          <View style={styles.captureBox}>
            <Text style={styles.captureHint}>Point your camera at the prescription</Text>
          </View>
        )}
        {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

        {!photoUri && (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickAndScan(true)}>
              <Text style={styles.primaryButtonText}>📷 Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => pickAndScan(false)}>
              <Text style={styles.secondaryButtonText}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {scanning && (
          <View style={styles.scanningRow}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.scanningText}>Reading prescription...</Text>
          </View>
        )}

        {medicines.length > 0 && (
          <>
            <View style={styles.detectedBanner}>
              <Text style={styles.detectedText}>
                {medicines.length} medicine{medicines.length > 1 ? 's' : ''} detected — review before
                adding
              </Text>
            </View>

            {medicines.map((med, index) => (
              <View key={index} style={styles.medicineCard}>
                <View style={styles.medicineCardHeader}>
                  <Text style={styles.medicineName}>{med.name}</Text>
                  <TouchableOpacity onPress={() => removeMedicine(index)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.medicineDetail}>
                  {med.dosage} · {med.frequency} · {med.foodRelation === 'any' ? 'any time' : `${med.foodRelation} food`}
                </Text>
                {med.durationDays && (
                  <Text style={styles.medicineDetailMuted}>{med.durationDays} days</Text>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addAllButton}
              onPress={handleAddAll}
              disabled={saving}
            >
              <Text style={styles.addAllText}>
                {saving ? 'Adding...' : `Add ${medicines.length} to Medicine`}
              </Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              Always verify against the physical prescription before your first dose.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Best-effort default reminder times based on a frequency label — the user
// can always adjust these later via Edit Medicine.
function deriveDefaultTimes(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (f.includes('once')) return ['09:00'];
  if (f.includes('twice')) return ['09:00', '21:00'];
  if (f.includes('three') || f.includes('thrice')) return ['08:00', '14:00', '20:00'];
  return ['09:00'];
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
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  content: { padding: Spacing.md },
  captureBox: {
    height: 200,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    marginBottom: Spacing.lg,
  },
  captureHint: { color: Colors.textSecondary, fontSize: 13 },
  preview: { width: '100%', height: 220, borderRadius: Radius.lg, marginBottom: Spacing.lg },
  buttonRow: { gap: Spacing.sm },
  primaryButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.lg },
  scanningText: { color: Colors.textSecondary, fontSize: 13 },
  detectedBanner: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  detectedText: { color: '#0F6E56', fontSize: 12.5, fontWeight: '600' },
  medicineCard: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  medicineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  medicineName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  removeText: { color: Colors.textMuted, fontSize: 14 },
  medicineDetail: { fontSize: 12, color: Colors.textSecondary },
  medicineDetailMuted: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  addAllButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  addAllText: { color: 'white', fontSize: 15, fontWeight: '600' },
  disclaimer: { fontSize: 10.5, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
});
