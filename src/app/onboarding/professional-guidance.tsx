import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, ProfessionalGuidance } from './_state';
import { Colors, Spacing } from '../../constants/theme';

const OPTIONS: { value: ProfessionalGuidance; emoji: string; title: string }[] = [
  { value: 'personal_trainer', emoji: '👨‍⚕️', title: 'Personal Trainer' },
  { value: 'dietitian', emoji: '🥗', title: 'Registered Dietitian' },
  { value: 'both', emoji: '👨‍⚕️', title: 'Both' },
  { value: 'neither', emoji: '❌', title: 'Neither' },
];

export default function ProfessionalGuidanceScreen() {
  const [selected, setSelected] = useState<ProfessionalGuidance | null>(
    onboardingState.professionalGuidance ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.professionalGuidance = selected;
    router.push('/onboarding/achieve-targets');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={9} />
      <Text style={styles.title}>Do you currently work with a professional?</Text>

      {OPTIONS.map((o) => (
        <OptionCard
          key={o.value}
          emoji={o.emoji}
          title={o.title}
          selected={selected === o.value}
          onPress={() => setSelected(o.value)}
        />
      ))}

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!selected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
});
