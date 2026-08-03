import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, Gender } from './_state';
import { Colors, Spacing } from '../../constants/theme';

const OPTIONS: { value: Gender; emoji: string; title: string }[] = [
  { value: 'man', emoji: '👨', title: 'Male' },
  { value: 'woman', emoji: '👩', title: 'Female' },
  { value: 'non_binary', emoji: '⚧', title: 'Non-binary / Other' },
  { value: 'unspecified', emoji: '🤐', title: 'Prefer not to say' },
];

export default function GenderScreen() {
  const [selected, setSelected] = useState<Gender | null>(onboardingState.gender ?? null);

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.gender = selected;
    router.push('/onboarding/date-of-birth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={1} />
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.question}>What's your gender?</Text>

      <View style={styles.options}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            emoji={o.emoji}
            title={o.title}
            selected={selected === o.value}
            onPress={() => setSelected(o.value)}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!selected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  question: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.lg },
  options: {},
});
