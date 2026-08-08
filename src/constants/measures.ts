import type { HeightUnit, WeightUnit } from '../services/profile';

/**
 * Body measurements: the ruler scales, the unit conversions and the formatting
 * that go with them.
 *
 * `profiles` stores one canonical metric value per measurement (`height_cm`,
 * `weight_kg`) plus the unit the user prefers to read it in, so every control
 * that edits a measurement has to convert in both directions. Doing that in one
 * place keeps onboarding and the Personal Information screen agreeing on what
 * "5'7"" rounds to.
 */

/** Centimetres in one inch. */
export const CM_PER_INCH = 2.54;

/** Kilograms in one pound. */
export const KG_PER_LB = 0.453592;

/** Formats a total-inches height as feet and inches, e.g. 67 → 5'7". */
export function formatFeetInches(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  return `${feet}'${Math.round(totalInches - feet * 12)}"`;
}

/** Rounds a value to the nearest half unit, for the 0.5 kg scale. */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Clamps a value into a scale's range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** One unit's ruler geometry, plus how its numbers are rendered. */
export interface MeasureScale {
  /** Smallest selectable value, in this unit's own domain. */
  min: number;
  max: number;
  step: number;
  /** Ticks between two labelled major ticks. */
  majorEvery: number;
  /** Renders the highlighted readout, e.g. 67 → 5'7". */
  format: (value: number) => string;
  /** Renders a major tick's label, which is often terser than the readout. */
  labelFormat: (value: number) => string;
  /** Suffix shown after the readout — empty when `format` already carries it. */
  unit: string;
}

/**
 * Height in `ft_in` mode is driven in total inches so the ruler still walks in
 * even steps; the value is converted back to centimetres on save.
 */
export const heightScales: Record<HeightUnit, MeasureScale> = {
  cm: {
    min: 120,
    max: 220,
    step: 1,
    majorEvery: 10,
    format: (v) => String(v),
    labelFormat: (v) => String(v),
    unit: 'cm',
  },
  ft_in: {
    min: 48,
    max: 96,
    step: 1,
    majorEvery: 6,
    format: formatFeetInches,
    labelFormat: formatFeetInches,
    unit: '',
  },
};

export const weightScales: Record<WeightUnit, MeasureScale> = {
  kg: {
    min: 30,
    max: 200,
    step: 0.5,
    majorEvery: 10,
    format: (v) => v.toFixed(1),
    labelFormat: (v) => String(v),
    unit: 'kg',
  },
  lb: {
    min: 66,
    max: 440,
    step: 1,
    majorEvery: 10,
    format: (v) => String(v),
    labelFormat: (v) => String(v),
    unit: 'lb',
  },
};

/** Everything a ruler control needs to edit one measurement in any unit. */
export interface Measure<U extends string> {
  /** Human name, used for the sheet title and accessibility labels. */
  name: string;
  /** Selectable units, in the order the switch shows them. */
  units: readonly U[];
  unitLabels: Record<U, string>;
  scales: Record<U, MeasureScale>;
  /** Converts the stored metric value into a unit's own domain, clamped. */
  toDisplay: (metric: number, unit: U) => number;
  /** Converts a reading in a unit's domain back to the stored metric value. */
  toMetric: (display: number, unit: U) => number;
  /** Starting point when the profile has no value recorded yet. */
  fallbackMetric: number;
}

export const HEIGHT_MEASURE: Measure<HeightUnit> = {
  name: 'Height',
  units: ['cm', 'ft_in'],
  unitLabels: { cm: 'cm', ft_in: 'ft in' },
  scales: heightScales,
  toDisplay: (cm, unit) => {
    const scale = heightScales[unit];
    const raw = unit === 'cm' ? Math.round(cm) : Math.round(cm / CM_PER_INCH);
    return clamp(raw, scale.min, scale.max);
  },
  toMetric: (display, unit) =>
    unit === 'cm' ? display : Math.round(display * CM_PER_INCH),
  fallbackMetric: 170,
};

export const WEIGHT_MEASURE: Measure<WeightUnit> = {
  name: 'Weight',
  units: ['kg', 'lb'],
  unitLabels: { kg: 'kg', lb: 'lb' },
  scales: weightScales,
  toDisplay: (kg, unit) => {
    const scale = weightScales[unit];
    const raw = unit === 'kg' ? roundToHalf(kg) : Math.round(kg / KG_PER_LB);
    return clamp(raw, scale.min, scale.max);
  },
  toMetric: (display, unit) =>
    unit === 'kg' ? display : Math.round(display * KG_PER_LB),
  fallbackMetric: 68,
};

/** Renders a stored measurement the way the user prefers to read it. */
export function formatMeasure<U extends string>(
  measure: Measure<U>,
  metric: number | null,
  unit: U
): string {
  if (metric === null) return 'Not set';
  const scale = measure.scales[unit];
  const display = measure.toDisplay(metric, unit);
  return scale.unit
    ? `${scale.format(display)} ${scale.unit}`
    : scale.format(display);
}
