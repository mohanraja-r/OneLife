import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { onboardingState, ActivityLevel } from './state';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

export default function BodyStatsScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const canContinue = height && weight && age && activityLevel;

  const handleContinue = () => {
    onboardingState.heightCm = Number(height);
    onboardingState.weightKg = Number(weight);
    onboardingState.age = Number(age);
    onboardingState.activityLevel = activityLevel!;
    router.push('/onboarding/dietary-preference');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressBar, i <= 2 && styles.progressBarActive]} />
        ))}
      </View>

      <Text style={styles.title}>Body stats</Text>
      <Text style={styles.subtitle}>Used to calculate your daily calorie and macro targets.</Text>

      <TextInput
        style={styles.input}
        placeholder="Height (cm)"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />
      <TextInput
        style={styles.input}
        placeholder="Weight (kg)"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />
      <TextInput
        style={styles.input}
        placeholder="Age"
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        value={age}
        onChangeText={setAge}
      />

      <Text style={styles.label}>Activity level</Text>
      <View style={styles.rowOptions}>
        {ACTIVITY_LEVELS.map((a) => (
          <TouchableOpacity
            key={a.value}
            style={[styles.rowOption, activityLevel === a.value && styles.rowOptionActive]}
            onPress={() => setActivityLevel(a.value)}
          >
            <Text
              style={[
                styles.rowOptionText,
                activityLevel === a.value && styles.rowOptionTextActive,
              ]}
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  rowOptions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  rowOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
  },
  rowOptionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  rowOptionText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  rowOptionTextActive: { color: '#0F6E56' },
  button: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
