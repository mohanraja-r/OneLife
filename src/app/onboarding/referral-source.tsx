import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
// lucide v1 no longer ships brand marks — AtSign/CirclePlay stand in for the
// social and video sources.
import {
  AtSign,
  CirclePlay,
  Ellipsis,
  Globe,
  Megaphone,
  Search,
  Store,
  Users,
} from 'lucide-react-native';
import { useState } from 'react';

import { Accent, Accents } from '../../constants/theme';

import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { onboardingState } from './state';

const accent = Accents.violet;

const SOURCES: {
  value: string;
  icon: LucideIcon;
  title: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'friend',
    icon: Users,
    title: 'Friend or family',
    iconAccent: Accents.violet,
  },
  {
    value: 'social_media',
    icon: AtSign,
    title: 'Social media',
    iconAccent: Accents.pink,
  },
  {
    value: 'google',
    icon: Search,
    title: 'Google search',
    iconAccent: Accents.blue,
  },
  {
    value: 'app_store',
    icon: Store,
    title: 'App Store / Play Store',
    iconAccent: Accents.green,
  },
  {
    value: 'blog',
    icon: Globe,
    title: 'Blog or website',
    iconAccent: Accents.amber,
  },
  {
    value: 'youtube',
    icon: CirclePlay,
    title: 'YouTube',
    iconAccent: Accents.rose,
  },
  {
    value: 'other',
    icon: Ellipsis,
    title: 'Other',
    iconAccent: Accents.neutral,
  },
];

export default function ReferralSourceScreen() {
  const [selected, setSelected] = useState<string | null>(
    onboardingState.referralSource ?? null
  );

  const handleContinue = () => {
    onboardingState.referralSource = selected ?? undefined;
    router.push('/onboarding/creating-plan');
  };

  return (
    <QuestionScreen
      step={12}
      icon={Megaphone}
      accent={accent}
      title="How did you hear about OneLife?"
      subtitle="Your feedback helps us reach more people like you."
      onContinue={handleContinue}
      continueDisabled={!selected}>
      {SOURCES.map((source, index) => (
        <StaggeredOption key={source.value} index={index}>
          <OptionCard
            icon={source.icon}
            title={source.title}
            selected={selected === source.value}
            onPress={() => setSelected(source.value)}
            accent={accent}
            iconAccent={source.iconAccent}
          />
        </StaggeredOption>
      ))}
    </QuestionScreen>
  );
}
