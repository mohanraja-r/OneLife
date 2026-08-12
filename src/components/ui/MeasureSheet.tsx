import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Measure } from '../../constants/measures';
import {
  Accent,
  Accents,
  Colors,
  Spacing,
  Typography,
} from '../../constants/theme';
import RulerPicker from '../RulerPicker';

import BottomSheet, { sheetStyles } from './BottomSheet';
import ChipRow from './ChipRow';

/** Keeps the left-aligned ruler centred instead of stranded in a wide sheet. */
const RULER_WIDTH = 140;

interface Props<U extends string> {
  visible: boolean;
  onClose: () => void;
  /** Which measurement this sheet edits — see `constants/measures`. */
  measure: Measure<U>;
  /** Stored metric value (centimetres or kilograms), or null when unset. */
  value: number | null;
  unit: U;
  /** Tints the readout and the confirm button. Defaults to brand violet. */
  accent?: Accent;
  /** Receives the metric value and the unit the user settled on. */
  onSave: (metric: number, unit: U) => void;
}

/**
 * Edits one body measurement on the ruler, with a unit switch that carries the
 * current reading across — the onboarding height/weight control, in a sheet.
 */
export default function MeasureSheet<U extends string>({
  visible,
  onClose,
  measure,
  value,
  unit,
  accent = Accents.violet,
  onSave,
}: Props<U>) {
  const [draftUnit, setDraftUnit] = useState<U>(unit);
  // Held in the active unit's own domain (centimetres, total inches, kg, lb),
  // because that is what the ruler walks in.
  const [reading, setReading] = useState(() =>
    measure.toDisplay(value ?? measure.fallbackMetric, unit)
  );

  // Re-seed the draft every time the sheet opens, so a dismissed edit does not
  // survive into the next one.
  useEffect(() => {
    if (!visible) return;
    setDraftUnit(unit);
    setReading(measure.toDisplay(value ?? measure.fallbackMetric, unit));
  }, [visible, unit, value, measure]);

  const scale = measure.scales[draftUnit];

  /** Switches units, carrying the current measurement across. */
  const handleUnitChange = (next: U) => {
    if (next === draftUnit) return;
    setReading(measure.toDisplay(measure.toMetric(reading, draftUnit), next));
    setDraftUnit(next);
  };

  const handleSave = () => {
    onSave(measure.toMetric(reading, draftUnit), draftUnit);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={sheetStyles.pickerTitle}>{measure.name}</Text>

      <View style={styles.readout}>
        <Text style={[styles.readoutValue, { color: accent.main }]}>
          {scale.format(reading)}
        </Text>
        {!!scale.unit && <Text style={styles.readoutUnit}>{scale.unit}</Text>}
      </View>

      <View style={styles.rulerFrame}>
        <RulerPicker
          key={draftUnit}
          min={scale.min}
          max={scale.max}
          step={scale.step}
          majorEvery={scale.majorEvery}
          value={reading}
          accent={accent}
          onChange={setReading}
          formatLabel={scale.labelFormat}
          formatValue={scale.format}
          accessibilityLabel={measure.name}
        />
      </View>

      <ChipRow
        options={measure.units.map((option) => ({
          label: measure.unitLabels[option],
          value: option,
        }))}
        value={draftUnit}
        onChange={handleUnitChange}
        style={styles.units}
      />

      <TouchableOpacity
        style={[sheetStyles.save, { backgroundColor: accent.main }]}
        onPress={handleSave}
        accessibilityRole="button">
        <Text style={sheetStyles.saveLabel}>Save</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  readoutValue: { ...Typography.displayNumber },
  readoutUnit: { ...Typography.unit, color: Colors.textSecondary },
  rulerFrame: {
    width: RULER_WIDTH,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  units: { justifyContent: 'center', marginTop: Spacing.lg },
});
