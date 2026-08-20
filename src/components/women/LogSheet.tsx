import type { LucideIcon } from 'lucide-react-native';
import {
  Droplet,
  FlaskConical,
  Footprints,
  HeartPulse,
  Moon,
  NotebookPen,
  Smile,
  Thermometer,
  Weight,
} from 'lucide-react-native';
import { type JSX, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Accent,
  Accents,
  Colors,
  Radius,
  Spacing,
  Typography,
  accentShadow,
} from '../../constants/theme';
import AnimatedPressable from '../AnimatedPressable';
import { BottomSheet, sheetStyles } from '../ui';

/** Everything the "Log today" row can record, across both tabs. */
export type LogKind =
  | 'flow'
  | 'symptoms'
  | 'mood'
  | 'bbt'
  | 'ovulation'
  | 'weight'
  | 'kicks'
  | 'sleep'
  | 'notes';

/** A saved measurement. The shape follows the kind's `input`. */
export type LogValue = string | string[] | number | null;

/** How one loggable measurement is labelled, drawn and edited. */
export interface LogConfig {
  /** Tile caption in the "Log today" row. */
  label: string;
  /** Sheet heading. */
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: Accent;
  /** Which control the sheet renders, and what `LogValue` comes back. */
  input: 'choice' | 'multi' | 'number' | 'text';
  options?: { id: string; label: string; emoji?: string }[];
  /** Suffix shown beside a numeric field. */
  unit?: string;
  placeholder?: string;
}

/** Feelings offered on the mood step, shared by both tabs. */
const MOODS = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'calm', label: 'Calm', emoji: '😌' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
  { id: 'anxious', label: 'Anxious', emoji: '😰' },
  { id: 'irritable', label: 'Irritable', emoji: '😠' },
  { id: 'low', label: 'Low', emoji: '😢' },
];

/** Symptom chips. One list covers both tabs — the overlap is almost total. */
const SYMPTOMS = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'headache', label: 'Headache' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'back_pain', label: 'Back pain' },
  { id: 'tender_breasts', label: 'Tender breasts' },
  { id: 'acne', label: 'Acne' },
  { id: 'cravings', label: 'Cravings' },
  { id: 'mood_swings', label: 'Mood swings' },
  { id: 'heartburn', label: 'Heartburn' },
  { id: 'swelling', label: 'Swelling' },
];

/** The single source of truth for both the log tiles and the sheet. */
export const LOG_CONFIG: Record<LogKind, LogConfig> = {
  flow: {
    label: 'Flow',
    title: 'How heavy is your flow?',
    subtitle: 'Logging flow is what anchors your cycle predictions.',
    icon: Droplet,
    accent: Accents.rose,
    input: 'choice',
    options: [
      { id: 'light', label: 'Light', emoji: '💧' },
      { id: 'medium', label: 'Medium', emoji: '💧💧' },
      { id: 'heavy', label: 'Heavy', emoji: '💧💧💧' },
    ],
  },
  symptoms: {
    label: 'Symptoms',
    title: 'Any symptoms today?',
    subtitle: 'Pick as many as apply.',
    icon: HeartPulse,
    accent: Accents.violet,
    input: 'multi',
    options: SYMPTOMS,
  },
  mood: {
    label: 'Mood',
    title: 'How are you feeling?',
    subtitle: 'One tap — it feeds the trends over time.',
    icon: Smile,
    accent: Accents.amber,
    input: 'choice',
    options: MOODS,
  },
  bbt: {
    label: 'BBT',
    title: 'Basal body temperature',
    subtitle: 'Taken first thing, before getting out of bed.',
    icon: Thermometer,
    accent: Accents.rose,
    input: 'number',
    unit: '°C',
    placeholder: '36.60',
  },
  ovulation: {
    label: 'Ovulation Test',
    title: 'Ovulation test result',
    subtitle: 'A positive LH test pins your ovulation day exactly.',
    icon: FlaskConical,
    accent: Accents.pink,
    input: 'choice',
    options: [
      { id: 'positive', label: 'Positive', emoji: '✅' },
      { id: 'negative', label: 'Negative', emoji: '➖' },
    ],
  },
  weight: {
    label: 'Weight',
    title: "Today's weight",
    subtitle: 'Your total gain is measured from your first entry.',
    icon: Weight,
    accent: Accents.green,
    input: 'number',
    unit: 'kg',
    placeholder: '64.5',
  },
  kicks: {
    label: 'Baby Kicks',
    title: 'Kicks counted',
    subtitle: 'How many movements you felt in this session.',
    icon: Footprints,
    accent: Accents.pink,
    input: 'number',
    unit: 'kicks',
    placeholder: '10',
  },
  sleep: {
    label: 'Sleep',
    title: 'Hours slept',
    subtitle: 'Including naps.',
    icon: Moon,
    accent: Accents.blue,
    input: 'number',
    unit: 'hrs',
    placeholder: '7.5',
  },
  notes: {
    label: 'Notes',
    title: 'Notes for today',
    subtitle: 'Anything you want to remember or raise at your next checkup.',
    icon: NotebookPen,
    accent: Accents.neutral,
    input: 'text',
    placeholder: 'Felt more energetic after lunch…',
  },
};

/** The Cycle tab's log row, in the order it is drawn. */
export const CYCLE_LOGS: LogKind[] = [
  'flow',
  'symptoms',
  'mood',
  'bbt',
  'ovulation',
];

