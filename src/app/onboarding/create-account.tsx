import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { onboardingState, resetOnboardingState } from './_state';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

// Estimates daily calorie/macro targets from the collected onboarding data.
// Rough v1 formula — refine later once real usage data exists.
function estimateTargets(
  heightCm: number,
  weightKg: number,
  age: number,
  workoutFrequency: string,
  goal: string,
) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const activityMultiplier =
    { rarely: 1.2, sometimes: 1.55, frequently: 1.75 }[workoutFrequency] ??
    1.375;
  let calories = Math.round(bmr * activityMultiplier);
  if (goal === 'lose_weight') calories -= 400;
  if (goal === 'gain_weight' || goal === 'build_muscle') calories += 300;

  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.45) / 4),
    fat: Math.round((calories * 0.25) / 9),
  };
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const saveEverything = async (userId: string, userEmail: string) => {
    const {
      gender,
      dateOfBirth,
      heightValue,
      heightUnit,
      weightValue,
      weightUnit,
      workoutFrequency,
      goal,
      biggestChallenges,
      eatingStyle,
      professionalGuidance,
      achieveTargets,
      usedPreviousApp,
      previousAppName,
      referralCode,
      referralSource,
    } = onboardingState;

    const age = dateOfBirth ? calculateAge(dateOfBirth) : 30;
    const targets = estimateTargets(
      heightValue ?? 170,
      weightValue ?? 70,
      age,
      workoutFrequency ?? 'sometimes',
      goal ?? 'maintain',
    );

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: userEmail.split('@')[0],
      gender,
      date_of_birth: dateOfBirth,
      height_cm: heightValue,
      height_unit: heightUnit,
      weight_kg: weightValue,
      weight_unit: weightUnit,
      workout_frequency: workoutFrequency,
      goal,
      biggest_challenges: biggestChallenges ?? [],
      eating_style: eatingStyle,
      professional_guidance: professionalGuidance,
      achieve_targets: achieveTargets ?? [],
      used_previous_app: usedPreviousApp,
      previous_app_name: previousAppName,
      referral_code: referralCode,
      referral_source: referralSource,
      daily_calorie_target: targets.calories,
      macro_protein_target: targets.protein,
      macro_carbs_target: targets.carbs,
      macro_fat_target: targets.fat,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (error) throw error;
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Account created but no user returned.');

      if (!data.session) {
        // No session means email confirmation is required before the user
        // can write to RLS-protected tables. Can't save the profile yet.
        Alert.alert(
          'Check your email',
          'We sent a confirmation link. Please verify your email, then log in to finish setup.',
        );
        resetOnboardingState();
        router.replace('/signup');
        return;
      }

      await saveEverything(data.user.id, email);
      resetOnboardingState();
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // Google/Apple sign-in require additional native setup (expo-auth-session
  // + provider credentials) — wired as a TODO so the button exists and the
  // flow is complete, without blocking on OAuth configuration right now.
  const handleOAuth = (provider: 'google' | 'apple') => {
    Alert.alert(
      'Coming soon',
      `${provider === 'google' ? 'Google' : 'Apple'} sign-in setup is a follow-up step.`,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your personalized plan is ready!</Text>
        <Text style={styles.subtitle}>
          Create an account to save your progress.
        </Text>

        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('google')}
        >
          <Text style={styles.oauthText}>🟢 Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('apple')}
        >
          <Text style={styles.oauthText}>🍎 Continue with Apple</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailSignUp}
          disabled={saving}
        >
          <Text style={styles.emailButtonText}>
            {saving ? 'Creating account...' : '📧 Continue with Email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.loginLink}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: {
    ...Typography.title,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  oauthButton: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  oauthText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textMuted },
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
  emailButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.pill,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  emailButtonText: { color: 'white', fontSize: 15, fontWeight: '700' },
  loginLink: {
    textAlign: 'center',
    color: Colors.accent,
    marginTop: Spacing.lg,
    fontSize: 13,
  },
});
