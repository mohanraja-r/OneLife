import { router } from 'expo-router';
import { Ruler } from 'lucide-react-native';
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
import {
  Accents,
  Colors,
  Motion,
  Spacing,
  Typography,
} from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';
import { HeightUnit, onboardingState } from './_state';

const accent = Accents.green;

export default function HeightScreen() {
  const [unit, setUnit] = useState<HeightUnit>(
    onboardingState.heightUnit ?? 'cm'
  );
  const [cm, setCm] = useState(
    onboardingState.heightUnit === 'cm'
      ? String(onboardingState.heightValue ?? '')
      : ''
  );
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
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={3} accent={accent} />

      <View style={s.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[s.iconTile, { backgroundColor: accent.tint }]}>
          <Ruler size={32} color={accent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>What&apos;s your height?</Text>
        <Text style={s.subtitle}>
          We&apos;ll use this to calculate your health metrics.
        </Text>

        <View style={s.unitToggle}>
          {(['cm', 'ft_in'] as HeightUnit[]).map((u) => {
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
                  {u === 'cm' ? 'cm' : 'ft & in'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {unit === 'cm' ? (
          <View style={s.readout}>
            <TextInput
              style={[styles.readoutInput, { color: Colors.textPrimary }]}
              placeholder="170"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              value={cm}
              onChangeText={setCm}
              accessibilityLabel="Height in centimetres"
            />
            <Text style={s.readoutUnit}>cm</Text>
          </View>
        ) : (
          <View style={s.readout}>
            <TextInput
              style={styles.readoutInput}
              placeholder="5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={1}
              value={feet}
              onChangeText={setFeet}
              accessibilityLabel="Height in feet"
            />
            <Text style={s.readoutUnit}>ft</Text>
            <TextInput
              style={[styles.readoutInput, styles.readoutInputSecond]}
              placeholder="7"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
              value={inches}
              onChangeText={setInches}
              accessibilityLabel="Height in inches"
            />
            <Text style={s.readoutUnit}>in</Text>
          </View>
        )}

        <View style={[styles.underline, { backgroundColor: accent.main }]} />
      </View>

      <View style={s.footer}>
        <ContinueButton
          onPress={handleContinue}
          disabled={!canContinue}
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
    minWidth: 90,
    padding: 0,
  },
  readoutInputSecond: {
    marginLeft: Spacing.sm,
  },
  // Accent rule under the readout, echoing the reference's measuring scale.
  underline: {
    width: 72,
    height: 4,
    borderRadius: 2,
  },
});
