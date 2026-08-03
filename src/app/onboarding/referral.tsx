import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';
import { Colors, Spacing } from '../../constants/theme';

export default function ReferralScreen() {
  const [code, setCode] = useState(onboardingState.referralCode ?? '');

  const proceed = () => {
    onboardingState.referralCode = code || undefined;
    router.push('/onboarding/referral-source');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={11} />
      <Text style={s.title}>Got a referral code?</Text>

      <TextInput
        style={s.input}
        placeholder="Referral Code"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={proceed} />
      <TouchableOpacity style={{ alignItems: 'center', paddingVertical: Spacing.md }} onPress={proceed}>
        <Text style={{ color: Colors.textMuted, fontSize: 15, fontWeight: '600' }}>Skip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
