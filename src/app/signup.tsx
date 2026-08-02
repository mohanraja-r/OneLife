import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OneLife</Text>
        <Text style={styles.subtitle}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </Text>

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

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Log in'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          <Text style={styles.switchText}>
            {mode === 'signup'
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { ...Typography.title, fontSize: 32, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
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
  button: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  switchText: {
    textAlign: 'center',
    color: Colors.accent,
    marginTop: Spacing.lg,
    fontSize: 13,
  },
});
