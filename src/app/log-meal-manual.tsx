import { router } from 'expo-router';
import { type JSX, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '../components/AppHeader';
import PrimaryButton from '../components/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { errorMessage } from '../services/errors';
import { identifyMeal } from '../services/meals';

export default function LogMealManualScreen(): JSX.Element {
  const [text, setText] = useState('');
  const [identifying, setIdentifying] = useState(false);

  /** Sends the typed description to the AI and routes to the confirm screen. */
  const handleContinue = async () => {
    if (!text.trim()) return;
    setIdentifying(true);
    try {
      const identified = await identifyMeal({ manualText: text });
      if (identified.error) {
        Alert.alert('Could not identify meal', identified.error);
        setIdentifying(false);
        return;
      }

      router.replace({
        pathname: '/confirm-meal',
        params: {
          items: JSON.stringify(identified.items),
          suggestion: identified.suggestion,
          source: 'manual',
        },
      });
    } catch (err) {
      Alert.alert('Error identifying meal', errorMessage(err, 'Something went wrong'));
      setIdentifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Log a Meal" />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>Describe your meal</Text>
          <Text style={styles.subtitle}>
            List what was on the plate and roughly how much — we&apos;ll estimate the rest.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 2 idlis with sambar and coconut chutney"
            placeholderTextColor={Colors.textMuted}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />

          <View style={styles.spacer} />

          {identifying ? (
            <View style={styles.identifyingRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.identifyingText}>Identifying…</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Continue"
              disabled={!text.trim()}
              onPress={() => void handleContinue()}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: { ...Typography.screenTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  spacer: { flex: 1 },
  identifyingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  identifyingText: { ...Typography.secondary, color: Colors.textSecondary },
});
