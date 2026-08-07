import { router } from 'expo-router';
import { Weight } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accents, Colors, Motion, Typography } from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';
import { WeightUnit, onboardingState } from './_state';

const accent = Accents.amber;

export default function WeightScreen() {
  const [unit, setUnit] = useState<WeightUnit>(
    onboardingState.weightUnit ?? 'kg'
  );
  const [weight, setWeight] = useState(
    onboardingState.weightValue ? String(onboardingState.weightValue) : ''
  );

  const handleContinue = () => {
    onboardingState.weightUnit = unit;
    onboardingState.weightValue =
      unit === 'kg' ? Number(weight) : Math.round(Number(weight) * 0.453592); // store as kg internally
    router.push('/onboarding/workout-frequency');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={4} accent={accent} />

      <View style={s.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[s.iconTile, { backgroundColor: accent.tint }]}>
          <Weight size={32} color={accent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>What&apos;s your weight?</Text>
        <Text style={s.subtitle}>
          This helps us track your progress accurately.
        </Text>

        <View style={s.unitToggle}>
          {(['kg', 'lb'] as WeightUnit[]).map((u) => {
            const active = unit === u;
            return (
              <TouchableOpacity
                key={u}
                style={[
                  s.unitOption,
                  active && { backgroundColor: accent.tint },
                ]}
                onPress={() => setUnit(u)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Text
                  style={[
                    s.unitText,
                    active && s.unitTextActive,
                    active && { color: accent.dark },
                  ]}>
                  {u}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.readout}>
          <TextInput
            style={styles.readoutInput}
            placeholder={unit === 'kg' ? '68' : '150'}
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            maxLength={5}
            value={weight}
            onChangeText={setWeight}
            accessibilityLabel={`Weight in ${unit}`}
          />
          <Text style={s.readoutUnit}>{unit}</Text>
        </View>

        <View style={[styles.underline, { backgroundColor: accent.main }]} />
      </View>

      <View style={s.footer}>
        <ContinueButton
          onPress={handleContinue}
          disabled={!weight}
          accent={accent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  readoutInput: {
    ...Typography.displayNumber,
    color: Colors.textPrimary,
    textAlign: 'center',
    minWidth: 110,
    padding: 0,
  },
  // Accent rule under the readout, echoing the reference's measuring scale.
  underline: {
    width: 72,
    height: 4,
    borderRadius: 2,
  },
});
