import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  CalendarDays,
  Droplets,
  Footprints,
  Plus,
  Target,
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

import CalendarSheet from '../../components/CalendarSheet';
import FloatingNav from '../../components/FloatingNav';
import HealthValueSheet, {
  HealthField,
} from '../../components/HealthValueSheet';
import { ErrorNotice, LoadingState } from '../../components/ui';
import WalkingFigure from '../../components/WalkingFigure';
import WaterDroplet from '../../components/WaterDroplet';
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
import { startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import {
  DEFAULT_STEP_GOAL,
  DEFAULT_WATER_GOAL_ML,
  HealthEntry,
  HealthGoals,
  formatSteps,
  formatWater,
  getHealthEntry,
  getHealthGoals,
  setHealthGoals,
  setSteps,
  setWaterMl,
  splitWater,
  summariseHealth,
} from '../../services/health';
import {
  StepReading,
  blockerMessage,
  readTodaySteps,
  requestStepsPermission,
} from '../../services/pedometer';

/**
 * Gauge sizes. Both cards have to share one viewport with the date pill and
 * the goals row, so these are sized to that budget rather than to how
 * commanding they could be on their own.
 */
const WALKER_SIZE = 124;
/** The droplet renders 1.32× its width, so it is the taller of the two. */
const DROPLET_SIZE = 124;

/** The amounts the quick-add row offers, in millilitres. */
const QUICK_ADDS = [250, 500, 750, 1000];

/** The entry shown before the first load resolves. */
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
 * Health — one day's step count and water intake, each scored against a goal
 * the user sets: the walking figure on top, the water droplet below it.
 *
 * The date pill governs the whole screen rather than either section, so both
 * metrics always describe the same day. Every read and write is keyed on that
 * date instead of assuming today.
 *
 * Steps come from the device pedometer and are mirrored into `health_entries`
 * so they survive into the history and onto Home. The device only reports
 * today, so earlier days show whatever was recorded at the time — there is no
 * manual entry to correct them with.
 */
export default function HealthScreen() {
  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [entry, setEntry] = useState<HealthEntry>(EMPTY_ENTRY);
  const [goals, setGoals] = useState<HealthGoals>(EMPTY_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HealthField | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  /** The device's answer for today; null while browsing an earlier day. */
  const [reading, setReading] = useState<StepReading | null>(null);

  const dateKey = toDateString(selectedDate);
  const isToday = dateKey === toDateString(startOfToday());

  /**
   * Mirrors a device step count into `health_entries`, so the figure survives
   * into the history and onto Home. A failed write is swallowed: the count on
   * screen is still correct, and forcing an error banner over a background
   * sync would be noise.
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

  /** Loads the selected day's entry, the goals, and today's device steps. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [dayEntry, targets] = await Promise.all([
        getHealthEntry(dateKey),
        getHealthGoals(),
      ]);
      setEntry(dayEntry);
      setGoals(targets);

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

  /** Prompts for step access, then adopts whatever the device then reports. */
  const askForSteps = async () => {
    const next = await requestStepsPermission();
    setReading(next);
    if (next.steps !== null) await persistSteps(next.steps, entry);
  };

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(() => summariseHealth(entry, goals), [entry, goals]);
  const logged = splitWater(entry.waterMl);

  const stepNotice = reading ? blockerMessage(reading.blocker) : null;
  // Only worth offering the prompt when the platform can actually serve it and
  // the user has not already refused for good.
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

  /**
   * Adds to the running water total and saves it.
   *
   * The new figure is painted before the write resolves so a tap feels
   * instant; a failure puts the stored value back rather than leaving the
   * droplet showing water that was never recorded.
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
      // "Add water" is an amount to add, not the running total, so it opens
      // blank rather than pre-filled.
      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Health</Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setCalendarOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${dateLabel(selectedDate, isToday)}. Change date.`}>
            <Text style={styles.dateLabel}>
              {dateLabel(selectedDate, isToday)}
            </Text>
            <CalendarDays size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.green.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* Steps */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <View
                    style={[
                      styles.iconTile,
                      { backgroundColor: Accents.green.tint },
                    ]}>
                    <Footprints size={18} color={Accents.green.main} />
                  </View>
                  <Text style={styles.cardTitle}>Steps</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditing('stepGoal')}
                  accessibilityRole="button"
                  accessibilityLabel="Change your step goal">
                  <Text style={styles.editLink}>Goal</Text>
                </TouchableOpacity>
              </View>

              <View
                style={styles.walkerWrap}
                accessible
                accessibilityLabel={`${formatSteps(entry.steps)} of ${formatSteps(
                  goals.stepGoal
                )} steps, ${summary.stepPercent} percent of your goal.`}>
                <WalkingFigure
                  size={WALKER_SIZE}
                  progress={summary.stepProgress}
                />
                <Text style={styles.stepValue}>{formatSteps(entry.steps)}</Text>
                <Text style={styles.stepUnit}>
                  of {formatSteps(goals.stepGoal)} steps
                </Text>
                <Text
                  style={[styles.stepPercent, { color: Accents.green.main }]}>
                  {summary.stepPercent}%
                </Text>
              </View>

              <Text style={styles.cardFooter}>
                {summary.stepsRemaining > 0
                  ? `${formatSteps(summary.stepsRemaining)} steps to go`
                  : 'Step goal reached — nice work'}
              </Text>

              {/* Only today can be read from the device, so the permission
                  affordance never appears while browsing history. */}
              {stepNotice && (
                <Text style={styles.stepNotice}>{stepNotice}</Text>
              )}
              {canAskForSteps && (
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => void askForSteps()}
                  accessibilityRole="button">
                  <Text style={styles.actionLabel}>Allow step access</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Water */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <View
                    style={[
                      styles.iconTile,
                      { backgroundColor: Accents.blue.tint },
                    ]}>
                    <Droplets size={18} color={Colors.hydration} />
                  </View>
                  <Text style={styles.cardTitle}>Water</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditing('waterGoal')}
                  accessibilityRole="button"
                  accessibilityLabel="Change your water goal">
                  <Text style={styles.editLink}>Goal</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dropletWrap}>
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
              </View>

              <Text style={styles.cardFooter}>
                {summary.waterRemainingMl > 0
                  ? `${formatWater(summary.waterRemainingMl)} left${isToday ? ' today' : ''}`
                  : 'Water goal reached — well hydrated'}
              </Text>

              <TouchableOpacity
                style={styles.addButtonWrap}
                onPress={() => setEditing('addWater')}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Add a custom amount of water">
                <LinearGradient
                  colors={Gradients.waterAction}
                  start={Gradients.horizontal.start}
                  end={Gradients.horizontal.end}
                  style={styles.addButton}>
                  <Plus size={19} color={Colors.textInverse} strokeWidth={2.6} />
                  <Text style={styles.addLabel}>Add Water</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.quickRow}>
                {QUICK_ADDS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickChip}
                    onPress={() => void addWater(amount)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${formatWater(amount)}`}>
                    <Text style={styles.quickLabel}>{formatWater(amount)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Goals summary */}
            <View style={styles.goalsCard}>
              <View
                style={[
                  styles.iconTile,
                  { backgroundColor: Accents.violet.tint },
                ]}>
                <Target size={18} color={Colors.primary} />
              </View>
              <View style={styles.goalsText}>
                <Text style={styles.goalsTitle}>Daily goals</Text>
                <Text style={styles.goalsSubtitle}>
                  {formatSteps(goals.stepGoal)} steps ·{' '}
                  {formatWater(goals.waterGoalMl)} water
                </Text>
              </View>
              {summary.allGoalsMet && (
                <View style={styles.metBadge}>
                  <Text style={styles.metBadgeText}>Both met</Text>
                </View>
              )}
            </View>
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
    paddingTop: Spacing.xxl,
  },
  title: { ...Typography.screenTitle, color: Colors.textPrimary },
  dateRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.round,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  dateLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  editLink: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  walkerWrap: { alignItems: 'center', marginVertical: Spacing.xs },
  stepValue: {
    ...Typography.largeNumber,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  stepUnit: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  stepPercent: {
    ...Typography.label,
    fontWeight: '700',
    marginTop: 2,
  },
  stepNotice: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  dropletWrap: { alignItems: 'center' },
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
  cardFooter: {
    ...Typography.label,
    color: Colors.textSecondary,
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
  addButtonWrap: { marginTop: Spacing.md },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.round,
    paddingVertical: Spacing.md,
    ...Shadow.glow,
  },
  addLabel: {
    ...Typography.optionLabel,
    color: Colors.textInverse,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  quickLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  goalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  goalsText: { flex: 1 },
  goalsTitle: { ...Typography.optionLabel, color: Colors.textPrimary },
  goalsSubtitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  metBadge: {
    backgroundColor: Accents.green.tint,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  metBadgeText: {
    ...Typography.label,
    color: Accents.green.dark,
    fontWeight: '700',
  },
});
