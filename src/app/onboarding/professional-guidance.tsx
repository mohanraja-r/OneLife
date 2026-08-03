import { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, ProfessionalGuidance } from './state';
import { onboardingStyles as s } from './onboardingStyles';

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
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={8} />
      <Text style={s.title}>Do you currently work with a professional?</Text>

      <View style={s.options}>
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
