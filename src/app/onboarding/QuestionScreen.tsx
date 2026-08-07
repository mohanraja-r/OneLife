import type { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accent, Accents, Motion } from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';

interface Props {
  /** 1-indexed step driving the progress bar and the "Step x of y" caption. */
  step: number;
  /** Lucide glyph shown in the round tinted tile above the question. */
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Extra line under the subtitle, e.g. "Select all that apply". */
  hint?: string;
  /** Screen accent — icon tile, progress fill, selection, and button. */
  accent?: Accent;
  children: ReactNode;
  /** Rendered between the scroll area and the Continue button. */
  belowContent?: ReactNode;
  buttonLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
}

/**
 * The shared shell every onboarding question screen renders through: progress
 * header, animated icon tile, title/subtitle block, a scrolling body, and the
 * pinned Continue button — so no screen can drift from the reference layout.
 */
export default function QuestionScreen({
  step,
  icon: Icon,
  title,
  subtitle,
  hint,
  accent = Accents.violet,
  children,
  belowContent,
  buttonLabel,
  onContinue,
  continueDisabled = false,
}: Props) {
  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={step} accent={accent} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[s.iconTile, { backgroundColor: accent.tint }]}>
          <Icon size={32} color={accent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}

        <View style={s.options}>{children}</View>
      </ScrollView>

      {belowContent}

      <View style={s.footer}>
        <ContinueButton
          label={buttonLabel}
          onPress={onContinue}
          disabled={continueDisabled}
          accent={accent}
        />
      </View>
    </SafeAreaView>
  );
}

/** Wraps an option in the staggered fade-and-rise used across the flow. */
export function StaggeredOption({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: Motion.fast,
        delay: Motion.enterDelay + index * Motion.stagger,
      }}>
      {children}
    </MotiView>
  );
}
