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
import RulerPicker from '../../components/RulerPicker';
import {
  Accent,
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import ContinueButton from './ContinueButton';
import OnboardingProgress from './OnboardingProgress';
import { onboardingStyles as s } from './onboardingStyles';
import { HeightUnit, WeightUnit, onboardingState } from './state';

const screenAccent = Accents.violet;
const heightAccent = Accents.green;
const weightAccent = Accents.amber;

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

/** Formats a total-inches height as feet and inches, e.g. 67 → 5'7". */
function formatFeetInches(totalInches: number) {
  const feet = Math.floor(totalInches / 12);
  return `${feet}'${Math.round(totalInches - feet * 12)}"`;
}

/** Rounds a value to the nearest half unit, for the 0.5 kg scale. */
function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

/**
 * Scale definitions per unit. Height in `ft_in` mode is driven in total inches
 * so the ruler still walks in even steps; everything is converted on continue.
 */
const heightScales = {
  cm: {
    min: 120,
    max: 220,
    step: 1,
    majorEvery: 10,
    format: (v: number) => String(v),
    unit: 'cm',
  },
  ft_in: {
    min: 48,
    max: 96,
    step: 1,
    majorEvery: 6,
    format: formatFeetInches,
    unit: '',
  },
} as const;

const weightScales = {
  kg: {
    min: 30,
    max: 200,
    step: 0.5,
    majorEvery: 10,
    format: (v: number) => v.toFixed(1),
    labelFormat: (v: number) => String(v),
    unit: 'kg',
  },
  lb: {
    min: 66,
    max: 440,
    step: 1,
    majorEvery: 10,
    format: (v: number) => String(v),
    labelFormat: (v: number) => String(v),
    unit: 'lb',
  },
} as const;

/** Clamps a value into a scale's range. */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
    <View style={styles.toggle}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.toggleOption,
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
  const [height, setHeight] = useState(() => {
    const cm = onboardingState.heightValue ?? 170;
    return (onboardingState.heightUnit ?? 'cm') === 'cm'
      ? cm
      : Math.round(cm / CM_PER_INCH);
  });

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    onboardingState.weightUnit ?? 'kg'
  );
  const [weight, setWeight] = useState(() => {
    const kg = onboardingState.weightValue ?? 68;
    return (onboardingState.weightUnit ?? 'kg') === 'kg'
      ? roundToHalf(kg)
      : Math.round(kg / KG_PER_LB);
  });

  const heightScale = heightScales[heightUnit];
  const weightScale = weightScales[weightUnit];

  /** Switches height units, carrying the current measurement across. */
  const handleHeightUnitChange = (next: HeightUnit) => {
    if (next === heightUnit) return;
    const converted =
      next === 'cm'
        ? Math.round(height * CM_PER_INCH)
        : Math.round(height / CM_PER_INCH);
    const scale = heightScales[next];
    setHeight(clamp(converted, scale.min, scale.max));
    setHeightUnit(next);
  };

  /** Switches weight units, carrying the current measurement across. */
  const handleWeightUnitChange = (next: WeightUnit) => {
    if (next === weightUnit) return;
    const converted =
      next === 'kg'
        ? roundToHalf(weight * KG_PER_LB)
        : Math.round(weight / KG_PER_LB);
    const scale = weightScales[next];
    setWeight(clamp(converted, scale.min, scale.max));
    setWeightUnit(next);
  };

  const handleContinue = () => {
    onboardingState.heightUnit = heightUnit;
    onboardingState.heightValue =
      heightUnit === 'cm' ? height : Math.round(height * CM_PER_INCH);

    onboardingState.weightUnit = weightUnit;
    onboardingState.weightValue =
      weightUnit === 'kg' ? weight : Math.round(weight * KG_PER_LB);

    router.push('/onboarding/workout-frequency');
  };

  return (
    <SafeAreaView style={s.container}>
      <OnboardingProgress step={3} accent={screenAccent} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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

        <View style={styles.row}>
          {/* Height */}
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: Motion.base,
              delay: Motion.enterDelay,
            }}
            style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: heightAccent.tint },
                ]}>
                <Ruler size={14} color={heightAccent.main} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardLabel}>Height</Text>
            </View>

            <View style={styles.readout}>
              <Text style={styles.readoutValue}>
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
              formatLabel={heightScale.format}
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
            style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: weightAccent.tint },
                ]}>
                <Weight size={14} color={weightAccent.main} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardLabel}>Weight</Text>
            </View>

            <View style={styles.readout}>
              <Text style={styles.readoutValue}>
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
        <ContinueButton onPress={handleContinue} accent={screenAccent} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  iconTile: { marginBottom: Spacing.lg },
  subtitle: { marginBottom: Spacing.xl },

  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  readoutValue: {
    ...Typography.largeNumber,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.textPrimary,
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.pill,
    padding: 4,
    marginTop: Spacing.md,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
});
