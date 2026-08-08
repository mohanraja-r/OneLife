import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { errorMessage } from '../services/errors';
import { identifyMeal } from '../services/meals';

export default function LogMealManualScreen() {
  const [text, setText] = useState('');
  const [identifying, setIdentifying] = useState(false);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Describe your meal</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2 idlis with sambar and coconut chutney"
          placeholderTextColor={Colors.textMuted}
          multiline
          value={text}
          onChangeText={setText}
          autoFocus
        />

        {identifying ? (
          <View style={styles.identifyingRow}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.identifyingText}>Identifying...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.continueButton, !text.trim() && styles.continueButtonDisabled]}
            onPress={() => void handleContinue()}
            disabled={!text.trim()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  content: { padding: Spacing.md, paddingTop: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  continueButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  identifyingRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  identifyingText: { color: Colors.textSecondary, fontSize: 14 },
});
