import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Activity,
  BatteryCharging,
  CalendarCheck,
  Heart,
  Moon,
  Smile,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react-native';
import { type JSX, useState } from 'react';

import { Accent, Accents } from '../../constants/theme';

import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { onboardingState } from './state';

const accent = Accents.violet;

const OPTIONS: {
  value: string;
  icon: LucideIcon;
  title: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'eat_healthier',
    icon: Heart,
    title: 'Be the best version of myself',
    iconAccent: Accents.violet,
  },
  {
    value: 'build_habits',
    icon: Sparkles,
    title: 'Live a longer, healthier life',
    iconAccent: Accents.green,
  },
  {
    value: 'stay_consistent',
    icon: CalendarCheck,
    title: 'Stay consistent every day',
    iconAccent: Accents.blue,
  },
  {
    value: 'improve_mood',
    icon: Users,
    title: 'Family and loved ones',
    iconAccent: Accents.amber,
  },
  {
    value: 'boost_energy',
    icon: BatteryCharging,
    title: 'Boost my energy',
    iconAccent: Accents.orange,
  },
  {
    value: 'reduce_stress',
    icon: Smile,
    title: 'Build confidence',
    iconAccent: Accents.pink,
  },
  {
    value: 'sleep_better',
    icon: Moon,
    title: 'Sleep better',
    iconAccent: Accents.blue,
  },
  {
    value: 'become_active',
    icon: Activity,
    title: 'Become more active',
    iconAccent: Accents.rose,
  },
];

export default function AchieveTargetsScreen(): JSX.Element {
  const [selected, setSelected] = useState<string[]>(
    onboardingState.achieveTargets ?? []
  );

  /** Adds or removes a motivation from the multi-select answer. */
  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleContinue = () => {
    onboardingState.achieveTargets = selected;
    router.push('/onboarding/previous-apps');
  };

  return (
    <QuestionScreen
      step={9}
      icon={Trophy}
      accent={accent}
      title="What motivates you to succeed?"
      subtitle="Choose what inspires you the most."
      hint="Select all that apply"
      onContinue={handleContinue}
      continueDisabled={selected.length === 0}>
      {OPTIONS.map((option, index) => (
        <StaggeredOption key={option.value} index={index}>
          <OptionCard
            icon={option.icon}
            title={option.title}
            selected={selected.includes(option.value)}
            onPress={() => toggle(option.value)}
            accent={accent}
            iconAccent={option.iconAccent}
            multiSelect
          />
        </StaggeredOption>
      ))}
    </QuestionScreen>
  );
}
