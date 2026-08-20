import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  CalendarClock,
  Clock,
  CookingPot,
  Flag,
  Frown,
  Ellipsis,
  Users,
  Utensils,
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
    value: 'lack_of_consistency',
    icon: CalendarClock,
    title: 'Staying consistent',
    iconAccent: Accents.violet,
  },
  {
    value: 'unhealthy_eating',
    icon: Utensils,
    title: 'Unhealthy eating habits',
    iconAccent: Accents.blue,
  },
  {
    value: 'lack_of_motivation',
    icon: Frown,
    title: 'Lack of motivation',
    iconAccent: Accents.rose,
  },
  {
    value: 'busy_schedule',
    icon: Clock,
    title: 'Time management',
    iconAccent: Accents.amber,
  },
  {
    value: 'meal_planning_hard',
    icon: CookingPot,
    title: 'Meal planning is difficult',
    iconAccent: Accents.green,
  },
  {
    value: 'lack_of_support',
    icon: Users,
    title: 'Lack of support',
    iconAccent: Accents.orange,
  },
  {
    value: 'dont_know_where_to_start',
    icon: Ellipsis,
    title: "Don't know where to start",
    iconAccent: Accents.neutral,
  },
];

export default function ChallengesScreen(): JSX.Element {
  const [selected, setSelected] = useState<string[]>(
    onboardingState.biggestChallenges ?? []
  );

  /** Adds or removes a challenge from the multi-select answer. */
  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleContinue = () => {
    onboardingState.biggestChallenges = selected;
    router.push('/onboarding/eating-style');
  };

  return (
    <QuestionScreen
      step={6}
      icon={Flag}
      accent={accent}
      title="What's your biggest challenge?"
      subtitle="This helps us understand you better and provide support."
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
