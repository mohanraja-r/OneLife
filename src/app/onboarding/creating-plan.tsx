import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing } from '../../constants/theme';

const STEPS = [
  'Analyzing your goals',
  'Preparing your dashboard',
  'Building healthy routines',
  'Setting recommendations',
];

export default function CreatingPlanScreen() {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const spin = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const interval = setInterval(() => {
      setVisibleSteps((prev) => {
        if (prev >= STEPS.length) {
          clearInterval(interval);
          setTimeout(() => router.replace('/onboarding/create-account'), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Text style={[styles.brain, { transform: [{ rotate }] }]}>🧠</Animated.Text>
      <Text style={styles.title}>Creating your personalized plan...</Text>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <Text key={step} style={[styles.step, i < visibleSteps && styles.stepDone]}>
            {i < visibleSteps ? '✔' : '○'} {step}
          </Text>
        ))}
      </View>

      <Text style={styles.almost}>Almost Ready...</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  brain: { fontSize: 56, marginBottom: Spacing.lg },
  title: { fontSize: 19, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xl, textAlign: 'center' },
  steps: { alignSelf: 'stretch', gap: Spacing.md, marginBottom: Spacing.xl },
  step: { fontSize: 14, color: Colors.textMuted },
  stepDone: { color: Colors.accent, fontWeight: '600' },
  almost: { fontSize: 13, color: Colors.textMuted },
});
