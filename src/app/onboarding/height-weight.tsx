import { router } from 'expo-router';
import { Ruler, Weight } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../../components/PrimaryButton';
import RulerPicker from '../../components/RulerPicker';
import { HEIGHT_MEASURE, WEIGHT_MEASURE } from '../../constants/measures';
import { Accent, Accents, Motion, Spacing } from '../../constants/theme';

import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';
import { HeightUnit, WeightUnit, onboardingState } from './state';

const screenAccent = Accents.violet;
const heightAccent = Accents.green;
const weightAccent = Accents.amber;

/** Segmented unit switch, tinted with the section's accent. */
function UnitToggle<T extends string>({
  value,
  options,
  labels,
  accent,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  accent: Accent;
  onChange: (next: T) => void;
}) {
  return (
    <View style={s.unitToggleInline}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[
              s.unitOptionInline,
              active && { backgroundColor: accent.tint },
            ]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text
              style={[
                s.unitText,
                active && s.unitTextActive,
                active && { color: accent.dark },
              ]}>
              {labels[option]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HeightWeightScreen() {
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(
    onboardingState.heightUnit ?? 'cm'
  );
  // Held in the active unit's own domain: centimetres, or total inches.
  const [height, setHeight] = useState(() =>
    HEIGHT_MEASURE.toDisplay(
      onboardingState.heightValue ?? HEIGHT_MEASURE.fallbackMetric,
      onboardingState.heightUnit ?? 'cm'
    )
  );

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    onboardingState.weightUnit ?? 'kg'
  );
  const [weight, setWeight] = useState(() =>
    WEIGHT_MEASURE.toDisplay(
      onboardingState.weightValue ?? WEIGHT_MEASURE.fallbackMetric,
      onboardingState.weightUnit ?? 'kg'
    )
  );

  const heightScale = HEIGHT_MEASURE.scales[heightUnit];
  const weightScale = WEIGHT_MEASURE.scales[weightUnit];

  /** Switches height units, carrying the current measurement across. */
  const handleHeightUnitChange = (next: HeightUnit) => {
    if (next === heightUnit) return;
    setHeight(
      HEIGHT_MEASURE.toDisplay(
        HEIGHT_MEASURE.toMetric(height, heightUnit),
        next
      )
    );
    setHeightUnit(next);
  };

  /** Switches weight units, carrying the current measurement across. */
  const handleWeightUnitChange = (next: WeightUnit) => {
    if (next === weightUnit) return;
    setWeight(
      WEIGHT_MEASURE.toDisplay(
        WEIGHT_MEASURE.toMetric(weight, weightUnit),
        next
      )
    );
    setWeightUnit(next);
  };

  const handleContinue = () => {
    onboardingState.heightUnit = heightUnit;
    onboardingState.heightValue = HEIGHT_MEASURE.toMetric(height, heightUnit);

    onboardingState.weightUnit = weightUnit;
    onboardingState.weightValue = WEIGHT_MEASURE.toMetric(weight, weightUnit);

    router.push('/onboarding/workout-frequency');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={3} accent={screenAccent} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={[
            s.iconTile,
            styles.iconTile,
            { backgroundColor: screenAccent.tint },
          ]}>
          <Ruler size={32} color={screenAccent.main} strokeWidth={2} />
        </MotiView>

        <Text style={s.title}>Height &amp; weight</Text>
        <Text style={[s.subtitle, styles.subtitle]}>
          Used to calculate your daily calorie and macro targets.
        </Text>

        <View style={s.measureRow}>
          {/* Height */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: Motion.base,
              delay: Motion.enterDelay,
            }}
            style={s.measureCard}>
            <View style={s.measureHeader}>
              <View
                style={[s.measureIcon, { backgroundColor: heightAccent.tint }]}>
                <Ruler size={14} color={heightAccent.main} strokeWidth={2.2} />
              </View>
              <Text style={s.measureLabel}>Height</Text>
            </View>

            <View style={s.readoutCompact}>
              <Text style={s.readoutCompactValue}>
                {heightScale.format(height)}
              </Text>
              {!!heightScale.unit && (
                <Text style={s.readoutUnit}>{heightScale.unit}</Text>
              )}
            </View>

            <RulerPicker
              key={heightUnit}
              min={heightScale.min}
              max={heightScale.max}
              step={heightScale.step}
              majorEvery={heightScale.majorEvery}
              value={height}
              accent={heightAccent}
              onChange={setHeight}
              formatLabel={heightScale.labelFormat}
              formatValue={heightScale.format}
              accessibilityLabel="Height"
            />

            <UnitToggle
              value={heightUnit}
              options={['cm', 'ft_in'] as const}
              labels={{ cm: 'cm', ft_in: 'ft in' }}
              accent={heightAccent}
              onChange={handleHeightUnitChange}
            />
          </MotiView>

          {/* Weight */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: Motion.base,
              delay: Motion.enterDelay + Motion.stagger,
            }}
            style={s.measureCard}>
            <View style={s.measureHeader}>
              <View
                style={[s.measureIcon, { backgroundColor: weightAccent.tint }]}>
                <Weight size={14} color={weightAccent.main} strokeWidth={2.2} />
              </View>
              <Text style={s.measureLabel}>Weight</Text>
            </View>

            <View style={s.readoutCompact}>
              <Text style={s.readoutCompactValue}>
                {weightScale.format(weight)}
              </Text>
              <Text style={s.readoutUnit}>{weightScale.unit}</Text>
            </View>

            <RulerPicker
              key={weightUnit}
              min={weightScale.min}
              max={weightScale.max}
              step={weightScale.step}
              majorEvery={weightScale.majorEvery}
              value={weight}
              accent={weightAccent}
              onChange={setWeight}
              formatLabel={weightScale.labelFormat}
              formatValue={weightScale.format}
              accessibilityLabel="Weight"
            />

            <UnitToggle
              value={weightUnit}
              options={['kg', 'lb'] as const}
              labels={{ kg: 'kg', lb: 'lb' }}
              accent={weightAccent}
              onChange={handleWeightUnitChange}
            />
          </MotiView>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <PrimaryButton onPress={handleContinue} accent={screenAccent} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // This screen shows two cards rather than one options list, so the header
  // block sits tighter than the shared defaults.
  iconTile: { marginBottom: Spacing.lg },
  subtitle: { marginBottom: Spacing.xl },
});
