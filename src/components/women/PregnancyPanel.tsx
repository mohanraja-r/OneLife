import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import type { LucideIcon } from 'lucide-react-native';
import {
  Baby,
  CalendarDays,
  ChevronRight,
  Gauge,
  Plus,
  Ruler,
  Stethoscope,
  TrendingUp,
} from 'lucide-react-native';
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
  Accent,
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
  formatShortDate,
  parseDateString,
  startOfToday,
  toDateString,
} from '../../services/dates';
import type {
  PregnancyLog,
  PregnancyRecord,
  PregnancySummary,
} from '../../services/women';
import AnimatedPressable from '../AnimatedPressable';

import { LogKind, PREGNANCY_LOGS } from './LogSheet';
import { Disclaimer, LogRow, SectionHeader, cardStyles } from './shared';

/** A full term from the last menstrual period, used to seed the date picker. */
const GESTATION_DAYS = 280;

/** The three trimesters, for the guide strip at the bottom of the tab. */
const TRIMESTERS: { id: 1 | 2 | 3; label: string; weeks: string; accent: Accent }[] =
  [
    { id: 1, label: '1st Trimester', weeks: 'Weeks 1 - 13', accent: Accents.green },
    { id: 2, label: '2nd Trimester', weeks: 'Weeks 14 - 27', accent: Accents.pink },
    { id: 3, label: '3rd Trimester', weeks: 'Weeks 28 - 40', accent: Accents.violet },
  ];

interface DueDateProps {
  /** `YYYY-MM-DD`, or null when no due date has been set yet. */
  value: string | null;
  onChange: (date: string) => void;
  children: (open: () => void) => React.ReactNode;
}

/**
 * Wraps any control in the platform's date picker for the due date.
 *
 * Android gets the system dialog through the imperative API; iOS has no
 * equivalent, so the wheel is presented in a sheet styled like the rest of the
 * app. `children` is a render prop so the trigger can be a button or a row.
 */
function DueDatePicker({ value, onChange, children }: DueDateProps) {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Default to a due date a full term out, which is what someone setting this
  // up on the day they found out would want.
  const seed = value
    ? parseDateString(value)
    : addDays(startOfToday(), GESTATION_DAYS);
  const [draft, setDraft] = useState(seed);

  /** Opens the platform's date picker. */
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: seed,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toDateString(date));
        },
      });
      return;
    }
    setDraft(seed);
    setSheetOpen(true);
  };

  return (
    <>
      {children(open)}

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
                <Text style={styles.sheetTitle}>Estimated due date</Text>

                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  onChange={(_, date) => {
                    if (date) setDraft(date);
                  }}
                />

                <TouchableOpacity
                  onPress={() => {
                    onChange(toDateString(draft));
                    setSheetOpen(false);
                  }}
                  style={styles.done}
                  accessibilityRole="button">
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </MotiView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

/** The empty state: no due date is set, so there is nothing to track yet. */
export function PregnancySetup({
  onSetDueDate,
}: {
  onSetDueDate: (date: string) => void;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: Motion.slow }}
      style={styles.setupCard}>
      <View style={styles.setupTile}>
        <Baby size={28} color={Accents.pink.main} strokeWidth={1.8} />
      </View>
      <Text style={styles.setupTitle}>Track your pregnancy</Text>
      <Text style={styles.setupBody}>
        Set your estimated due date and we&apos;ll follow the weeks with you —
        size comparisons, weight and symptom logs, and your checkup schedule.
      </Text>

      <DueDatePicker value={null} onChange={onSetDueDate}>
        {(open) => (
          <AnimatedPressable
            onPress={open}
            style={[styles.setupButton, accentShadow(Accents.pink.main)]}>
            <CalendarDays size={18} color={Colors.textInverse} strokeWidth={2.2} />
            <Text style={styles.setupButtonText}>Set due date</Text>
          </AnimatedPressable>
        )}
      </DueDatePicker>
    </MotiView>
  );
}

interface Props {
  record: PregnancyRecord;
  summary: PregnancySummary;
  /** Today's log, so the log tiles can show what is already recorded. */
  today: PregnancyLog | null;
  onPickLog: (kind: LogKind) => void;
  onChangeDueDate: (date: string) => void;
  onAddCheckup: () => void;
  /** Opens the full history — the "See all" / "See guide" links. */
  onSeeAll: () => void;
}

/** Which log tiles already hold a value for today. */
function loggedKinds(today: PregnancyLog | null): Set<LogKind> {
  const done = new Set<LogKind>();
  if (!today) return done;
  if (typeof today.weightKg === 'number') done.add('weight');
  if (today.symptoms?.length) done.add('symptoms');
  if (typeof today.kicks === 'number') done.add('kicks');
  if (today.mood) done.add('mood');
  if (typeof today.sleepHours === 'number') done.add('sleep');
  if (today.notes) done.add('notes');
  return done;
}

