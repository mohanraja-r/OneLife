import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Accent,
  Accents,
  Colors,
  Radius,
  Spacing,
} from '../../constants/theme';
import { TOTAL_STEPS } from './_state';

interface Props {
  /** 1-indexed, out of TOTAL_STEPS. */
  step: number;
  onBack?: () => void;
  /** Screen accent — colors the filled portion of the track. */
  accent?: Accent;
}

// Chevron back button + a single continuous progress bar (not per-segment
// dashes) with the filled portion proportional to step / TOTAL_STEPS.
export default function OnboardingProgress({
  step,
  onBack,
  accent = Accents.violet,
}: Props) {
  const progress = Math.min(Math.max(step / TOTAL_STEPS, 0), 1);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
      </TouchableOpacity>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: TOTAL_STEPS, now: step }}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: accent.main },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.round,
  },
});
