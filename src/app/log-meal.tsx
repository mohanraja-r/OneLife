import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Camera,
  Images,
  Keyboard,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
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
import { identifyMeal } from '../services/meals';

export default function LogMealScreen() {
  const [identifying, setIdentifying] = useState(false);

  /** Opens the camera or the photo library, then hands the shot to the AI and
   *  routes to the confirm screen with its guesses. */
  const handlePhoto = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera/photo access is required to log a meal by photo.');
      return;
    }

    // `base64: true` asks the picker for the encoded bytes directly. Reading the
    // file afterwards would mean expo-file-system's legacy API, which throws at
    // runtime on SDK 54.
    const options: ImagePicker.ImagePickerOptions = { quality: 0.7, base64: true };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;

    setIdentifying(true);
    try {
      const identified = await identifyMeal({
        imageBase64: asset.base64,
        mediaType: asset.mimeType ?? 'image/jpeg',
      });

      if (identified.error) {
        Alert.alert('Could not identify meal', identified.error);
        setIdentifying(false);
        return;
      }

      router.replace({
        pathname: '/confirm-meal',
        params: {
          photoUri: asset.uri,
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

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Log a Meal" />

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.base }}>
          <Text style={styles.title}>What did you eat?</Text>
          <Text style={styles.subtitle}>
            Take a photo of your meal or type it in. We&apos;ll help you log it.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow, delay: Motion.enterDelay }}
          style={styles.hero}>
          {identifying ? (
            <View style={styles.heroCenter}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.identifyingText}>Identifying your meal…</Text>
            </View>
          ) : (
            <>
              <View style={styles.plate}>
                <UtensilsCrossed size={56} color={Colors.primary} strokeWidth={1.6} />
              </View>
              <Sparkles
                size={20}
                color={Accents.amber.main}
                strokeWidth={2}
                style={styles.sparkleTop}
              />
              <Sparkles
                size={14}
                color={Accents.pink.main}
                strokeWidth={2}
                style={styles.sparkleBottom}
              />
              <LinearGradient
                colors={Gradients.primary}
                start={Gradients.diagonal.start}
                end={Gradients.diagonal.end}
                style={styles.heroBadge}>
                <Camera size={22} color={Colors.textInverse} strokeWidth={2.2} />
              </LinearGradient>
            </>
          )}
        </MotiView>

        {!identifying && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base, delay: Motion.enterDelay * 2 }}
            style={styles.actions}>
            <PrimaryButton
              label="Take Photo"
              icon={Camera}
              hideArrow
              onPress={() => void handlePhoto(true)}
            />

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => router.push('/log-meal-manual')}
              accessibilityRole="button"
              accessibilityLabel="Type your meal instead">
              <Keyboard size={20} color={Colors.textPrimary} strokeWidth={2} />
              <Text style={styles.secondaryButtonText}>Type Instead</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or choose from gallery</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.galleryLink}
              activeOpacity={0.7}
              onPress={() => void handlePhoto(false)}
              accessibilityRole="button"
              accessibilityLabel="Open gallery">
              <Images size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.galleryLinkText}>Open Gallery</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
  },
  title: { ...Typography.screenTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  hero: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  heroCenter: { alignItems: 'center', gap: Spacing.lg },
  identifyingText: { ...Typography.secondary, color: Colors.textSecondary },
  plate: {
    width: 180,
    height: 180,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleTop: { position: 'absolute', top: '18%', right: '20%' },
  sparkleBottom: { position: 'absolute', bottom: '24%', left: '22%' },
  heroBadge: {
    position: 'absolute',
    right: '20%',
    bottom: '12%',
    width: 52,
    height: 52,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
    ...Shadow.glow,
  },
  actions: { gap: Spacing.md, paddingBottom: Spacing.xl },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
  },
  secondaryButtonText: { ...Typography.button, color: Colors.textPrimary },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.label, color: Colors.textMuted },
  galleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  galleryLinkText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.primary,
  },
});
