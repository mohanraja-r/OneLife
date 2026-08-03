import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState, HeightUnit, WeightUnit } from './state';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function HeightWeightScreen() {
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(onboardingState.heightUnit ?? 'cm');
  const [cm, setCm] = useState(onboardingState.heightUnit === 'cm' ? String(onboardingState.heightValue ?? '') : '');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(onboardingState.weightUnit ?? 'kg');
  const [weight, setWeight] = useState(onboardingState.weightValue ? String(onboardingState.weightValue) : '');

  const canContinue = (heightUnit === 'cm' ? !!cm : !!feet) && !!weight;

  const handleContinue = () => {
    onboardingState.heightUnit = heightUnit;
    if (heightUnit === 'cm') {
      onboardingState.heightValue = Number(cm);
    } else {
      const totalInches = Number(feet) * 12 + Number(inches || 0);
      onboardingState.heightValue = Math.round(totalInches * 2.54);
    }

    onboardingState.weightUnit = weightUnit;
    onboardingState.weightValue =
      weightUnit === 'kg' ? Number(weight) : Math.round(Number(weight) * 0.453592);

    router.push('/onboarding/workout-frequency');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgress step={3} />

      <Text style={styles.title}>Height &amp; weight</Text>
      <Text style={styles.subtitle}>Used to calculate your daily calorie and macro targets.</Text>

      <Text style={styles.label}>Height</Text>
      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitOption, heightUnit === 'cm' && styles.unitOptionActive]}
          onPress={() => setHeightUnit('cm')}
        >
          <Text style={[styles.unitText, heightUnit === 'cm' && styles.unitTextActive]}>Centimeters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitOption, heightUnit === 'ft_in' && styles.unitOptionActive]}
          onPress={() => setHeightUnit('ft_in')}
        >
          <Text style={[styles.unitText, heightUnit === 'ft_in' && styles.unitTextActive]}>Feet &amp; Inches</Text>
        </TouchableOpacity>
      </View>

      {heightUnit === 'cm' ? (
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

      <Text style={[styles.label, { marginTop: Spacing.lg }]}>Weight</Text>
      <View style={styles.unitToggle}>
        <TouchableOpacity
          style={[styles.unitOption, weightUnit === 'kg' && styles.unitOptionActive]}
          onPress={() => setWeightUnit('kg')}
        >
          <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextActive]}>KG</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitOption, weightUnit === 'lb' && styles.unitOptionActive]}
          onPress={() => setWeightUnit('lb')}
        >
          <Text style={[styles.unitText, weightUnit === 'lb' && styles.unitTextActive]}>LB</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder={weightUnit === 'kg' ? 'e.g. 68' : 'e.g. 150'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      <View style={{ flex: 1 }} />
      <ContinueButton onPress={handleContinue} disabled={!canContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  unitToggle: { flexDirection: 'row', backgroundColor: '#F2F0F5', borderRadius: Radius.pill, padding: 4, marginBottom: Spacing.sm },
  unitOption: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center' },
  unitOptionActive: { backgroundColor: 'white' },
  unitText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  unitTextActive: { color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  rowInputs: { flexDirection: 'row', gap: Spacing.md },
  rowInput: { flex: 1 },
});
