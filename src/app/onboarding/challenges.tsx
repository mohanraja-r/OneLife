import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './_state';
import { Colors, Spacing } from '../../constants/theme';

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
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={7} />
      <Text style={styles.title}>What's holding you back?</Text>
      <Text style={styles.hint}>Select all that apply</Text>

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

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={selected.length === 0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg },
});
