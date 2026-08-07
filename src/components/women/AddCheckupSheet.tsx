import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (checkup: Omit<Checkup, 'id'>) => void;
}

/** Bottom sheet for scheduling an antenatal appointment. */
export default function AddCheckupSheet({ visible, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.overlay}
          onPress={onClose}
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
                { paddingBottom: insets.bottom + Spacing.xl },
              ]}>
              <View style={styles.grabber} />
              <Text style={styles.title}>Add a checkup</Text>
              <Text style={styles.subtitle}>
                Scans, blood tests and routine appointments.
              </Text>

              <Text style={styles.label}>What is it?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Anomaly scan"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
                accessibilityLabel="Appointment name"
              />

              <Text style={styles.label}>When?</Text>
              <TouchableOpacity
                onPress={openPicker}
                activeOpacity={0.7}
                style={styles.dateField}
                accessibilityRole="button"
                accessibilityLabel={`Date, ${formatLongDate(toDateString(date))}, change`}>
                <CalendarDays
                  size={18}
                  color={Accents.pink.main}
                  strokeWidth={2}
                />
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
                  <Text style={styles.label}>Time</Text>
                  <TextInput
                    value={time}
                    onChangeText={setTime}
                    placeholder="11:00 AM"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    accessibilityLabel="Appointment time"
                  />
                </View>
                <View style={styles.splitColumn}>
                  <Text style={styles.label}>Where / who</Text>
                  <TextInput
                    value={provider}
                    onChangeText={setProvider}
                    placeholder="Dr Verma"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    accessibilityLabel="Clinician or hospital"
                  />
                </View>
              </View>

              <AnimatedPressable
                onPress={save}
                style={[
                  styles.save,
                  !title.trim() && styles.saveDisabled,
                  accentShadow(Accents.pink.main),
                ]}>
                <Text style={styles.saveLabel}>Save checkup</Text>
              </AnimatedPressable>

              <TouchableOpacity
                onPress={onClose}
                style={styles.cancel}
                accessibilityRole="button"
                activeOpacity={0.6}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </MotiView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
    marginBottom: Spacing.xl,
  },
  title: { ...Typography.sectionTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
  },
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
  save: {
    backgroundColor: Accents.pink.main,
    borderRadius: Radius.xl,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  saveDisabled: { opacity: 0.45 },
  saveLabel: { ...Typography.button, color: Colors.textInverse },
  cancel: { alignItems: 'center', paddingVertical: Spacing.lg },
  cancelText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
