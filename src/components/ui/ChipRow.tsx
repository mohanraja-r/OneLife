import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import {
  Colors,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';

export interface ChipOption<T> {
  label: string;
  value: T;
}

interface Props<T> {
  options: readonly ChipOption<T>[];
  /** The selected value — compared by identity. */
  value: T;
  onChange: (value: T) => void;
  /** Let the chips run onto a second line. */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single-select row of pill chips — the filter and preset picker used by the
 * medicine list, the medicine form and the prescription scan review.
 */
export default function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  wrap = false,
  style,
}: Props<T>) {
  return (
    <View style={[styles.row, wrap && styles.wrap, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  wrap: { flexWrap: 'wrap' },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  chipText: { ...Typography.caption, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primaryDark, fontWeight: '700' },
});
