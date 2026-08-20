import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { type JSX, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Accents,
  Colors,
  Opacity,
  Radius,
  Spacing,
  Typography,
  accentShadow,
} from '../../constants/theme';
import {
  addDays,
  formatLongDate,
  startOfToday,
  toDateString,
} from '../../services/dates';
import type { Checkup } from '../../services/women';
import AnimatedPressable from '../AnimatedPressable';
import { BottomSheet, sheetStyles } from '../ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (checkup: Omit<Checkup, 'id'>) => void;
}

/** Bottom sheet for scheduling an antenatal appointment. */
export default function AddCheckupSheet({ visible, onClose, onSave }: Props): JSX.Element {
  const [title, setTitle] = useState('');
  // A week out is the common case for booking the next appointment.
  const [date, setDate] = useState(() => addDays(startOfToday(), 7));
  const [time, setTime] = useState('');
  const [provider, setProvider] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  /** Opens the platform's date picker for the appointment day. */
  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: startOfToday(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) setDate(picked);
        },
      });
      return;
    }
    setPickerOpen((open) => !open);
  };

  /** Saves the appointment and resets the form for the next one. */
  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date: toDateString(date),
      time: time.trim() || undefined,
      provider: provider.trim() || undefined,
    });
    setTitle('');
    setTime('');
    setProvider('');
    setPickerOpen(false);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={sheetStyles.title}>Add a checkup</Text>
      <Text style={sheetStyles.subtitle}>
        Scans, blood tests and routine appointments.
      </Text>

      <Text style={sheetStyles.label}>What is it?</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Anomaly scan"
        placeholderTextColor={Colors.textMuted}
        style={sheetStyles.input}
        accessibilityLabel="Appointment name"
      />

      <Text style={sheetStyles.label}>When?</Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.7}
        style={styles.dateField}
        accessibilityRole="button"
        accessibilityLabel={`Date, ${formatLongDate(toDateString(date))}, change`}>
        <CalendarDays size={18} color={Accents.pink.main} strokeWidth={2} />
        <Text style={styles.dateValue}>
          {formatLongDate(toDateString(date))}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && pickerOpen && (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          themeVariant="light"
          minimumDate={startOfToday()}
          onChange={(_, picked) => {
            if (picked) setDate(picked);
          }}
        />
      )}

      <View style={styles.split}>
        <View style={styles.splitColumn}>
          <Text style={sheetStyles.label}>Time</Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="11:00 AM"
            placeholderTextColor={Colors.textMuted}
            style={sheetStyles.input}
            accessibilityLabel="Appointment time"
          />
        </View>
        <View style={styles.splitColumn}>
          <Text style={sheetStyles.label}>Where / who</Text>
          <TextInput
            value={provider}
            onChangeText={setProvider}
            placeholder="Dr Verma"
            placeholderTextColor={Colors.textMuted}
            style={sheetStyles.input}
            accessibilityLabel="Clinician or hospital"
          />
        </View>
      </View>

      <AnimatedPressable
        onPress={save}
        style={[
          sheetStyles.save,
          styles.save,
          !title.trim() && styles.saveDisabled,
          accentShadow(Accents.pink.main),
        ]}>
        <Text style={sheetStyles.saveLabel}>Save checkup</Text>
      </AnimatedPressable>

      <TouchableOpacity
        onPress={onClose}
        style={sheetStyles.cancel}
        accessibilityRole="button"
        activeOpacity={0.6}>
        <Text style={sheetStyles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dateValue: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  split: { flexDirection: 'row', gap: Spacing.md },
  splitColumn: { flex: 1 },
  save: { backgroundColor: Accents.pink.main },
  saveDisabled: { opacity: Opacity.disabled },
});
