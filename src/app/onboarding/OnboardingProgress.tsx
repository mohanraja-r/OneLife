import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  Accent,
  Accents,
  Colors,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';

import { TOTAL_STEPS } from './state';

interface Props {
  /** 1-indexed, out of TOTAL_STEPS. */
  step: number;
  onBack?: () => void;
  /** Screen accent — colors the filled portion of the track. */
  accent?: Accent;
  /** Hide the "Step x of y" caption (terminal screens with no step number). */
  hideLabel?: boolean;
}

// Chevron back button + a single continuous progress bar (not per-segment
// dashes) with the filled portion proportional to step / TOTAL_STEPS, and a
// centered "Step x of y" caption underneath.
export default function OnboardingProgress({
  step,
  onBack,
  accent = Accents.violet,
  hideLabel = false,
}: Props) {
  const progress = Math.min(Math.max(step / TOTAL_STEPS, 0), 1);

  return (
    <View>
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

      {!hideLabel && (
        <Text style={styles.stepLabel}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      )}
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
  stepLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
