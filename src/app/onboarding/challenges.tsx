import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const OPTIONS = [
  { value: 'lack_of_consistency', emoji: '✅', title: 'Lack of consistency' },
  { value: 'busy_schedule', emoji: '✅', title: 'Busy schedule' },
  { value: 'unhealthy_eating', emoji: '✅', title: 'Unhealthy eating habits' },
  { value: 'lack_of_motivation', emoji: '✅', title: 'Lack of motivation' },
  { value: 'lack_of_support', emoji: '✅', title: 'Lack of support' },
  { value: 'meal_planning_hard', emoji: '✅', title: 'Meal planning is difficult' },
  { value: 'dont_know_where_to_start', emoji: '✅', title: "Don't know where to start" },
];

export default function ChallengesScreen() {
  const [selected, setSelected] = useState<string[]>(onboardingState.biggestChallenges ?? []);

  const toggle = (value: string) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleContinue = () => {
    onboardingState.biggestChallenges = selected;
    router.push('/onboarding/eating-style');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={6} />
      <Text style={s.title}>What's holding you back?</Text>
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

      <View style={{ flex: 1 }} />
      <ContinueButton
        onPress={handleContinue}
        disabled={selected.length === 0}
      />
    </SafeAreaView>
  );
}
