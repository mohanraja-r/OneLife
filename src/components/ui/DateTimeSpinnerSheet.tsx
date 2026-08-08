import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import {
  Accent,
  Accents,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';

import BottomSheet, { sheetStyles } from './BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: Date;
  mode: 'date' | 'time';
  minimumDate?: Date;
  /** Tints the confirm button. Defaults to brand violet. */
  accent?: Accent;
  onChange: (value: Date) => void;
  /** Runs before closing — for sheets that commit a draft on confirm. */
  onDone?: () => void;
  doneLabel?: string;
}

/**
 * iOS has no imperative date/time dialog, so the wheel is presented in a sheet
 * styled like the rest of the app. Android callers should use
 * `DateTimePickerAndroid.open` and never render this.
 */
export default function DateTimeSpinnerSheet({
  visible,
  onClose,
  title,
  value,
  mode,
  minimumDate,
  accent = Accents.violet,
  onChange,
  onDone,
  doneLabel = 'Done',
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      bottomGap={Spacing.lg}
      grabberGap={Spacing.lg}>
      <Text style={sheetStyles.pickerTitle}>{title}</Text>

      <DateTimePicker
        value={value}
        mode={mode}
        display="spinner"
        themeVariant="light"
        minimumDate={minimumDate}
        onChange={(_, picked) => {
          if (picked) onChange(picked);
        }}
      />

      <TouchableOpacity
        onPress={() => {
          onDone?.();
          onClose();
        }}
        style={[styles.done, { backgroundColor: accent.tint }]}
        accessibilityRole="button">
        <Text style={[styles.doneText, { color: accent.dark }]}>
          {doneLabel}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  done: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  doneText: { ...Typography.button, fontSize: 16 },
});
