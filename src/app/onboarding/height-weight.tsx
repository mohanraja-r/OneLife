import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import OnboardingProgress from './OnboardingProgress';
import ContinueButton from './ContinueButton';
import { onboardingState, HeightUnit, WeightUnit } from './state';
import { onboardingStyles as s } from './onboardingStyles';
import { Colors, Spacing } from '../../constants/theme';

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
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={3} />

      <Text style={s.title}>Height &amp; weight</Text>
      <Text style={s.question}>Used to calculate your daily calorie and macro targets.</Text>

      <Text style={s.label}>Height</Text>
      <View style={s.unitToggle}>
        <TouchableOpacity
          style={[s.unitOption, heightUnit === 'cm' && s.unitOptionActive]}
          onPress={() => setHeightUnit('cm')}
        >
          <Text style={[s.unitText, heightUnit === 'cm' && s.unitTextActive]}>Centimeters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.unitOption, heightUnit === 'ft_in' && s.unitOptionActive]}
          onPress={() => setHeightUnit('ft_in')}
        >
          <Text style={[s.unitText, heightUnit === 'ft_in' && s.unitTextActive]}>Feet &amp; Inches</Text>
        </TouchableOpacity>
      </View>

      {heightUnit === 'cm' ? (
        <TextInput
          style={[s.input, { textAlign: 'center', marginBottom: Spacing.lg }]}
          placeholder="e.g. 170"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          value={cm}
          onChangeText={setCm}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg }}>
          <TextInput
            style={[s.input, { flex: 1, textAlign: 'center' }]}
            placeholder="Feet"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={feet}
            onChangeText={setFeet}
          />
          <TextInput
            style={[s.input, { flex: 1, textAlign: 'center' }]}
            placeholder="Inches"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={inches}
            onChangeText={setInches}
          />
        </View>
      )}

      <Text style={s.label}>Weight</Text>
      <View style={s.unitToggle}>
        <TouchableOpacity
          style={[s.unitOption, weightUnit === 'kg' && s.unitOptionActive]}
          onPress={() => setWeightUnit('kg')}
        >
          <Text style={[s.unitText, weightUnit === 'kg' && s.unitTextActive]}>KG</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.unitOption, weightUnit === 'lb' && s.unitOptionActive]}
          onPress={() => setWeightUnit('lb')}
        >
          <Text style={[s.unitText, weightUnit === 'lb' && s.unitTextActive]}>LB</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[s.input, { textAlign: 'center' }]}
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