/** One icon + label + value line inside the insights card. */
function InsightRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: Accent;
}) {
  return (
    <View style={styles.insightRow}>
      <Icon size={14} color={accent.main} strokeWidth={2} />
      <Text style={styles.insightLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.insightValue} numberOfLines={1}>
        {value}
      </Text>
      <ChevronRight size={13} color={Colors.textMuted} />
    </View>
  );
}

/**
 * The Pregnancy tab: how far along the user is, this week's size comparison,
 * what they can log, their measurements and their antenatal appointments.
 */
export default function PregnancyPanel({
  record,
  summary,
  today,
  onPickLog,
  onChangeDueDate,
  onAddCheckup,
  onSeeAll,
}: Props) {
  const {
    week,
    day,
    trimester,
    trimesterLabel,
    weeksToGo,
    progress,
    dueDate,
    babySize,
    totalWeightGainKg,
    fundalHeightCm,
    bloodPressure,
    nextCheckup,
    upcomingCheckups,
  } = summary;

  return (
    <View>
      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: Motion.slow }}
        style={styles.heroCard}>
        <View style={styles.heroMain}>
          <Text style={styles.heroLabel}>WEEK</Text>
          <View style={styles.heroWeekRow}>
            <Text style={styles.heroWeek}>{week}</Text>
            <Text style={styles.heroWeekUnit}>w</Text>
            <Text style={styles.heroWeekDays}>{day}d</Text>
          </View>
          <Text style={styles.heroTrimester}>{trimesterLabel}</Text>

          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.heroMeta}>
            {weeksToGo === 0 ? 'Due any day now' : `${weeksToGo} weeks to go`}
          </Text>

          <DueDatePicker value={dueDate} onChange={onChangeDueDate}>
            {(open) => (
              <AnimatedPressable onPress={open}>
                <Text style={styles.heroDue}>
                  Due date: {formatLongDate(dueDate)}
                </Text>
              </AnimatedPressable>
            )}
          </DueDatePicker>
        </View>

        <View style={styles.heroAside}>
          <View style={styles.babyCircle}>
            <Text style={styles.babyEmoji}>{babySize.emoji}</Text>
          </View>
          <Text style={styles.babyCaption}>Baby size</Text>
          <Text style={styles.babyName} numberOfLines={1}>
            {babySize.name}
          </Text>
          <Text style={styles.babyMetrics}>
            ~{babySize.lengthCm} cm · ~{babySize.weightG} g
          </Text>
        </View>
      </MotiView>

      <AnimatedPressable onPress={onSeeAll} style={styles.sizeCard}>
        <Text style={styles.sizeEmoji}>{babySize.emoji}</Text>
        <View style={styles.sizeText}>
          <Text style={styles.sizeTitle}>
            Baby is about the size of a {babySize.name.toLowerCase()}
          </Text>
          <Text style={styles.sizeSubtitle} numberOfLines={2}>
            ~{babySize.weightG} g · {babySize.fact}
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </AnimatedPressable>

      <SectionHeader title="Log today" actionLabel="See all" onAction={onSeeAll} />
      <LogRow
        kinds={PREGNANCY_LOGS}
        logged={loggedKinds(today)}
        onPick={onPickLog}
      />

      <View style={[cardStyles.row, styles.summaryRow]}>
        <View style={[cardStyles.card, cardStyles.column]}>
          <View style={cardStyles.cardHeader}>
            <Text style={cardStyles.cardTitle}>Pregnancy insights</Text>
            <AnimatedPressable onPress={onSeeAll}>
              <Text style={cardStyles.cardAction}>See all</Text>
            </AnimatedPressable>
          </View>

          <InsightRow
            icon={TrendingUp}
            label="Total weight gain"
            value={
              totalWeightGainKg === null ? '—' : `${totalWeightGainKg} kg`
            }
            accent={Accents.green}
          />
          <InsightRow
            icon={Ruler}
            label="Fundal height"
            value={fundalHeightCm === null ? '—' : `${fundalHeightCm} cm`}
            accent={Accents.violet}
          />
          <InsightRow
            icon={Gauge}
            label="Blood pressure"
            value={bloodPressure ? `${bloodPressure} mmHg` : '—'}
            accent={Accents.blue}
          />
          <InsightRow
            icon={Stethoscope}
            label="Next checkup"
            value={nextCheckup ? formatShortDate(nextCheckup.date) : '—'}
            accent={Accents.pink}
          />
        </View>

        <View style={[cardStyles.card, cardStyles.column]}>
          <View style={cardStyles.cardHeader}>
            <Text style={cardStyles.cardTitle}>Upcoming checkups</Text>
            <AnimatedPressable onPress={onAddCheckup}>
              <Text style={cardStyles.cardAction}>Add</Text>
            </AnimatedPressable>
          </View>

          {upcomingCheckups.length > 0 ? (
            upcomingCheckups.slice(0, 3).map((checkup) => (
              <View key={checkup.id} style={styles.checkupRow}>
                <View style={styles.checkupTile}>
                  <CalendarDays
                    size={14}
                    color={Accents.pink.main}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.checkupText}>
                  <Text style={styles.checkupTitle} numberOfLines={1}>
                    {checkup.title}
                  </Text>
                  <Text style={styles.checkupMeta} numberOfLines={1}>
                    {formatShortDate(checkup.date)}
                    {checkup.time ? ` · ${checkup.time}` : ''}
                  </Text>
                  {!!checkup.provider && (
                    <Text style={styles.checkupMeta} numberOfLines={1}>
                      {checkup.provider}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <TouchableOpacity
              onPress={onAddCheckup}
              activeOpacity={0.7}
              style={styles.checkupEmpty}
              accessibilityRole="button">
              <Plus size={16} color={Accents.pink.main} strokeWidth={2.4} />
              <Text style={styles.checkupEmptyText}>
                Add your next appointment
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionHeader
        title="Trimester guide"
        actionLabel="See guide"
        onAction={onSeeAll}
      />
      <View style={styles.trimesterRow}>
        {TRIMESTERS.map((item) => {
          const active = item.id === trimester;
          return (
            <View
              key={item.id}
              style={[
                styles.trimesterChip,
                {
                  backgroundColor: item.accent.tint,
                  borderColor: active ? item.accent.main : 'transparent',
                },
              ]}>
              <Text style={[styles.trimesterLabel, { color: item.accent.dark }]}>
                {item.label}
              </Text>
              <Text style={[styles.trimesterWeeks, { color: item.accent.dark }]}>
                {item.weeks}
              </Text>
            </View>
          );
        })}
      </View>

      {record.logs.length === 0 && (
        <Text style={styles.footnote}>
          Log a weight today and again next week to start your gain chart.
        </Text>
      )}

      <Disclaimer text="This tracks your logged data only and isn't medical advice. Please follow your doctor's guidance for all pregnancy care decisions." />
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: Accents.pink.tint,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  heroMain: { flex: 1.6 },
  heroLabel: {
    ...Typography.label,
    letterSpacing: 0.8,
    color: Accents.pink.dark,
  },
  heroWeekRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  heroWeek: { ...Typography.displayNumber, color: Accents.pink.dark },
  heroWeekUnit: { ...Typography.unit, color: Accents.pink.dark },
  heroWeekDays: { ...Typography.unit, color: Accents.pink.main },
  heroTrimester: {
    ...Typography.caption,
    color: Accents.pink.dark,
    marginTop: Spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.main,
  },
  heroMeta: {
    ...Typography.label,
    color: Accents.pink.main,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  heroDue: {
    ...Typography.caption,
    color: Accents.pink.dark,
    marginTop: Spacing.xs,
    textDecorationLine: 'underline',
  },
  heroAside: { flex: 1, alignItems: 'center' },
  babyCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Accents.pink.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyEmoji: { fontSize: 38, lineHeight: 46 },
  babyCaption: {
    ...Typography.label,
    color: Accents.pink.dark,
    marginTop: Spacing.sm,
  },
  babyName: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  babyMetrics: { ...Typography.label, color: Colors.textSecondary },
  sizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  sizeEmoji: { fontSize: 28, lineHeight: 34 },
  sizeText: { flex: 1 },
  sizeTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sizeSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: { marginTop: Spacing.xxl },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  insightLabel: { ...Typography.label, color: Colors.textSecondary, flex: 1 },
  insightValue: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  checkupRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkupTile: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkupText: { flex: 1 },
  checkupTitle: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  checkupMeta: { ...Typography.label, color: Colors.textSecondary },
  checkupEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  checkupEmptyText: { ...Typography.label, color: Colors.textSecondary, flex: 1 },
  trimesterRow: { flexDirection: 'row', gap: Spacing.sm },
  trimesterChip: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  trimesterLabel: { ...Typography.label, fontWeight: '700' },
  trimesterWeeks: { ...Typography.label, marginTop: 2 },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
  setupCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  setupTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  setupTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  setupBody: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.pink.main,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  setupButtonText: { ...Typography.button, color: Colors.textInverse },
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
    backgroundColor: Accents.pink.tint,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  doneText: { ...Typography.button, fontSize: 16, color: Accents.pink.dark },
});
