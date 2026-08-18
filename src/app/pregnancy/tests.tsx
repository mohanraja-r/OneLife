import { useFocusEffect } from 'expo-router';
import {
  Check,
  Droplet,
  Scan,
  Stethoscope,
  Syringe,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import AppHeader from '../../components/AppHeader';
import { ErrorNotice, LoadingState } from '../../components/ui';
import type { TestKind } from '../../constants/pregnancyTests';
import {
  Accent,
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import {
  daysBetween,
  parseDateString,
  startOfToday,
  toDateString,
} from '../../services/dates';
import { errorMessage } from '../../services/errors';
import { ScheduledTest, scheduleTests } from '../../services/pregnancy';
import {
  PregnancyRecord,
  getPregnancy,
  setTestDone,
} from '../../services/women';

/** Which half of the list is showing. */
type Tab = 'upcoming' | 'completed';

/** Icon and colour for each kind of appointment. */
const KIND_STYLE: Record<TestKind, { icon: LucideIcon; accent: Accent }> = {
  scan: { icon: Scan, accent: Accents.violet },
  blood: { icon: Droplet, accent: Accents.rose },
  vaccine: { icon: Syringe, accent: Accents.blue },
  checkup: { icon: Stethoscope, accent: Accents.green },
};

/** `MAY` / `16` for the date tile on each card. */
function dateParts(date: string): { month: string; day: string } {
  const parsed = parseDateString(date);
  return {
    month: parsed.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: String(parsed.getDate()),
  };
}

/** The status line under a test's title. */
function statusLine(test: ScheduledTest): string {
  if (test.status === 'done' && test.doneDate) {
    return `Done on ${parseDateString(test.doneDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  }
  if (test.status === 'overdue') {
    // Counted from the day the window closed, not from its midpoint — the
    // midpoint sits weeks earlier on a long window, which overstated how late
    // a test actually was.
    const late = daysBetween(parseDateString(test.windowEnd), startOfToday());
    return `Window closed ${late} day${late === 1 ? '' : 's'} ago`;
  }
  if (test.status === 'due') return 'Due now';
  if (test.daysAway === 1) return 'Due tomorrow';
  return `Due in ${test.daysAway} days`;
}

/**
 * Tests & Scans — the antenatal schedule resolved against her due date.
 *
 * Sorted by the date each test actually lands on, with anything overdue first,
 * so the next thing to do is always the top thing on the screen.
 */
export default function TestsScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Loads the pregnancy record the schedule is derived from. */
  const load = useCallback(async () => {
    try {
      setError(null);
      setRecord(await getPregnancy());
    } catch (err) {
      setError(errorMessage(err, 'Could not load your test schedule.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const tests = useMemo(
    () => (record ? scheduleTests(record) : []),
    [record]
  );

  const shown = tests.filter((test) =>
    tab === 'completed' ? test.status === 'done' : test.status !== 'done'
  );

  /** Marks a test done today, or clears it when it was already marked. */
  const toggle = async (test: ScheduledTest) => {
    try {
      await setTestDone(
        test.key,
        test.status === 'done' ? null : toDateString(startOfToday())
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update that test.'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Tests & Scans" />

      <View style={styles.segmented}>
        {(['upcoming', 'completed'] as Tab[]).map((item) => {
          const selected = tab === item;
          return (
            <AnimatedPressable
              key={item}
              onPress={() => setTab(item)}
              style={[styles.segment, selected && styles.segmentActive]}>
              <Text
                style={[
                  styles.segmentLabel,
                  selected && styles.segmentLabelActive,
                ]}>
                {item === 'upcoming' ? 'Upcoming' : 'Completed'}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            key={tab}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {tab === 'upcoming' && (
              <View style={styles.intro}>
                <Text style={styles.introTitle}>Upcoming tests & scans</Text>
                <Text style={styles.introBody}>
                  Worked out from your due date, following the schedule commonly
                  used in India. Your hospital may do things a little
                  differently.
                </Text>
              </View>
            )}

            {shown.length === 0 ? (
              <Text style={styles.empty}>
                {tab === 'completed'
                  ? 'Nothing marked done yet. Tick a test off as you have it.'
                  : 'Everything on the schedule is marked done.'}
              </Text>
            ) : (
              shown.map((test, index) => {
                const { icon: Icon, accent } = KIND_STYLE[test.kind];
                const { month, day } = dateParts(test.date);
                const done = test.status === 'done';

                return (
                  <MotiView
                    key={test.key}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{
                      type: 'timing',
                      duration: Motion.fast,
                      delay: Motion.enterDelay + index * Motion.stagger,
                    }}
                    style={styles.card}>
                    <View style={styles.cardTop}>
                      <View
                        style={[
                          styles.dateTile,
                          { backgroundColor: accent.tint },
                        ]}>
                        <Text style={[styles.dateDay, { color: accent.dark }]}>
                          {day}
                        </Text>
                        <Text style={[styles.dateMonth, { color: accent.main }]}>
                          {month}
                        </Text>
                      </View>

                      <View style={styles.cardText}>
                        <View style={styles.titleRow}>
                          <Icon size={13} color={accent.main} strokeWidth={2.2} />
                          <Text style={styles.cardTitle}>{test.title}</Text>
                        </View>
                        <Text
                          style={[
                            styles.cardStatus,
                            test.status === 'overdue' && styles.cardOverdue,
                            done && styles.cardDone,
                          ]}>
                          {statusLine(test)}
                        </Text>
                        <Text style={styles.cardWindow}>
                          {test.windowLabel}
                        </Text>
                      </View>

                      <AnimatedPressable
                        onPress={() => void toggle(test)}
                        style={[
                          styles.markButton,
                          done && styles.markButtonDone,
                        ]}>
                        {done ? (
                          <Check
                            size={15}
                            color={Colors.textInverse}
                            strokeWidth={3}
                          />
                        ) : (
                          <Text style={styles.markLabel}>Mark done</Text>
                        )}
                      </AnimatedPressable>
                    </View>

                    <Text style={styles.cardBody}>{test.description}</Text>
                  </MotiView>
                );
              })
            )}

            <View style={styles.adviceCard}>
              <Stethoscope size={18} color={Accents.violet.main} strokeWidth={2} />
              <Text style={styles.adviceText}>
                Always follow your doctor for what you actually need and when.
                This schedule is a general guide, and some tests depend on your
                blood group, your history or earlier results.
              </Text>
            </View>
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.lg,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  segmentActive: { backgroundColor: Colors.primaryTint },
  segmentLabel: { ...Typography.caption, color: Colors.textSecondary },
  segmentLabelActive: { color: Colors.primary, fontWeight: '700' },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  intro: {
    backgroundColor: Accents.violet.tint,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  introTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Accents.violet.dark,
  },
  introBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 17,
  },
  empty: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  dateTile: {
    width: 46,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dateDay: { ...Typography.metricValue, fontSize: 18 },
  dateMonth: { ...Typography.label, fontSize: 10, fontWeight: '700' },
  cardText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  cardStatus: {
    ...Typography.label,
    color: Accents.pink.main,
    fontWeight: '600',
    marginTop: 3,
  },
  cardOverdue: { color: Accents.amber.dark },
  cardDone: { color: Accents.green.dark },
  cardWindow: { ...Typography.label, color: Colors.textMuted, marginTop: 1 },
  markButton: {
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Accents.pink.main,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
  },
  markButtonDone: {
    backgroundColor: Accents.green.main,
    borderColor: Accents.green.main,
  },
  markLabel: {
    ...Typography.label,
    fontSize: 10.5,
    fontWeight: '700',
    color: Accents.pink.main,
  },
  cardBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: Spacing.md,
  },
  adviceCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    backgroundColor: Accents.violet.tint,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  adviceText: {
    ...Typography.label,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
});
