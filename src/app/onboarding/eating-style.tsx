import { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import ContinueButton from './ContinueButton';
import { onboardingState, EatingStyle } from './state';
import { onboardingStyles as s } from './onboardingStyles';

const OPTIONS: { value: EatingStyle; emoji: string; title: string }[] = [
  { value: 'balanced', emoji: '🍽️', title: 'Balanced' },
  { value: 'whole_foods', emoji: '🥗', title: 'Whole Foods' },
  { value: 'vegetarian', emoji: '🌱', title: 'Vegetarian' },
  { value: 'vegan', emoji: '🌿', title: 'Vegan' },
  { value: 'keto', emoji: '🥩', title: 'Keto' },
  { value: 'paleo', emoji: '🥜', title: 'Paleo' },
  { value: 'high_protein', emoji: '🍚', title: 'High Protein' },
  { value: 'no_special_diet', emoji: '❌', title: 'No Special Diet' },
];

export default function EatingStyleScreen() {
  const [selected, setSelected] = useState<EatingStyle | null>(onboardingState.eatingStyle ?? null);

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.eatingStyle = selected;
    router.push('/onboarding/professional-guidance');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={7} />
      <Text style={s.title}>Do you follow a specific diet?</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            emoji={o.emoji}
            title={o.title}
            selected={selected === o.value}
            onPress={() => setSelected(o.value)}
          />
        ))}
      </ScrollView>

      <ContinueButton onPress={handleContinue} disabled={!selected} />
    </SafeAreaView>
  );
}
