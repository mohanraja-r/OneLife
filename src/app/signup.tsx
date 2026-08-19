import { router, useLocalSearchParams } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
// lucide v1 dropped brand marks — Globe stands in for Google.
import {
  Apple,
  AtSign,
  Eye,
  EyeOff,
  Globe,
  Lock,
  LogIn,
  ShieldCheck,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
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

import PrimaryButton from '../components/PrimaryButton';
import {
  Accent,
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { supabase } from '../services/supabase';

type Mode = 'signup' | 'login';

const accent = Accents.violet;

/** Copy and icon treatment for each mode, so the screen reads as two pages. */
const COPY: Record<
  Mode,
  {
    icon: LucideIcon;
    iconAccent: Accent;
    title: string;
    subtitle: string;
    action: string;
    switchPrompt: string;
    switchLink: string;
  }
> = {
  signup: {
    icon: ShieldCheck,
    iconAccent: Accents.green,
    title: 'Create your account',
    subtitle: "Let's start your journey to a healthier you.",
    action: 'Sign up',
    switchPrompt: 'Already have an account? ',
    switchLink: 'Log in',
  },
  login: {
    icon: LogIn,
    iconAccent: Accents.violet,
    title: 'Welcome back',
    subtitle: 'Log in to pick up right where you left off.',
    action: 'Log in',
    switchPrompt: "Don't have an account? ",
    switchLink: 'Sign up',
  },
};

/** Outlined social sign-in row, matching the onboarding reference. */
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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Callers that already know the user has an account — logging out, the
  // "Already have an account?" link, the post-confirmation bounce — pass
  // ?mode=login so the screen opens on Welcome back rather than asking
  // somebody who is already registered to create a second account.
  const { mode: requestedMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(
    requestedMode === 'login' ? 'login' : 'signup'
  );

  const copy = COPY[mode];

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setLoading(true);

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // New sign-ups have no profiles row yet -> onboarding.
    // Existing logins with a profile already saved -> straight to Home.
    // (Root index.tsx handles this redirect logic based on session + profile
    // existence — see app/index.tsx.)
    router.replace('/');
  };

  // Google/Apple sign-in require additional native setup (expo-auth-session
  // + provider credentials) — wired as a TODO so the button exists and the
  // screen is complete, without blocking on OAuth configuration right now.
  const handleOAuth = (provider: 'google' | 'apple') => {
    Alert.alert(
      'Coming soon',
      `${provider === 'google' ? 'Google' : 'Apple'} sign-in setup is a follow-up step.`
    );
  };

  /** Flips between the sign-up and log-in presentations of this screen. */
  const toggleMode = () => {
    setMode((prev) => (prev === 'signup' ? 'login' : 'signup'));
    setShowPassword(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <MotiView
            key={`${mode}-icon`}
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: Motion.slow }}
            style={[
              styles.iconTile,
              { backgroundColor: copy.iconAccent.tint },
            ]}>
            <copy.icon size={32} color={copy.iconAccent.main} strokeWidth={2} />
          </MotiView>

          <MotiView
            key={`${mode}-copy`}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </MotiView>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <AtSign size={20} color={Colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.inputField}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email"
              />
            </View>

            <View style={styles.inputRow}>
              <Lock size={20} color={Colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.inputField}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }>
                {showPassword ? (
                  <EyeOff size={20} color={Colors.textMuted} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={Colors.textMuted} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>

            <PrimaryButton
              label={loading ? 'Please wait…' : copy.action}
              accent={accent}
              hideArrow
              disabled={loading}
              onPress={() => void handleSubmit()}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialGroup}>
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
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>{copy.switchPrompt}</Text>
            <TouchableOpacity onPress={toggleMode} hitSlop={8}>
              <Text style={styles.switchLink}>{copy.switchLink}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screen,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },

  form: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card,
  },
  inputField: {
    flex: 1,
    paddingVertical: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.textMuted },

  socialGroup: {
    alignSelf: 'stretch',
    gap: Spacing.md,
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

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  switchPrompt: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  switchLink: {
    ...Typography.caption,
    fontWeight: '700',
    color: accent.main,
  },
});
