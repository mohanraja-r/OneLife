import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing } from '../../constants/theme';
import { TOTAL_STEPS } from './_state';

interface Props {
  step: number; // 1-indexed, out of TOTAL_STEPS
  onBack?: () => void;
}

// Matches the attached reference: circular back button + a single
// progress bar (not per-segment dashes) with the filled portion
// proportional to step / TOTAL_STEPS.
export default function OnboardingProgress({ step, onBack }: Props) {
  const progress = Math.min(step / TOTAL_STEPS, 1);

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.backButton} onPress={onBack ?? (() => router.back())}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={styles.trackWrapper}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.textPrimary },
  trackWrapper: { flex: 1 },
  track: { height: 4, backgroundColor: '#EFEEE8', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.textPrimary, borderRadius: 2 },
  stepLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
});
