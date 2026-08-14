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
import ProgressRing from '../../components/ProgressRing';
import { ErrorNotice, LoadingState } from '../../components/ui';
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

/** Diameter of the steps ring. */
const STEP_RING = 172;
/** Rendered width of the water droplet gauge. */
const DROPLET_SIZE = 172;

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
 * the user sets: the steps ring on top, the water droplet below it.
 *
 * The date pill governs the whole screen rather than either section, so both
 * metrics always describe the same day. Every read and write is keyed on that
 * date instead of assuming today.
 *
 * Steps are entered by hand: there is no pedometer or device sync yet, so the
 * number is whatever the user last typed in.
 */
export default function HealthScreen() {
  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [entry, setEntry] = useState<HealthEntry>(EMPTY_ENTRY);
  const [goals, setGoals] = useState<HealthGoals>(EMPTY_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HealthField | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateKey = toDateString(selectedDate);
  const isToday = dateKey === toDateString(startOfToday());

  /** Loads the selected day's entry alongside the user's goals. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [dayEntry, targets] = await Promise.all([
        getHealthEntry(dateKey),
        getHealthGoals(),
      ]);
      setEntry(dayEntry);
      setGoals(targets);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your health data.'));
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(() => summariseHealth(entry, goals), [entry, goals]);
  const logged = splitWater(entry.waterMl);

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
      if (field === 'steps') {
        setEntry(await setSteps(value, dateKey));
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
      case 'steps':
        return entry.steps;
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

              <TouchableOpacity
                style={styles.ringWrap}
                onPress={() => setEditing('steps')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${formatSteps(entry.steps)} of ${formatSteps(
                  goals.stepGoal
                )} steps. Tap to edit.`}>
                <ProgressRing
                  size={STEP_RING}
                  thickness={15}
                  progress={summary.stepProgress}
                  color={Accents.green.main}>
                  <Text style={styles.ringValue}>
                    {formatSteps(entry.steps)}
                  </Text>
                  <Text style={styles.ringUnit}>
                    of {formatSteps(goals.stepGoal)} steps
                  </Text>
                  <Text
                    style={[styles.ringPercent, { color: Accents.green.main }]}>
                    {summary.stepPercent}%
                  </Text>
                </ProgressRing>
              </TouchableOpacity>

              <Text style={styles.cardFooter}>
                {summary.stepsRemaining > 0
                  ? `${formatSteps(summary.stepsRemaining)} steps to go`
                  : 'Step goal reached — nice work'}
              </Text>

              <TouchableOpacity
                style={styles.action}
                onPress={() => setEditing('steps')}
                accessibilityRole="button">
                <Text style={styles.actionLabel}>Enter step count</Text>
              </TouchableOpacity>
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
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
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
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconTile: {
    width: 36,
    height: 36,
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
  ringWrap: { alignSelf: 'center', marginVertical: Spacing.sm },
  ringValue: { ...Typography.largeNumber, fontSize: 34, color: Colors.textPrimary },
  ringUnit: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  ringPercent: {
    ...Typography.caption,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  dropletWrap: { alignItems: 'center' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amountValue: {
    ...Typography.largeNumber,
    fontSize: 36,
    color: Colors.textPrimary,
  },
  amountUnit: {
    ...Typography.unit,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingBottom: Spacing.sm,
  },
  amountGoal: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  amountPercent: {
    ...Typography.cardTitle,
    fontWeight: '700',
    color: Colors.hydration,
    marginTop: Spacing.xs,
  },
  cardFooter: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  action: {
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  actionLabel: {
    ...Typography.optionLabel,
    color: Colors.textPrimary,
  },
  addButtonWrap: { marginTop: Spacing.lg },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.round,
    paddingVertical: Spacing.lg,
    ...Shadow.glow,
  },
  addLabel: {
    ...Typography.button,
    color: Colors.textInverse,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
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
