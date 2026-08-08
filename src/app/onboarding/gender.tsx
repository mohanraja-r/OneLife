import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  CircleUserRound,
  Transgender,
  User,
  UserRound,
  Users,
} from 'lucide-react-native';
import React from 'react';

import { Accent, Accents } from '../../constants/theme';

import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { Gender, onboardingState } from './state';

const accent = Accents.violet;

const GENDER_OPTIONS: {
  id: Gender;
  label: string;
  icon: LucideIcon;
  iconAccent: Accent;
}[] = [
  { id: 'man', label: 'Male', icon: User, iconAccent: Accents.blue },
  { id: 'woman', label: 'Female', icon: UserRound, iconAccent: Accents.pink },
  {
    id: 'non_binary',
    label: 'Non-binary / Other',
    icon: Transgender,
    iconAccent: Accents.violet,
  },
  {
    id: 'unspecified',
    label: 'Prefer not to say',
    icon: CircleUserRound,
    iconAccent: Accents.neutral,
  },
];

export default function GenderScreen() {
  const [selected, setSelected] = React.useState<Gender | null>(
    onboardingState.gender ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.gender = selected;
    router.push('/onboarding/date-of-birth');
  };

  return (
    <QuestionScreen
      step={1}
      icon={Users}
      accent={accent}
      title="What's your gender?"
      subtitle="This helps us personalize your experience."
      onContinue={handleContinue}
      continueDisabled={!selected}>
      {GENDER_OPTIONS.map((option, index) => (
        <StaggeredOption key={option.id} index={index}>
          <OptionCard
            icon={option.icon}
            title={option.label}
            selected={selected === option.id}
            onPress={() => setSelected(option.id)}
            accent={accent}
            iconAccent={option.iconAccent}
          />
        </StaggeredOption>
      ))}
    </QuestionScreen>
  );
}
