import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Beef,
  Carrot,
  Drumstick,
  Egg,
  Fish,
  Leaf,
  Salad,
  Wheat,
} from 'lucide-react-native';
import { type JSX, useState } from 'react';

import { Accent, Accents } from '../../constants/theme';

import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { EatingStyle, onboardingState } from './state';

const accent = Accents.violet;

const OPTIONS: {
  value: EatingStyle;
  icon: LucideIcon;
  title: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'no_special_diet',
    icon: Drumstick,
    title: 'I eat everything',
    iconAccent: Accents.green,
  },
  {
    value: 'vegetarian',
    icon: Carrot,
    title: 'Vegetarian',
    iconAccent: Accents.orange,
  },
  { value: 'vegan', icon: Leaf, title: 'Vegan', iconAccent: Accents.green },
  {
    value: 'whole_foods',
    icon: Salad,
    title: 'Whole foods',
    iconAccent: Accents.amber,
  },
  { value: 'keto', icon: Beef, title: 'Keto', iconAccent: Accents.rose },
  {
    value: 'paleo',
    icon: Fish,
    title: 'Pescatarian',
    iconAccent: Accents.blue,
  },
  {
    value: 'high_protein',
    icon: Egg,
    title: 'High protein',
    iconAccent: Accents.amber,
  },
  {
    value: 'balanced',
    icon: Wheat,
    title: 'Balanced',
    iconAccent: Accents.violet,
  },
];

export default function EatingStyleScreen(): JSX.Element {
  const [selected, setSelected] = useState<EatingStyle | null>(
    onboardingState.eatingStyle ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.eatingStyle = selected;
    router.push('/onboarding/professional-guidance');
  };

  return (
    <QuestionScreen
      step={7}
      icon={Salad}
      accent={accent}
      title="What best describes your eating style?"
      subtitle="We'll tailor meal suggestions that fit your lifestyle."
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
