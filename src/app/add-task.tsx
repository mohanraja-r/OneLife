import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { errorMessage } from '../services/errors';
import { addTask, updateTask, deleteTask, getTaskById, TaskCategory, RepeatOption } from '../services/planner';

const CATEGORIES: { key: TaskCategory; label: string; icon: string }[] = [
  { key: 'work', label: 'Work', icon: '💼' },
  { key: 'personal', label: 'Personal', icon: '🏠' },
  { key: 'fitness', label: 'Fitness', icon: '🏃' },
];

const REPEAT_OPTIONS: { key: RepeatOption; label: string }[] = [
  { key: 'never', label: 'Never' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

/** Formats a Date as a local YYYY-MM-DD key — toISOString() would shift the day
 *  for anyone not on UTC, saving evening tasks onto the wrong date. */
function toDateString(d: Date) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Reads a YYYY-MM-DD key back as local midnight on that day. */
function fromDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function toTimeString(d: Date) {
  return d.toTimeString().slice(0, 5);
}
function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: undefined, month: 'short', day: 'numeric' });
}
function formatTimeDisplay(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AddTaskScreen() {
  const params = useLocalSearchParams<{ taskId?: string; date?: string }>();
  const isEditing = !!params.taskId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [date, setDate] = useState(params.date ? fromDateString(params.date) : new Date());
  const [time, setTime] = useState<Date | null>(null);
  const [repeat, setRepeat] = useState<RepeatOption>('never');
  const [reminder, setReminder] = useState(true);
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.taskId) {
      getTaskById(params.taskId).then((task) => {
        if (!task) return;
        setTitle(task.title);
        setCategory(task.category);
        setDate(fromDateString(task.date));
        if (task.time) {
          const [h, m] = task.time.split(':').map(Number);
          const t = new Date();
          t.setHours(h, m, 0, 0);
          setTime(t);
        }
        setRepeat(task.repeat);
        setReminder(task.reminder);
        setNotes(task.notes ?? '');
      });
    }
  }, [params.taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give this task a name before saving.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        category,
        date: toDateString(date),
        time: time ? toTimeString(time) : undefined,
        repeat,
        reminder,
        notes: notes.trim() || undefined,
      };

      if (isEditing && params.taskId) {
        await updateTask(params.taskId, input);
      } else {
        await addTask(input);
      }
      router.back();
    } catch (err) {
      Alert.alert('Error saving task', errorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!params.taskId) return;
    Alert.alert('Delete task', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteTask(params.taskId!);
            router.back();
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerAction}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Task' : 'New Task'}</Text>
        <TouchableOpacity onPress={() => void handleSave()} disabled={saving}>
          <Text style={[styles.headerAction, styles.headerActionBold]}>{saving ? '...' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.titleInput}
          placeholder="Task title"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.categoryChipText, category === c.key && styles.categoryChipTextActive]}>
                {c.icon} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowCard}>
          <TouchableOpacity style={styles.row} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.rowLabel}>📅 Date</Text>
            <Text style={styles.rowValue}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.rowLabel}>🕐 Time</Text>
            <Text style={styles.rowValue}>{time ? formatTimeDisplay(time) : 'None'}</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>🔁 Repeat</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
              {REPEAT_OPTIONS.map((r) => (
                <TouchableOpacity key={r.key} onPress={() => setRepeat(r.key)}>
                  <Text style={[styles.repeatOption, repeat === r.key && styles.repeatOptionActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.reminderRow}>
          <Text style={styles.rowLabel}>🔔 Reminder</Text>
          <Switch value={reminder} onValueChange={setReminder} trackColor={{ true: Colors.accent }} />
        </View>

        <Text style={styles.sectionLabel}>NOTES</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selected) setDate(selected);
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={time ?? new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selected) setTime(selected);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  headerAction: { fontSize: 15, color: Colors.accent },
  headerActionBold: { fontWeight: '700' },
  content: { padding: Spacing.md },
  titleInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  categoryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  categoryChip: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  categoryChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  categoryChipTextActive: { color: 'white' },
  rowCard: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 6,
    paddingHorizontal: Spacing.md,
  },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.md },
  rowLabel: { fontSize: 14, color: Colors.textPrimary },
  rowValue: { fontSize: 14, color: Colors.textSecondary },
  repeatOption: { fontSize: 12, color: Colors.textMuted, paddingHorizontal: 6 },
  repeatOptionActive: { color: Colors.accent, fontWeight: '700' },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  notesInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  deleteButton: { alignItems: 'center', paddingVertical: Spacing.md },
  deleteButtonText: { color: '#D64545', fontSize: 14, fontWeight: '600' },
});
