import { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const OPTIONS = [
  { value: 'eat_healthier', emoji: '❤️', title: 'Eat healthier' },
  { value: 'boost_energy', emoji: '⚡', title: 'Boost energy' },
  { value: 'improve_mood', emoji: '😊', title: 'Improve mood' },
  { value: 'build_habits', emoji: '💪', title: 'Build healthy habits' },
  { value: 'stay_consistent', emoji: '📅', title: 'Stay consistent' },
  { value: 'reduce_stress', emoji: '🧘', title: 'Reduce stress' },
  { value: 'sleep_better', emoji: '😴', title: 'Sleep better' },
  { value: 'become_active', emoji: '🏃', title: 'Become more active' },
];

export default function AchieveTargetsScreen() {
  const [selected, setSelected] = useState<string[]>(onboardingState.achieveTargets ?? []);

  const toggle = (value: string) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleContinue = () => {
    onboardingState.achieveTargets = selected;
    router.push('/onboarding/previous-apps');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={9} />
      <Text style={s.title}>What would you like OneLife to help you with?</Text>
      <Text style={s.hint}>Select all that apply</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            emoji={o.emoji}
            title={o.title}
            selected={selected.includes(o.value)}
            onPress={() => toggle(o.value)}
            multiSelect
          />
        ))}
      </ScrollView>

      <ContinueButton onPress={handleContinue} disabled={selected.length === 0} />
    </SafeAreaView>
  );
}
