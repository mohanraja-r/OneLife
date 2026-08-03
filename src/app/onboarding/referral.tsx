import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState } from './_state';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function ReferralScreen() {
  const [code, setCode] = useState(onboardingState.referralCode ?? '');

  const proceed = () => {
    onboardingState.referralCode = code || undefined;
    router.push('/onboarding/referral-source');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={12} />
      <Text style={styles.title}>Got a referral code?</Text>

      <TextInput
        style={styles.input}
        placeholder="Referral Code"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={proceed} />
      <TouchableOpacity style={styles.skipButton} onPress={proceed}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  skipButton: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
});
