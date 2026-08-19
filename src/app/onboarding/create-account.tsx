import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
// lucide v1 dropped brand marks — Globe stands in for Google.
import { Apple, Globe, Mail, ShieldCheck } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../../components/PrimaryButton';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { errorMessage } from '../../services/errors';
import { supabase } from '../../services/supabase';

import LoginPrompt from './LoginPrompt';
import { onboardingStyles as s } from './onboardingStyles';
import { onboardingState, resetOnboardingState } from './state';

const accent = Accents.violet;

// Estimates daily calorie/macro targets from the collected onboarding data.
// Rough v1 formula — refine later once real usage data exists.
function estimateTargets(
  heightCm: number,
  weightKg: number,
  age: number,
  workoutFrequency: string,
  goal: string
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

/** Returns whole years elapsed since a YYYY-MM-DD date of birth. */
function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Outlined social sign-in row, matching the reference's secondary buttons. */
function SocialButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon size={20} color={Colors.textPrimary} strokeWidth={2} />
      <Text style={styles.socialLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CreateAccountScreen() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  // Someone who signed up earlier but never finished onboarding walks back
  // through these screens, and arrives here already authenticated. Asking them
  // to sign up again is a dead end — Supabase rejects a second sign-up on the
  // same address — so this screen becomes "save my plan" instead.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(data.session !== null);
    });
  }, []);

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
      goal ?? 'maintain'
    );

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      name: userEmail.split('@')[0] || 'there',
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

  /** Saves the collected plan against the session this user already has. */
  const saveForExistingUser = async () => {
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) throw new Error('Your session expired. Please log in again.');

      await saveEverything(user.id, user.email ?? '');
      resetOnboardingState();
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (signedIn) {
      await saveForExistingUser();
      return;
    }
    if (!showEmailForm) {
      setShowEmailForm(true);
      return;
    }
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
          'We sent a confirmation link. Please verify your email, then log in to finish setup.'
        );
        resetOnboardingState();
        router.replace({ pathname: '/signup', params: { mode: 'login' } });
        return;
      }

      await saveEverything(data.user.id, email);
      resetOnboardingState();
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Error', errorMessage(err, 'Something went wrong'));
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
      `${provider === 'google' ? 'Google' : 'Apple'} sign-in setup is a follow-up step.`
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: Motion.slow }}
            style={[s.iconTile, { backgroundColor: Accents.green.tint }]}>
            <ShieldCheck size={32} color={Accents.green.main} strokeWidth={2} />
          </MotiView>

          <Text style={s.title}>
            {signedIn ? 'Save your plan' : 'Create your account'}
          </Text>
          <Text style={s.subtitle}>
            {signedIn
              ? "You're already signed in — we'll save this to your account."
              : "Let's save your plan and start your journey to a healthier you."}
          </Text>

          <View style={s.options}>
            {!signedIn && showEmailForm && (
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: Motion.base }}
                style={styles.form}>
                <TextInput
                  style={s.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Email"
                />
                <TextInput
                  style={s.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  accessibilityLabel="Password"
                />
              </MotiView>
            )}

            <PrimaryButton
              label={
                saving
                  ? signedIn
                    ? 'Saving…'
                    : 'Creating account…'
                  : signedIn
                    ? 'Save my plan'
                    : showEmailForm
                      ? 'Create account'
                      : 'Sign up with Email'
              }
              accent={accent}
              icon={signedIn ? undefined : Mail}
              hideArrow
              disabled={saving}
              onPress={() => void handleEmailSignUp()}
            />

            {!signedIn && (
              <>
                <SocialButton
                  icon={Globe}
                  label="Continue with Google"
                  onPress={() => handleOAuth('google')}
                />
                <SocialButton
                  icon={Apple}
                  label="Continue with Apple"
                  onPress={() => handleOAuth('apple')}
                />
              </>
            )}
          </View>

          {!signedIn && <LoginPrompt accent={accent} style={styles.loginRow} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    ...Shadow.card,
  },
  socialLabel: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  loginRow: { paddingBottom: Spacing.xxl },
});
