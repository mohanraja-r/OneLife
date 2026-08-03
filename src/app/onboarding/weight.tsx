import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState, WeightUnit } from './_state';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function WeightScreen() {
  const [unit, setUnit] = useState<WeightUnit>(onboardingState.weightUnit ?? 'kg');
  const [weight, setWeight] = useState(onboardingState.weightValue ? String(onboardingState.weightValue) : '');

  const handleContinue = () => {
    onboardingState.weightUnit = unit;
    onboardingState.weightValue =
      unit === 'kg' ? Number(weight) : Math.round(Number(weight) * 0.453592); // store as kg internally
    router.push('/onboarding/workout-frequency');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={4} />
      <Text style={styles.title}>What's your current weight?</Text>

      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitOption, unit === 'kg' && styles.unitOptionActive]}
          onPress={() => setUnit('kg')}
        >
          <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>KG</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitOption, unit === 'lb' && styles.unitOptionActive]}
          onPress={() => setUnit('lb')}
        >
          <Text style={[styles.unitText, unit === 'lb' && styles.unitTextActive]}>LB</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={unit === 'kg' ? 'e.g. 68' : 'e.g. 150'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!weight} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  unitToggle: { flexDirection: 'row', backgroundColor: '#F2F0F5', borderRadius: Radius.pill, padding: 4, marginBottom: Spacing.lg },
  unitOption: { flex: 1, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill, alignItems: 'center' },
  unitOptionActive: { backgroundColor: 'white' },
  unitText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  unitTextActive: { color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
