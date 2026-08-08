import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { errorMessage } from '../services/errors';
import { identifyMeal } from '../services/meals';

export default function LogMealScreen() {
  const [identifying, setIdentifying] = useState(false);

  const handlePhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera/photo access is required to log a meal by photo.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets[0]) return;

    setIdentifying(true);
    try {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mediaType = result.assets[0].mimeType ?? 'image/jpeg';

      const identified = await identifyMeal({ imageBase64: base64, mediaType });

      if (identified.error) {
        Alert.alert('Could not identify meal', identified.error);
        setIdentifying(false);
        return;
      }

      router.replace({
        pathname: '/confirm-meal',
        params: {
          photoUri: uri,
          items: JSON.stringify(identified.items),
          suggestion: identified.suggestion,
          source: 'photo',
        },
      });
    } catch (err) {
      Alert.alert('Error identifying meal', errorMessage(err, 'Something went wrong'));
      setIdentifying(false);
    }
  };

  const handleTypeInstead = () => {
    router.push('/log-meal-manual');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log a meal</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {identifying ? (
          <View style={styles.identifyingBox}>
            <ActivityIndicator color={Colors.accent} size="large" />
            <Text style={styles.identifyingText}>Identifying your meal...</Text>
          </View>
        ) : (
          <View style={styles.captureBox}>
            <Text style={styles.captureHint}>Point your camera at the plate</Text>
          </View>
        )}

        {!identifying && (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void handlePhoto(true)}>
              <Text style={styles.primaryButtonText}>📷 Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleTypeInstead}>
              <Text style={styles.secondaryButtonText}>⌨️ Type instead</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryLink} onPress={() => void handlePhoto(false)}>
              <Text style={styles.galleryLinkText}>or choose from gallery</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  content: { flex: 1, padding: Spacing.md, paddingTop: Spacing.lg },
  captureBox: {
    height: 220,
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
  identifyingBox: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  identifyingText: { color: Colors.textSecondary, fontSize: 14 },
  primaryButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  galleryLink: { alignItems: 'center', marginTop: Spacing.md },
  galleryLinkText: { color: Colors.textMuted, fontSize: 12 },
});
