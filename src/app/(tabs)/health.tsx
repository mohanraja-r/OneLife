import { useFocusEffect, useRouter } from 'expo-router';
import {
  ChevronRight,
  Droplets,
  Footprints,
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

import FloatingNav from '../../components/FloatingNav';
import HealthValueSheet, {
  HealthField,
} from '../../components/HealthValueSheet';
import ProgressRing from '../../components/ProgressRing';
import { ErrorNotice, LoadingState } from '../../components/ui';
import {
  Accents,
  Colors,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';
import { errorMessage } from '../../services/errors';
import {
  DEFAULT_STEP_GOAL,
  DEFAULT_WATER_GOAL_ML,
  HealthEntry,
  HealthGoals,
  formatSteps,
  formatWater,
  getTodayHealth,
  setHealthGoals,
  setSteps,
  summariseHealth,
} from '../../services/health';

/** Diameter of the hero steps ring. */
const STEP_RING = 190;
/** Diameter of the water card's smaller ring. */
const WATER_RING = 84;

/** The entry shown before the first load resolves. */
const EMPTY_ENTRY: HealthEntry = { date: '', steps: 0, waterMl: 0 };
const EMPTY_GOALS: HealthGoals = {
  stepGoal: DEFAULT_STEP_GOAL,
  waterGoalMl: DEFAULT_WATER_GOAL_ML,
};

/**
 * Health — today's step count and water intake, each scored against a goal the
 * user sets, with the step ring as the screen's headline visual.
 *
 * Steps are entered by hand: there is no pedometer or device sync yet, so the
 * number is whatever the user last typed in.
 */
export default function HealthScreen() {
  const router = useRouter();
  const [entry, setEntry] = useState<HealthEntry>(EMPTY_ENTRY);
  const [goals, setGoals] = useState<HealthGoals>(EMPTY_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HealthField | null>(null);

  /** Loads today's entry and the user's goals together. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const { entry: today, goals: targets } = await getTodayHealth();
      setEntry(today);
      setGoals(targets);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your health data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const summary = useMemo(
    () => summariseHealth(entry, goals),
    [entry, goals]
  );

  /** Reports a failed write and reloads, so the screen never shows a lie. */
  const reportFailure = (err: unknown, fallback: string) => {
    Alert.alert('Could not save', errorMessage(err, fallback));
    void load();
  };

  /** Saves whichever number the sheet was editing. */
  const saveField = async (field: HealthField, value: number) => {
    try {
      if (field === 'steps') {
        setEntry(await setSteps(value));
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
        <Text style={styles.subtitle}>Today at a glance</Text>

        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading ? (
          <LoadingState color={Accents.green.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* Steps — the hero ring */}
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
                  thickness={16}
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
                <Text style={styles.actionLabel}>Enter today&apos;s steps</Text>
              </TouchableOpacity>
            </View>

            {/* Water — ring plus the drag track */}
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

              {/* Logging lives on the dedicated water screen, so this is a
                  read-only summary that opens it. */}
              <TouchableOpacity
                style={styles.waterRow}
                onPress={() => router.push('/water')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${formatWater(entry.waterMl)} of ${formatWater(
                  goals.waterGoalMl
                )} water. Open water tracking.`}>
                <ProgressRing
                  size={WATER_RING}
                  thickness={10}
                  progress={summary.waterProgress}
                  color={Colors.hydration}>
                  <Text
                    style={[
                      styles.waterPercent,
                      { color: Colors.hydration },
                    ]}>
                    {summary.waterPercent}%
                  </Text>
                </ProgressRing>

                <View style={styles.waterReadout}>
                  <Text style={styles.waterValue}>
                    {formatWater(entry.waterMl)}
                  </Text>
                  <Text style={styles.waterGoal}>
                    of {formatWater(goals.waterGoalMl)}
                  </Text>
                  <Text style={styles.waterGlasses}>
                    {summary.glasses} of {summary.goalGlasses} glasses
                  </Text>
                </View>

                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.cardFooter}>
                {summary.waterRemainingMl > 0
                  ? `${formatWater(summary.waterRemainingMl)} left to drink`
                  : 'Water goal reached — well hydrated'}
              </Text>
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
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
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
  ringValue: { ...Typography.largeNumber, color: Colors.textPrimary },
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
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  waterPercent: { ...Typography.metricValue },
  waterReadout: { flex: 1 },
  waterValue: { ...Typography.displayNumber, fontSize: 32, lineHeight: 38, color: Colors.textPrimary },
  waterGoal: { ...Typography.secondary, color: Colors.textSecondary },
  waterGlasses: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
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
