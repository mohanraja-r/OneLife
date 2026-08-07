import { router } from 'expo-router';
import { Check, HeartPulse, Loader } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import { onboardingStyles as s } from './onboardingStyles';

const accent = Accents.violet;

const STEPS = [
  'Analyzing your inputs',
  'Understanding your goals',
  'Building your plan',
];

/** Milliseconds each checklist line takes to tick over. */
const STEP_DURATION = 900;

export default function CreatingPlanScreen() {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCompleted((prev) => {
        const next = prev + 1;
        if (next >= STEPS.length) {
          clearInterval(interval);
          setTimeout(
            () => router.replace('/onboarding/create-account'),
            STEP_DURATION
          );
        }
        return Math.min(next, STEPS.length);
      });
    }, STEP_DURATION);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {/* Pulsing ring behind the heart, echoing the reference's halo. */}
        <MotiView
          from={{ opacity: 0.35, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1.06 }}
          transition={{
            type: 'timing',
            duration: 900,
            loop: true,
            repeatReverse: true,
          }}
          style={[styles.ring, { borderColor: accent.main }]}>
          <View style={[styles.ringInner, { backgroundColor: accent.tint }]}>
            <HeartPulse size={40} color={accent.main} strokeWidth={2} />
          </View>
        </MotiView>

        <Text style={s.title}>Creating your personalized plan</Text>
        <Text style={s.subtitle}>
          Please wait while we customize your experience just for you.
        </Text>

        <View style={styles.checklist}>
          {STEPS.map((label, index) => {
            const done = index < completed;
            return (
              <MotiView
                key={label}
                animate={{ opacity: done ? 1 : 0.45 }}
                transition={{ type: 'timing', duration: Motion.fast }}
                style={styles.checkRow}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: done
                        ? accent.main
                        : Colors.surfaceSunken,
                    },
                  ]}>
                  {done && (
                    <Check
                      size={14}
                      color={Colors.textInverse}
                      strokeWidth={3}
                    />
                  )}
                </View>
                <Text style={styles.checkLabel}>{label}</Text>
              </MotiView>
            );
          })}

          <View style={styles.checkRow}>
            <MotiView
              from={{ rotate: '0deg' }}
              animate={{ rotate: '360deg' }}
              transition={{ type: 'timing', duration: 1200, loop: true }}
              style={styles.checkCircle}>
              <Loader
                size={14}
                color={Colors.textSecondary}
                strokeWidth={2.5}
              />
            </MotiView>
            <Text style={[styles.checkLabel, styles.checkLabelMuted]}>
              Almost done…
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 112,
    height: 112,
    borderRadius: Radius.round,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  ringInner: {
    width: 88,
    height: 88,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklist: {
    alignSelf: 'stretch',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkLabel: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  checkLabelMuted: {
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
