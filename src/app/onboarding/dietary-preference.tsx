import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { onboardingState, resetOnboardingState, DietaryPreference } from './state';
import { supabase } from '../../services/supabase';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

const DIETARY_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
];

// Simple calorie/macro estimate (Mifflin-St Jeor style, rough v1).
// Refine later — good enough to seed a starting target.
function estimateTargets(
  heightCm: number,
  weightKg: number,
  age: number,
  activityLevel: string,
  goal: string
) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5; // assumes male constant; refine with gender later
  const activityMultiplier = { low: 1.2, moderate: 1.55, high: 1.75 }[activityLevel] ?? 1.375;
  let calories = Math.round(bmr * activityMultiplier);

  if (goal === 'lose_weight') calories -= 400;
  if (goal === 'gain_muscle') calories += 300;

  const protein = Math.round((calories * 0.3) / 4);
  const carbs = Math.round((calories * 0.45) / 4);
  const fat = Math.round((calories * 0.25) / 9);

  return { calories, protein, carbs, fat };
}

export default function DietaryPreferenceScreen() {
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (!dietaryPreference) return;
    onboardingState.dietaryPreference = dietaryPreference;
    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      Alert.alert('Error', 'No active session. Please sign in again.');
      setSaving(false);
      router.replace('/signup');
      return;
    }

    const { heightCm, weightKg, age, activityLevel, goal, gender } = onboardingState;
    const targets = estimateTargets(heightCm!, weightKg!, age!, activityLevel!, goal!);

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: sessionData.session!.user.email?.split('@')[0] ?? 'User',
      gender,
      goal,
      dietary_preference: dietaryPreference,
      activity_level: activityLevel,
      height_cm: heightCm,
      weight_kg: weightKg,
      age,
      daily_calorie_target: targets.calories,
      macro_protein_target: targets.protein,
      macro_carbs_target: targets.carbs,
      macro_fat_target: targets.fat,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error saving profile', error.message);
      return;
    }

    resetOnboardingState();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.progressBar, styles.progressBarActive]} />
        ))}
      </View>

      <Text style={styles.title}>Dietary preference</Text>
      <Text style={styles.subtitle}>Helps us suggest meals that actually fit what you eat.</Text>

      <View style={styles.options}>
        {DIETARY_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.option, dietaryPreference === d.value && styles.optionActive]}
            onPress={() => setDietaryPreference(d.value)}
          >
            <Text
              style={[
                styles.optionText,
                dietaryPreference === d.value && styles.optionTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, (!dietaryPreference || saving) && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={!dietaryPreference || saving}
      >
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Finish'}</Text>
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
  options: { gap: Spacing.md, marginBottom: Spacing.xl },
  option: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  optionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentLight },
  optionText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optionTextActive: { color: '#0F6E56' },
  button: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
