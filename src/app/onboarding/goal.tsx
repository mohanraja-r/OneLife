import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { onboardingState, Goal } from './state';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const GOALS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'gain_muscle', label: 'Gain muscle' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'manage_condition', label: 'Manage a condition (e.g. diabetes)' },
];

export default function GoalSelectionScreen() {
  const selectGoal = (goal: Goal) => {
    onboardingState.goal = goal;
    router.push('/onboarding/gender');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressBar, i === 0 && styles.progressBarActive]} />
        ))}
      </View>

      <Text style={styles.title}>What's your goal?</Text>
      <Text style={styles.subtitle}>We'll tailor suggestions to help you get there.</Text>

      <View style={styles.options}>
        {GOALS.map((g) => (
          <TouchableOpacity key={g.value} style={styles.option} onPress={() => selectGoal(g.value)}>
            <Text style={styles.optionText}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressBar: { height: 4, flex: 1, backgroundColor: '#EFEEE8', borderRadius: 2 },
  progressBarActive: { backgroundColor: Colors.accent },
  title: { ...Typography.title, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  options: { gap: Spacing.md },
  option: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  optionText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
});
