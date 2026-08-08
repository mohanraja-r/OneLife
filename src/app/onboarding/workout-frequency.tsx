import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Activity, Flame, Footprints, Zap } from 'lucide-react-native';
import { useState } from 'react';

import { Accent, Accents } from '../../constants/theme';

import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { WorkoutFrequency, onboardingState } from './state';

const accent = Accents.violet;

const OPTIONS: {
  value: WorkoutFrequency;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'rarely',
    icon: Zap,
    title: 'Rarely',
    subtitle: '0–2 times per week',
    iconAccent: Accents.violet,
  },
  {
    value: 'sometimes',
    icon: Flame,
    title: 'Sometimes',
    subtitle: '3–5 times per week',
    iconAccent: Accents.orange,
  },
  {
    value: 'frequently',
    icon: Activity,
    title: 'Frequently',
    subtitle: '6+ times per week',
    iconAccent: Accents.green,
  },
];

export default function WorkoutFrequencyScreen() {
  const [selected, setSelected] = useState<WorkoutFrequency | null>(
    onboardingState.workoutFrequency ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.workoutFrequency = selected;
    router.push('/onboarding/goal');
  };

  return (
    <QuestionScreen
      step={4}
      icon={Footprints}
      accent={accent}
      title="How often do you work out?"
      subtitle="This helps us personalize your activity recommendations."
      onContinue={handleContinue}
      continueDisabled={!selected}>
      {OPTIONS.map((option, index) => (
        <StaggeredOption key={option.value} index={index}>
          <OptionCard
            icon={option.icon}
            title={option.title}
            subtitle={option.subtitle}
            selected={selected === option.value}
            onPress={() => setSelected(option.value)}
            accent={accent}
            iconAccent={option.iconAccent}
          />
        </StaggeredOption>
      ))}
    </QuestionScreen>
  );
}
