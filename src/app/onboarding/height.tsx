import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState, HeightUnit } from './_state';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function HeightScreen() {
  const [unit, setUnit] = useState<HeightUnit>(onboardingState.heightUnit ?? 'cm');
  const [cm, setCm] = useState(onboardingState.heightUnit === 'cm' ? String(onboardingState.heightValue ?? '') : '');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  const canContinue = unit === 'cm' ? !!cm : !!feet;

  const handleContinue = () => {
    onboardingState.heightUnit = unit;
    if (unit === 'cm') {
      onboardingState.heightValue = Number(cm);
    } else {
      const totalInches = Number(feet) * 12 + Number(inches || 0);
      onboardingState.heightValue = Math.round(totalInches * 2.54); // store as cm internally
    }
    router.push('/onboarding/weight');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={3} />
      <Text style={styles.title}>How tall are you?</Text>

      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitOption, unit === 'cm' && styles.unitOptionActive]}
          onPress={() => setUnit('cm')}
        >
          <Text style={[styles.unitText, unit === 'cm' && styles.unitTextActive]}>Centimeters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitOption, unit === 'ft_in' && styles.unitOptionActive]}
          onPress={() => setUnit('ft_in')}
        >
          <Text style={[styles.unitText, unit === 'ft_in' && styles.unitTextActive]}>Feet &amp; Inches</Text>
        </TouchableOpacity>
      </View>

      {unit === 'cm' ? (
        <TextInput
          style={styles.input}
          placeholder="e.g. 170"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          value={cm}
          onChangeText={setCm}
        />
      ) : (
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="Feet"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={feet}
            onChangeText={setFeet}
          />
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="Inches"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={inches}
            onChangeText={setInches}
          />
        </View>
      )}

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!canContinue} />
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
  rowInputs: { flexDirection: 'row', gap: Spacing.md },
  rowInput: { flex: 1 },
});
