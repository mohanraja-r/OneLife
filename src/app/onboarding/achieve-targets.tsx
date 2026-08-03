import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState } from './_state';
import { Colors, Spacing } from '../../constants/theme';

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
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={10} />
      <Text style={styles.title}>What would you like OneLife to help you with?</Text>
      <Text style={styles.hint}>Select all that apply</Text>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  hint: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg },
});