/**
 * The Pregnancy tab's log row, in the order it is drawn.
 *
 * Weight and kicks are deliberately absent: both have their own screen now, and
 * neither is a single number. Weight only means anything measured against the
 * pre-pregnancy baseline and the recommended band, and a kick count is a timed
 * session rather than a daily total. A quick-log shortcut for either would let
 * someone record a figure the real screen then contradicts.
 */
export const PREGNANCY_LOGS: LogKind[] = [
  'symptoms',
  'mood',
  'sleep',
  'notes',
];

interface Props {
  /** The measurement being edited; null keeps the sheet closed. */
  kind: LogKind | null;
  /** What is already stored for today, so the sheet opens pre-filled. */
  initialValue: LogValue;
  onClose: () => void;
  /** Saves the edited value; `null` means the user cleared it. */
  onSave: (kind: LogKind, value: LogValue) => void;
}

/** Reads a stored value as the array the multi-select control works on. */
function asArray(value: LogValue): string[] {
  return Array.isArray(value) ? value : [];
}

/** Reads a stored value as the string a text or numeric field starts from. */
function asText(value: LogValue): string {
  if (value === null || value === undefined) return '';
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/**
 * Bottom sheet for recording one Women's Health measurement — the control it
 * shows is decided by the kind's `input`, so every tile in the "Log today" row
 * opens the same component.
 */
export default function LogSheet({
  kind,
  initialValue,
  onClose,
  onSave,
}: Props): JSX.Element | null {
  const [choice, setChoice] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [text, setText] = useState('');

  // Re-seed every time a different tile opens the sheet, so it never shows the
  // previous measurement's value.
  useEffect(() => {
    if (!kind) return;
    setChoice(typeof initialValue === 'string' ? initialValue : null);
    setSelection(asArray(initialValue));
    setText(asText(initialValue));
  }, [kind, initialValue]);

  if (!kind) return null;
  const config = LOG_CONFIG[kind];
  const Icon = config.icon;

  /** Reads the control's current value in the shape the caller stores. */
  const currentValue = (): LogValue => {
    switch (config.input) {
      case 'choice':
        return choice;
      case 'multi':
        return selection;
      case 'number': {
        const parsed = Number(text.trim());
        return text.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
      }
      case 'text':
        return text.trim() === '' ? null : text.trim();
    }
  };

  /** Adds or removes a symptom chip from the selection. */
  const toggleChip = (id: string) => {
    setSelection((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const hasValue =
    config.input === 'multi' ? selection.length > 0 : currentValue() !== null;

  return (
    <BottomSheet visible onClose={onClose} avoidKeyboard>
      <View style={styles.heading}>
        <View
          style={[styles.headingTile, { backgroundColor: config.accent.tint }]}>
          <Icon size={20} color={config.accent.main} strokeWidth={2} />
        </View>
        <View style={styles.headingText}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>
      </View>

      {config.input === 'choice' && (
        <View style={styles.choices}>
          {config.options?.map((option) => {
            const active = choice === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() => setChoice(active ? null : option.id)}
                style={[
                  styles.choice,
                  active && {
                    borderColor: config.accent.main,
                    backgroundColor: config.accent.tint,
                  },
                ]}>
                {!!option.emoji && (
                  <Text style={styles.choiceEmoji}>{option.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.choiceLabel,
                    active && { color: config.accent.dark },
                  ]}>
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      {config.input === 'multi' && (
        <ScrollView style={styles.chipScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.chips}>
            {config.options?.map((option) => {
              const active = selection.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => toggleChip(option.id)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.chip,
                    active && {
                      borderColor: config.accent.main,
                      backgroundColor: config.accent.tint,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      active && { color: config.accent.dark },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {config.input === 'number' && (
        <View style={styles.numberField}>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder={config.placeholder}
            placeholderTextColor={Colors.textMuted}
            style={styles.numberInput}
            accessibilityLabel={config.title}
          />
          <Text style={styles.unit}>{config.unit}</Text>
        </View>
      )}

      {config.input === 'text' && (
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder={config.placeholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.textArea}
          accessibilityLabel={config.title}
        />
      )}

      <AnimatedPressable
        onPress={() => {
          onSave(kind, currentValue());
          onClose();
        }}
        style={[
          sheetStyles.save,
          { backgroundColor: config.accent.main },
          accentShadow(config.accent.main),
        ]}>
        <Text style={sheetStyles.saveLabel}>Save</Text>
      </AnimatedPressable>

      <TouchableOpacity
        onPress={() => {
          if (hasValue) {
            onSave(kind, config.input === 'multi' ? [] : null);
          }
          onClose();
        }}
        style={sheetStyles.cancel}
        accessibilityRole="button"
        activeOpacity={0.6}>
        <Text style={sheetStyles.cancelText}>
          {hasValue ? "Clear today's entry" : 'Cancel'}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headingTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingText: { flex: 1 },
  title: { ...Typography.cardTitle, color: Colors.textPrimary },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  choices: { gap: Spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
  },
  choiceEmoji: { fontSize: 16 },
  choiceLabel: { ...Typography.optionLabel, color: Colors.textPrimary },
  chipScroll: { maxHeight: 220 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  chipLabel: { ...Typography.caption, color: Colors.textPrimary },
  numberField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.lg,
  },
  numberInput: {
    flex: 1,
    ...Typography.largeNumber,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  unit: { ...Typography.unit, color: Colors.textSecondary },
  textArea: {
    minHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
});
