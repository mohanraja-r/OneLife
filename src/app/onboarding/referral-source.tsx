import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './_state';
import { Colors, Spacing } from '../../constants/theme';

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
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={13} />
      <Text style={styles.title}>Where did you hear about us?</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {SOURCES.map((s) => (
          <OptionCard
            key={s.value}
            emoji={s.emoji}
            title={s.title}
            selected={selected === s.value}
            onPress={() => setSelected(s.value)}
          />
        ))}
      </ScrollView>

      <ContinueButton onPress={handleContinue} disabled={!selected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
});
