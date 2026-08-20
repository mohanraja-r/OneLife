import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Apple,
  CircleSlash,
  Dumbbell,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react-native';
import { type JSX, useState } from 'react';
import { Text, View } from 'react-native';

import { Accent, Accents } from '../../constants/theme';

import { onboardingStyles as s } from './onboardingStyles';
import OptionCard from './OptionCard';
import QuestionScreen, { StaggeredOption } from './QuestionScreen';
import { ProfessionalGuidance, onboardingState } from './state';

const accent = Accents.violet;

const OPTIONS: {
  value: ProfessionalGuidance;
  icon: LucideIcon;
  title: string;
  iconAccent: Accent;
}[] = [
  {
    value: 'personal_trainer',
    icon: Dumbbell,
    title: 'Yes, a personal trainer',
    iconAccent: Accents.orange,
  },
  {
    value: 'dietitian',
    icon: Apple,
    title: 'Yes, a registered dietitian',
    iconAccent: Accents.green,
  },
  {
    value: 'both',
    icon: UsersRound,
    title: 'Yes, both',
    iconAccent: Accents.blue,
  },
  {
    value: 'neither',
    icon: CircleSlash,
    title: 'Not right now',
    iconAccent: Accents.neutral,
  },
];

export default function ProfessionalGuidanceScreen(): JSX.Element {
  const [selected, setSelected] = useState<ProfessionalGuidance | null>(
    onboardingState.professionalGuidance ?? null
  );

  const handleContinue = () => {
    if (!selected) return;
    onboardingState.professionalGuidance = selected;
    router.push('/onboarding/achieve-targets');
  };

  return (
    <QuestionScreen
      step={8}
      icon={Stethoscope}
      accent={accent}
      title="Do you currently work with a professional?"
      subtitle="We'll help you stay aligned with your care team."
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

      <View style={[s.noteCard, { backgroundColor: Accents.green.tint }]}>
        <View style={s.noteIcon}>
          <ShieldCheck size={20} color={Accents.green.main} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.noteTitle}>Your data is private and secure</Text>
          <Text style={s.noteBody}>
            We never share your data without your permission.
          </Text>
        </View>
      </View>
    </QuestionScreen>
  );
}
