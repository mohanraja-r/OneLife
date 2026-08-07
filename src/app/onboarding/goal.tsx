import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Dumbbell,
  HeartPulse,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useState } from 'react';
import { Accent, Accents } from '../../constants/theme';
import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { Goal, onboardingState } from './state';

const accent = Accents.violet;

const OPTIONS: {
  value: Goal;
  icon: LucideIcon;
  title: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'lose_weight',
    icon: TrendingDown,
    title: 'Lose Weight',
    iconAccent: Accents.violet,
  },
  {
    value: 'maintain',
    icon: Scale,
    title: 'Maintain Weight',
    iconAccent: Accents.green,
  },
  {
    value: 'build_muscle',
    icon: Dumbbell,
    title: 'Build Muscle',
    iconAccent: Accents.orange,
  },
  {
    value: 'improve_health',
    icon: HeartPulse,
    title: 'Improve Overall Health',
    iconAccent: Accents.blue,
  },
  {
    value: 'gain_weight',
    icon: TrendingUp,
    title: 'Gain Weight',
    iconAccent: Accents.amber,
  },
];

export default function GoalScreen() {
  const [selected, setSelected] = useState<Goal | null>(
    onboardingState.goal ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.goal = selected;
    router.push('/onboarding/challenges');
  };

  return (
    <QuestionScreen
      step={5}
      icon={Target}
      accent={accent}
      title="What is your primary goal?"
      subtitle="Your goal helps us build a plan that's right for you."
      onContinue={handleContinue}
      continueDisabled={!selected}>
      {OPTIONS.map((option, index) => (
        <StaggeredOption key={option.value} index={index}>
          <OptionCard
            icon={option.icon}
            title={option.title}
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
