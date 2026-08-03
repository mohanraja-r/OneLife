import { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, WorkoutFrequency } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const OPTIONS: { value: WorkoutFrequency; emoji: string; title: string; subtitle: string }[] = [
  { value: 'rarely', emoji: '🏠', title: 'Rarely', subtitle: '0–2 times/week' },
  { value: 'sometimes', emoji: '💪', title: 'Sometimes', subtitle: '3–5 times/week' },
  { value: 'frequently', emoji: '🔥', title: 'Frequently', subtitle: '6+ times/week' },
];

export default function WorkoutFrequencyScreen() {
  const [selected, setSelected] = useState<WorkoutFrequency | null>(onboardingState.workoutFrequency ?? null);

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.workoutFrequency = selected;
    router.push('/onboarding/goal');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={4} />
      <Text style={s.title}>How often do you work out?</Text>

      <View style={s.options}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            emoji={o.emoji}
            title={o.title}
            subtitle={o.subtitle}
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
