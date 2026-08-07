import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accent, Accents, Motion } from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import OptionCard from './OptionCard';
import { onboardingStyles as s } from './onboardingStyles';
import { Gender, onboardingState } from './state';

const accent = Accents.violet;

const GENDER_OPTIONS: {
  id: Gender;
  label: string;
  glyph: string;
  accent: Accent;
}[] = [
  { id: 'man', label: 'Male', glyph: '♂', accent: Accents.blue },
  { id: 'woman', label: 'Female', glyph: '♀', accent: Accents.pink },
  {
    id: 'non_binary',
    label: 'Non-binary / Other',
    glyph: '⚧',
    accent: Accents.violet,
  },
  {
    id: 'unspecified',
    label: 'Prefer not to say',
    glyph: '👤',
    accent: Accents.neutral,
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
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={1} accent={accent} />

      <View style={s.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[s.iconTile, { backgroundColor: accent.tint }]}>
          <Users size={32} color={accent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>What&apos;s your gender?</Text>
        <Text style={s.subtitle}>
          This helps us personalize your experience.
        </Text>

        <View style={s.options}>
          {GENDER_OPTIONS.map((option, index) => (
            <MotiView
              key={option.id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: Motion.fast,
                delay: Motion.enterDelay + index * Motion.stagger,
              }}>
              <OptionCard
                emoji={option.glyph}
                title={option.label}
                selected={selected === option.id}
                onPress={() => setSelected(option.id)}
                accent={accent}
                iconAccent={option.accent}
              />
            </MotiView>
          ))}
        </View>
      </View>

      <View style={s.footer}>
        <ContinueButton
          onPress={handleContinue}
          disabled={!selected}
          accent={accent}
        />
      </View>
    </SafeAreaView>
  );
}
