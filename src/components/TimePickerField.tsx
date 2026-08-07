import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { ChevronDown, Clock, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { dateToTime, formatTimeLabel, timeToDate } from '../services/medicine';

interface Props {
  /** The slot being edited, in 24-hour `HH:MM` form. */
  value: string;
  onChange: (time: string) => void;
  /** Omitted for the last remaining slot, which cannot be removed. */
  onRemove?: () => void;
}

/**
 * A reminder slot rendered as a tappable time chip.
 *
 * Android gets the system clock dialog through the imperative API; iOS has no
 * equivalent, so the wheel is presented in a sheet styled like the rest of the
 * app. Either way the value that comes back is always a valid `HH:MM`.
 */
export default function TimePickerField({ value, onChange, onRemove }: Props) {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  /** Opens the platform's time picker for this slot. */
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeToDate(value),
        mode: 'time',
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(dateToTime(date));
        },
      });
      return;
    }
    setSheetOpen(true);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.field}
        onPress={open}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Reminder at ${formatTimeLabel(value)}, change time`}>
        <View style={styles.tile}>
          <Clock size={16} color={Colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.value}>{formatTimeLabel(value)}</Text>
        <ChevronDown size={18} color={Colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>

      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={10}
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Remove reminder at ${formatTimeLabel(value)}`}>
          <X size={18} color={Colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={sheetOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSheetOpen(false)}>
          <Pressable
            style={styles.overlay}
            onPress={() => setSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss">
            {/* Swallows taps on the sheet so they do not close it. */}
            <Pressable onPress={() => {}}>
              <MotiView
                from={{ opacity: 0, translateY: 32 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: Motion.base }}
                style={[
                  styles.sheet,
                  { paddingBottom: insets.bottom + Spacing.lg },
                ]}>
                <View style={styles.grabber} />
                <Text style={styles.sheetTitle}>Reminder time</Text>

                <DateTimePicker
                  value={timeToDate(value)}
                  mode="time"
                  display="spinner"
                  themeVariant="light"
                  onChange={(_, date) => {
                    if (date) onChange(dateToTime(date));
                  }}
                />

                <TouchableOpacity
                  onPress={() => setSheetOpen(false)}
                  style={styles.done}
                  accessibilityRole="button">
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </MotiView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    color: Colors.textPrimary,
  },
  remove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    ...Shadow.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: Radius.round,
    backgroundColor: Colors.borderStrong,
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  done: {
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  doneText: {
    ...Typography.button,
    fontSize: 16,
    color: Colors.primary,
  },
});
