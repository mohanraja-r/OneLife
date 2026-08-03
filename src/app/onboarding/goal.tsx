import { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, Goal } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const OPTIONS: { value: Goal; emoji: string; title: string }[] = [
  { value: 'lose_weight', emoji: '🏃', title: 'Lose Weight' },
  { value: 'maintain', emoji: '⚖️', title: 'Maintain Weight' },
  { value: 'gain_weight', emoji: '💪', title: 'Gain Weight' },
  { value: 'improve_health', emoji: '❤️', title: 'Improve Overall Health' },
  { value: 'build_muscle', emoji: '🏋️', title: 'Build Muscle' },
];

export default function GoalScreen() {
  const [selected, setSelected] = useState<Goal | null>(onboardingState.goal ?? null);

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.goal = selected;
    router.push('/onboarding/challenges');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={5} />
      <Text style={s.title}>What's your primary goal?</Text>

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
