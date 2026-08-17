import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Droplets,
  Flame,
  Footprints,
  MapPin,
  Pencil,
  Plus,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import CalendarSheet from '../../components/CalendarSheet';
import FloatingNav from '../../components/FloatingNav';
import GradientRing from '../../components/GradientRing';
import HealthHistorySheet from '../../components/HealthHistorySheet';
import HealthValueSheet, {
  HealthField,
} from '../../components/HealthValueSheet';
import { ErrorNotice, LoadingState } from '../../components/ui';
import WaterDroplet from '../../components/WaterDroplet';
import WeekBars from '../../components/WeekBars';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { addDays, startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import {
  DEFAULT_STEP_GOAL,
  DEFAULT_WATER_GOAL_ML,
  HealthEntry,
  HealthGoals,
  buildWeekChart,
  computeStreak,
  estimateActiveMinutes,
  estimateCalories,
  estimateDistanceKm,
  formatActiveTime,
  formatSteps,
  formatWater,
  getHealthEntry,
  getHealthGoals,
  getHealthHistory,
  goalsMet,
  hydrationInsight,
  setHealthGoals,
  setSteps,
  setWaterMl,
  splitWater,
  summariseHealth,
  weekOverWeekSteps,
} from '../../services/health';
import {
  StepReading,
  blockerMessage,
  readTodaySteps,
  requestStepsPermission,
} from '../../services/pedometer';
import { getPersonalDetails } from '../../services/profile';

/** Diameter of the steps ring. */
const RING_SIZE = 132;
/** Rendered width of the water droplet gauge. */
const DROPLET_SIZE = 124;
/** The amounts the quick-add row offers, in millilitres. */
const QUICK_ADDS = [250, 500, 750, 1000];
/** How much history the week chart, streak and trend are computed from. */
const HISTORY_DAYS = 14;

const EMPTY_ENTRY: HealthEntry = { date: '', steps: 0, waterMl: 0 };
const EMPTY_GOALS: HealthGoals = {
  stepGoal: DEFAULT_STEP_GOAL,
  waterGoalMl: DEFAULT_WATER_GOAL_ML,
};

/** Renders the date pill's label, e.g. `Today, May 14` or `Tue, May 13`. */
function dateLabel(date: Date, isToday: boolean): string {
  const dayAndMonth = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  if (isToday) return `Today, ${dayAndMonth}`;
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday}, ${dayAndMonth}`;
}

/**
 * Health — one day's activity and hydration: the steps ring and week chart on
 * top, the water droplet and quick-add below.
 *
 * The date strip governs the whole screen rather than either card, so both
 * metrics always describe the same day, and every read and write is keyed on
 * that date rather than assuming today.
 *
 * Steps come from the device pedometer and are mirrored into `health_entries`
 * so they survive into history and onto Home. Calories, distance and active
 * time are derived from that count and the profile's height and weight — they
 * are estimates, not measurements, and the card says so.
 */
export default function HealthScreen() {
  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [entry, setEntry] = useState<HealthEntry>(EMPTY_ENTRY);
  const [goals, setGoals] = useState<HealthGoals>(EMPTY_GOALS);
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HealthField | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  /** The device's answer for today; null while browsing an earlier day. */
  const [reading, setReading] = useState<StepReading | null>(null);

  const dateKey = toDateString(selectedDate);
  const todayKey = toDateString(startOfToday());
  const isToday = dateKey === todayKey;

  /**
   * Mirrors a device step count into `health_entries`. A failed write is
   * swallowed: the count on screen is still right, and an error banner over a
   * background sync would be noise.
   */
  const persistSteps = useCallback(
    async (steps: number, current: HealthEntry) => {
      if (steps === current.steps) return;
      try {
        setEntry(await setSteps(steps, dateKey));
      } catch {
        setEntry({ ...current, steps });
      }
    },
    [dateKey]
  );

  /** Loads the day's entry, goals, history, body measurements and steps. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [dayEntry, targets, recent, details] = await Promise.all([
        getHealthEntry(dateKey),
        getHealthGoals(),
        getHealthHistory(HISTORY_DAYS),
        // Only used to scale the estimates, so a missing profile falls back to
        // population averages rather than failing the whole screen.
        getPersonalDetails().catch(() => null),
      ]);
      setEntry(dayEntry);
      setGoals(targets);
      setHistory(recent);
      setHeightCm(details?.heightCm ?? null);
      setWeightKg(details?.weightKg ?? null);

      // The pedometer only reports today, so an earlier day shows whatever was
      // recorded at the time and no permission affordance.
      if (!isToday) {
        setReading(null);
        return;
      }

      const deviceReading = await readTodaySteps();
      setReading(deviceReading);
      if (deviceReading.steps !== null) {
        await persistSteps(deviceReading.steps, dayEntry);
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load your health data.'));
    } finally {
      setLoading(false);
    }
  }, [dateKey, isToday, persistSteps]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  /** Prompts for step access, then adopts whatever the device then reports. */
  const askForSteps = async () => {
    const next = await requestStepsPermission();
    setReading(next);
    if (next.steps !== null) await persistSteps(next.steps, entry);
  };

  const summary = useMemo(() => summariseHealth(entry, goals), [entry, goals]);
  const logged = splitWater(entry.waterMl);

  const chart = useMemo(
    () => buildWeekChart(history, dateKey, goals.stepGoal),
    [history, dateKey, goals.stepGoal]
  );
  const streak = useMemo(
    () => computeStreak(history, goals, dateKey),
    [history, goals, dateKey]
  );
  const trend = useMemo(
    () => weekOverWeekSteps(history, dateKey),
    [history, dateKey]
  );
  // Only meaningful for the day in progress; a past day's "before 6 PM" advice
  // would be nonsense.
  const insight = isToday ? hydrationInsight(summary) : null;

  const stepNotice = reading ? blockerMessage(reading.blocker) : null;
  const canAskForSteps =
    reading !== null &&
    reading.available &&
    reading.blocker !== null &&
    reading.canAskAgain;

  /** Reports a failed write and reloads, so the screen never shows a lie. */
  const reportFailure = (err: unknown, fallback: string) => {
    Alert.alert('Could not save', errorMessage(err, fallback));
    void load();
  };

  /** Steps the viewed day forward or back, never past today. */
  const shiftDay = (delta: number) => {
    const next = addDays(selectedDate, delta);
    if (toDateString(next) > todayKey) return;
    setSelectedDate(next);
  };

  /**
   * Adds to the running water total and saves it. The new figure is painted
   * before the write resolves so a tap feels instant; a failure puts the
   * stored value back.
   */
  const addWater = async (deltaMl: number) => {
    const previous = entry;
    const next = Math.max(0, entry.waterMl + deltaMl);
    setEntry({ ...entry, waterMl: next });

    try {
      setEntry(await setWaterMl(next, dateKey));
    } catch (err) {
      setEntry(previous);
      Alert.alert(
        'Could not save',
        errorMessage(err, 'Could not save your water intake.')
      );
    }
  };

  /** Saves whichever number the sheet was editing. */
  const saveField = async (field: HealthField, value: number) => {
    try {
      if (field === 'addWater') {
        await addWater(value);
        return;
      }
      setGoals(
        await setHealthGoals({
          stepGoal: field === 'stepGoal' ? value : goals.stepGoal,
          waterGoalMl: field === 'waterGoal' ? value : goals.waterGoalMl,
        })
      );
    } catch (err) {
      reportFailure(err, 'Could not save that value.');
    }
  };

  /** The value the sheet should open on for the field being edited. */
  const initialSheetValue = (): number => {
    switch (editing) {
      case 'stepGoal':
        return goals.stepGoal;
      case 'waterGoal':
        return goals.waterGoalMl;
      default:
        return 0;
    }
  };

  const activityTiles = [
    {
      icon: Flame,
      color: Accents.orange.main,
      tint: Accents.orange.tint,
      value: String(estimateCalories(entry.steps, weightKg)),
      label: 'kcal',
    },
    {
      icon: MapPin,
      color: Accents.violet.main,
      tint: Accents.violet.tint,
      value: estimateDistanceKm(entry.steps, heightCm).toFixed(1),
      label: 'km',
    },
    {
      icon: Timer,
      color: Accents.blue.main,
      tint: Accents.blue.tint,
      value: formatActiveTime(estimateActiveMinutes(entry.steps)),
      label: 'Active',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Health" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Date strip: arrows either side of the calendar pill. */}
        <View style={styles.dateStrip}>
          <TouchableOpacity
            onPress={() => shiftDay(-1)}
            hitSlop={10}
            style={styles.dateArrow}
            accessibilityRole="button"
            accessibilityLabel="Previous day">
            <ChevronLeft size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setCalendarOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${dateLabel(selectedDate, isToday)}. Change date.`}>
            <CalendarDays size={15} color={Colors.primary} />
            <Text style={styles.dateLabel}>
              {dateLabel(selectedDate, isToday)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => shiftDay(1)}
            hitSlop={10}
            // Today is the last day there can be data for, so forward stops here.
            disabled={isToday}
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Next day">
            <ChevronRight size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Colors.primary} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* ---------------------------------------------- Steps */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Footprints size={17} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Steps</Text>
                </View>
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => setHistoryOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="View step history">
                  <Text style={styles.headerActionLabel}>View History</Text>
                  <TrendingUp size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.splitRow}>
                <GradientRing
                  size={RING_SIZE}
                  thickness={12}
                  progress={summary.stepProgress}
                  colors={Gradients.activity}>
                  <Footprints size={18} color={Colors.primary} />
                  <Text style={styles.ringValue}>
                    {formatSteps(entry.steps)}
                  </Text>
                  <Text style={styles.ringUnit}>Steps</Text>
                  <Text style={styles.ringPercent}>
                    {summary.stepPercent}% of goal
                  </Text>
                </GradientRing>

                <View style={styles.splitText}>
                  <Text style={styles.encourageTitle}>
                    {summary.stepsRemaining > 0
                      ? "You're doing amazing!"
                      : 'Goal smashed!'}
                  </Text>
                  <Text style={styles.encourageBody}>
                    {summary.stepsRemaining > 0
                      ? `${formatSteps(summary.stepsRemaining)} steps to reach your daily goal.`
                      : `${formatSteps(entry.steps)} steps — well past your goal.`}
                  </Text>
                  <TouchableOpacity
                    style={styles.goalLink}
                    onPress={() => setEditing('stepGoal')}
                    accessibilityRole="button"
                    accessibilityLabel="Edit your step goal">
                    <Text style={styles.goalLinkLabel}>Edit Goal</Text>
                    <Pencil size={12} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.chartWrap}>
                <WeekBars chart={chart} />
              </View>

              <View style={styles.tileRow}>
                {activityTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <View key={tile.label} style={styles.tile}>
                      <View
                        style={[
                          styles.tileIcon,
                          { backgroundColor: tile.tint },
                        ]}>
                        <Icon size={14} color={tile.color} />
                      </View>
                      <Text style={styles.tileValue}>{tile.value}</Text>
                      <Text style={styles.tileLabel}>{tile.label}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.estimateNote}>
                Calories, distance and active time are estimated from your steps.
              </Text>

              {stepNotice && <Text style={styles.stepNotice}>{stepNotice}</Text>}
              {canAskForSteps && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => void askForSteps()}
                  accessibilityRole="button">
                  <Text style={styles.actionLabel}>Allow step access</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ---------------------------------------------- Water */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Droplets size={17} color={Colors.hydration} />
                  <Text style={styles.cardTitle}>Water Intake</Text>
                </View>
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => setEditing('waterGoal')}
                  accessibilityRole="button"
                  accessibilityLabel="Edit your water goal">
                  <Text style={styles.headerActionLabel}>Edit Goal</Text>
                  <Pencil size={13} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.splitRow}>
                <WaterDroplet
                  size={DROPLET_SIZE}
                  progress={summary.waterProgress}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountValue}>{logged.value}</Text>
                    <Text style={styles.amountUnit}>{logged.unit}</Text>
                  </View>
                  <Text style={styles.amountGoal}>
                    of {formatWater(goals.waterGoalMl)}
                  </Text>
                  <Text style={styles.amountPercent}>
                    {summary.waterPercent}%
                  </Text>
                </WaterDroplet>

                <View style={styles.splitText}>
                  <Text style={styles.encourageTitle}>
                    {summary.waterRemainingMl > 0
                      ? 'Great job!'
                      : 'Fully hydrated!'}
                  </Text>
                  <Text style={styles.encourageBody}>
                    {summary.waterRemainingMl > 0
                      ? "You're on track with your daily hydration."
                      : "You've reached your goal for the day."}
                  </Text>

                  <TouchableOpacity
                    style={styles.remainingCard}
                    onPress={() => setEditing('addWater')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Add a custom amount of water">
                    <View style={styles.remainingText}>
                      <Text style={styles.remainingValue}>
                        {summary.waterRemainingMl > 0
                          ? formatWater(summary.waterRemainingMl)
                          : 'Goal met'}
                      </Text>
                      <Text style={styles.remainingCaption}>
                        {summary.waterRemainingMl > 0
                          ? 'to reach your goal'
                          : 'tap to add more'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.quickAddLabel}>Quick Add</Text>
              <View style={styles.quickRow}>
                {QUICK_ADDS.map((amount, index) => {
                  // The larger amounts are picked out, matching the reference:
                  // the two people reach for least get the louder treatment.
                  const emphasised = index >= 2;
                  return (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickChip,
                        emphasised && styles.quickChipEmphasised,
                      ]}
                      onPress={() => void addWater(amount)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${formatWater(amount)}`}>
                      <Plus
                        size={11}
                        strokeWidth={2.6}
                        color={
                          emphasised ? Accents.pink.main : Colors.hydration
                        }
                      />
                      <Text
                        style={[
                          styles.quickLabel,
                          emphasised && styles.quickLabelEmphasised,
                        ]}>
                        {formatWater(amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ------------------------------------ Today's Overview */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>
                {isToday ? "Today's Overview" : 'Day Overview'}
              </Text>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <View
                    style={[
                      styles.overviewIcon,
                      { backgroundColor: Accents.violet.tint },
                    ]}>
                    <CircleCheck size={15} color={Accents.violet.main} />
                  </View>
                  <View>
                    <Text style={styles.overviewValue}>
                      {goalsMet(summary)} of 2
                    </Text>
                    <Text style={styles.overviewLabel}>Goals completed</Text>
                  </View>
                </View>

                <View style={styles.overviewDivider} />

                <View style={styles.overviewItem}>
                  <View
                    style={[
                      styles.overviewIcon,
                      { backgroundColor: Accents.orange.tint },
                    ]}>
                    <Flame size={15} color={Accents.orange.main} />
                  </View>
                  <View>
                    <Text style={styles.overviewValue}>{streak}</Text>
                    <Text style={styles.overviewLabel}>Day streak</Text>
                  </View>
                </View>

                <View style={styles.overviewDivider} />

                <View style={styles.overviewItem}>
                  <View
                    style={[
                      styles.overviewIcon,
                      { backgroundColor: Accents.green.tint },
                    ]}>
                    <TrendingUp size={15} color={Accents.green.main} />
                  </View>
                  <View>
                    <Text style={styles.overviewValue}>
                      {trend === null
                        ? '—'
                        : `${trend > 0 ? '+' : ''}${trend}%`}
                    </Text>
                    <Text style={styles.overviewLabel}>vs last week</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ------------------------------------ Hydration Insight */}
            {insight && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setEditing('addWater')}
                accessibilityRole="button"
                accessibilityLabel={`Hydration insight. ${insight}`}>
                <LinearGradient
                  colors={Gradients.activity}
                  start={Gradients.horizontal.start}
                  end={Gradients.horizontal.end}
                  style={styles.insight}>
                  <View style={styles.insightIcon}>
                    <Droplets size={22} color={Colors.onPrimary} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>Hydration Insight</Text>
                    <Text style={styles.insightBody}>{insight}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.onPrimaryMuted} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </MotiView>
        )}

        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>

      <CalendarSheet
        visible={calendarOpen}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />

      <HealthHistorySheet
        visible={historyOpen}
        entries={history}
        goals={goals}
        onClose={() => setHistoryOpen(false)}
      />

      <HealthValueSheet
        field={editing}
        initialValue={initialSheetValue()}
        onClose={() => setEditing(null)}
        onSave={(field, value) => void saveField(field, value)}
      />

      <FloatingNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
  },

  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  dateArrow: { padding: Spacing.xs },
  dateArrowDisabled: { opacity: 0.3 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  dateLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: { ...Typography.cardTitle, fontSize: 17, color: Colors.primary },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerActionLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.primary,
  },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  splitText: { flex: 1 },
  encourageTitle: {
    ...Typography.optionLabel,
    fontSize: 15,
    color: Colors.primary,
  },
  encourageBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  goalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  goalLinkLabel: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primary,
  },

  ringValue: {
    ...Typography.largeNumber,
    fontSize: 25,
    lineHeight: 30,
    color: Colors.textPrimary,
  },
  ringUnit: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  ringPercent: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },

  chartWrap: { marginTop: Spacing.lg },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  tileValue: {
    ...Typography.metricValue,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  tileLabel: { ...Typography.label, fontSize: 10, color: Colors.textSecondary },
  estimateNote: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  stepNotice: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  action: {
    marginTop: Spacing.md,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  actionLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amountValue: {
    ...Typography.largeNumber,
    fontSize: 27,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  amountUnit: {
    ...Typography.unit,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingBottom: 4,
  },
  amountGoal: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  amountPercent: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.hydration,
    marginTop: 2,
  },
  remainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  remainingText: { flex: 1 },
  remainingValue: {
    ...Typography.optionLabel,
    fontSize: 14,
    color: Colors.hydration,
  },
  remainingCaption: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  quickAddLabel: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  quickChipEmphasised: {
    backgroundColor: Accents.pink.tint,
    borderColor: Accents.pink.tint,
  },
  quickLabel: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.hydration,
  },
  quickLabelEmphasised: { color: Accents.pink.main },

  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  overviewTitle: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  overviewDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  overviewIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewValue: {
    ...Typography.metricValue,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  overviewLabel: {
    ...Typography.label,
    fontSize: 9,
    color: Colors.textSecondary,
  },

  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.glow,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.onPrimaryFaint,
  },
  insightText: { flex: 1 },
  insightTitle: {
    ...Typography.optionLabel,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  insightBody: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.onPrimaryMuted,
    marginTop: 2,
  },
});
