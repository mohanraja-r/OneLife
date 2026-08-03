import { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const SOURCES = [
  { value: 'instagram', emoji: '📷', title: 'Instagram' },
  { value: 'facebook', emoji: '📘', title: 'Facebook' },
  { value: 'youtube', emoji: '▶️', title: 'YouTube' },
  { value: 'google', emoji: '🔍', title: 'Google' },
  { value: 'friend', emoji: '👥', title: 'Friend' },
  { value: 'linkedin', emoji: '💼', title: 'LinkedIn' },
  { value: 'tiktok', emoji: '🎵', title: 'TikTok' },
  { value: 'play_store', emoji: '▶️', title: 'Play Store' },
  { value: 'app_store', emoji: '🍎', title: 'App Store' },
  { value: 'other', emoji: '❔', title: 'Other' },
];

export default function ReferralSourceScreen() {
  const [selected, setSelected] = useState<string | null>(onboardingState.referralSource ?? null);

  const handleContinue = () => {
    onboardingState.referralSource = selected ?? undefined;
    router.push('/onboarding/creating-plan');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={12} />
      <Text style={s.title}>Where did you hear about us?</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {SOURCES.map((so) => (
          <OptionCard
            key={so.value}
            emoji={so.emoji}
            title={so.title}
            selected={selected === so.value}
            onPress={() => setSelected(so.value)}
          />
        ))}
      </ScrollView>

      <ContinueButton onPress={handleContinue} disabled={!selected} />
    </SafeAreaView>
  );
}
