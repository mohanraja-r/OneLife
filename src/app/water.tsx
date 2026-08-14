import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, ChevronLeft, Plus } from 'lucide-react-native';
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

import CalendarSheet from '../components/CalendarSheet';
import HealthValueSheet, { HealthField } from '../components/HealthValueSheet';
import { ErrorNotice, LoadingState } from '../components/ui';
import WaterDroplet from '../components/WaterDroplet';
import {
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';
import { startOfToday, toDateString } from '../services/dates';
import { errorMessage } from '../services/errors';
import {
  DEFAULT_WATER_GOAL_ML,
  HealthEntry,
  HealthGoals,
  formatWater,
  getHealthEntry,
  getHealthGoals,
  setWaterMl,
  splitWater,
  summariseHealth,
} from '../services/health';

/** The amounts the quick-add row offers, in millilitres. */
const QUICK_ADDS = [250, 500, 750, 1000];

/** Rendered width of the droplet gauge. */
const DROPLET_SIZE = 208;

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
 * Water — the droplet gauge for one day's intake, with a quick-add row and a
 * custom amount sheet.
 *
 * Reached from the Water card on the Health tab. The date pill opens the shared
 * month calendar, so past days can be reviewed and corrected; every read and
 * write below is keyed on the selected day rather than assuming today.
 */
export default function WaterScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(() => startOfToday());
  const [entry, setEntry] = useState<HealthEntry>({
    date: '',
    steps: 0,
    waterMl: 0,
  });
  const [goals, setGoals] = useState<HealthGoals>({
    stepGoal: 0,
    waterGoalMl: DEFAULT_WATER_GOAL_ML,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editing, setEditing] = useState<HealthField | null>(null);

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
      setError(errorMessage(err, 'Could not load your water intake.'));
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(
    () => summariseHealth(entry, goals),
    [entry, goals]
  );

  const logged = splitWater(entry.waterMl);

  /**
   * Adds to the running total and saves it.
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

  /** Applies the amount typed into the custom-amount sheet. */
  const saveField = (field: HealthField, value: number) => {
    if (field === 'addWater') void addWater(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* The pill is centred on the screen, so the back button is layered
            over the row rather than sharing its width. */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

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
          <LoadingState color={Colors.hydration} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
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

            <Text style={styles.remaining}>
              {summary.waterRemainingMl > 0
                ? `${formatWater(summary.waterRemainingMl)} left${isToday ? ' today' : ''}`
                : 'Goal reached — well hydrated'}
            </Text>

            <TouchableOpacity
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
          </MotiView>
        )}
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
        initialValue={0}
        onClose={() => setEditing(null)}
        onSave={saveField}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    minHeight: 44,
  },
  back: {
    position: 'absolute',
    left: 0,
    padding: Spacing.xs,
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
  dropletWrap: { alignItems: 'center', marginTop: Spacing.sm },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amountValue: {
    ...Typography.displayNumber,
    color: Colors.textPrimary,
  },
  amountUnit: {
    ...Typography.unit,
    color: Colors.textPrimary,
    paddingBottom: Spacing.sm,
  },
  amountGoal: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  amountPercent: {
    ...Typography.cardTitle,
    fontWeight: '700',
    color: Colors.hydration,
    marginTop: Spacing.sm,
  },
  remaining: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
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
    marginTop: Spacing.lg,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    ...Shadow.card,
  },
  quickLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
