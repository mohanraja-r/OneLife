import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AnimatedPressable from '../../components/AnimatedPressable';
import GradientRing from '../../components/GradientRing';
import PregnancyHeader from '../../components/pregnancy/PregnancyHeader';
import WeightChart, {
  WeightChartLegend,
} from '../../components/pregnancy/WeightChart';
import { ErrorNotice, LoadingState, MeasureSheet } from '../../components/ui';
import { WEIGHT_MEASURE } from '../../constants/measures';
import {
  Accents,
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Spacing,
  Typography,
  accentShadow,
} from '../../constants/theme';
import { formatShortDate, startOfToday, toDateString } from '../../services/dates';
import { errorMessage } from '../../services/errors';
import { summariseWeight, weekAndDayOn } from '../../services/pregnancy';
import { getPersonalDetails } from '../../services/profile';
import {
  PregnancyRecord,
  getPregnancy,
  logPregnancyEntry,
  setPrePregnancyWeight,
} from '../../services/women';

/** Which weight the open sheet is editing. */
type Editing = 'current' | 'baseline' | null;

/**
 * Weight Tracker — total gain against the recommended band, the chart, and the
 * readings behind it.
 *
 * The band is derived from pre-pregnancy BMI, so both the starting weight and
 * the profile height feed it. Without a height it falls back to the normal-BMI
 * range rather than showing nothing.
 */
export default function WeightScreen() {
  const [record, setRecord] = useState<PregnancyRecord | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const todayKey = toDateString(startOfToday());

  /** Loads the pregnancy record together with the height the BMI needs. */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [pregnancy, details] = await Promise.all([
        getPregnancy(),
        getPersonalDetails(),
      ]);
      setRecord(pregnancy);
      setHeightCm(details?.heightCm ?? null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your weight history.'));
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
    () => (record ? summariseWeight(record, heightCm) : null),
    [record, heightCm]
  );

  /** Saves a reading, then reloads so the chart and the band agree with it. */
  const save = async (metric: number) => {
    if (!record) return;
    try {
      if (editing === 'baseline') {
        await setPrePregnancyWeight(metric);
      } else {
        await logPregnancyEntry(todayKey, { weightKg: metric });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not save that weight.'));
    }
  };

  const recent = useMemo(
    () => (summary ? [...summary.points].reverse().slice(0, 5) : []),
    [summary]
  );

  return (
    <SafeAreaView style={styles.container}>
      <PregnancyHeader title="Weight Tracker" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ErrorNotice message={error} onRetry={() => void load()} />

        {loading || !record || !summary ? (
          <LoadingState color={Accents.pink.main} />
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: Motion.base }}>
            {/* ------------------------------------------------------ Hero */}
            <LinearGradient
              colors={Gradients.activity}
              start={Gradients.diagonal.start}
              end={Gradients.diagonal.end}
              style={styles.hero}>
              <View style={styles.heroMain}>
                <Text style={styles.heroLabel}>Total weight gain</Text>
                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue}>
                    {summary.gainKg === null
                      ? '—'
                      : `${summary.gainKg > 0 ? '+' : ''}${summary.gainKg}`}
                  </Text>
                  <Text style={styles.heroUnit}>kg</Text>
                </View>

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          summary.status === 'on-track'
                            ? Accents.green.main
                            : summary.status === 'unknown'
                              ? Colors.onPrimaryMuted
                              : Accents.amber.main,
                      },
                    ]}
                  />
                  <Text style={styles.statusLabel}>{summary.statusLabel}</Text>
                </View>

                <View style={styles.heroDivider} />
                <Text style={styles.heroFootLabel}>Recommended total gain</Text>
                <Text style={styles.heroFootValue}>
                  {summary.recommendedMinKg} – {summary.recommendedMaxKg} kg
                </Text>
              </View>

              <GradientRing
                size={82}
                thickness={8}
                progress={summary.progress}
                colors={[Colors.onPrimary, Colors.onPrimary]}
                trackColor={Colors.onPrimaryFaint}>
                <Text style={styles.ringValue}>
                  {Math.round(summary.progress * 100)}%
                </Text>
                <Text style={styles.ringLabel}>of goal</Text>
              </GradientRing>
            </LinearGradient>

            {/* ----------------------------------------------------- Chart */}
            <Text style={styles.sectionTitle}>Weight progress</Text>

            <View
              style={styles.chartCard}
              onLayout={(event: LayoutChangeEvent) =>
                setChartWidth(event.nativeEvent.layout.width - Spacing.lg * 2)
              }>
              <WeightChartLegend />
              {chartWidth > 0 && (
                <WeightChart
                  points={summary.points}
                  band={summary.band}
                  width={chartWidth}
                />
              )}
              {summary.points.length === 0 && (
                <Text style={styles.chartEmpty}>
                  No weights logged yet. Add one to start the chart.
                </Text>
              )}
            </View>

            {/* ----------------------------------------------------- Stats */}
            <View style={styles.statsRow}>
              <AnimatedPressable
                onPress={() => setEditing('baseline')}
                style={styles.stat}>
                <Text style={styles.statLabel}>Pre-pregnancy</Text>
                <Text style={styles.statValue}>
                  {summary.prePregnancyKg === null
                    ? 'Set'
                    : `${summary.prePregnancyKg} kg`}
                </Text>
              </AnimatedPressable>

              <View style={styles.statDivider} />

              <View style={styles.stat}>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.statValue}>
                  {summary.currentKg === null ? '—' : `${summary.currentKg} kg`}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.stat}>
                <Text style={styles.statLabel}>Goal</Text>
                <Text style={styles.statValue}>
                  {summary.goalKg === null ? '—' : `${summary.goalKg} kg`}
                </Text>
              </View>
            </View>

            {summary.prePregnancyKg === null && (
              <Text style={styles.baselineHint}>
                Set your pre-pregnancy weight to see your gain and the
                recommended range for your BMI.
              </Text>
            )}

            {/* ----------------------------------------------- Recent logs */}
            {recent.length > 0 && (
              <View style={styles.logsCard}>
                <Text style={styles.logsTitle}>Recent logs</Text>
                {recent.map((point) => {
                  const { week, day } = weekAndDayOn(record.dueDate, point.date);
                  return (
                    <View key={point.date} style={styles.logRow}>
                      <View style={styles.logDot} />
                      <Text style={styles.logDate}>
                        {point.date === todayKey
                          ? 'Today'
                          : formatShortDate(point.date)}
                        , {week}w {day}d
                      </Text>
                      <Text style={styles.logValue}>{point.weightKg} kg</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <AnimatedPressable
              onPress={() => setEditing('current')}
              style={[styles.cta, accentShadow(Accents.violet.main)]}>
              <Plus size={18} color={Colors.textInverse} strokeWidth={2.4} />
              <Text style={styles.ctaText}>Log weight</Text>
            </AnimatedPressable>

            <Text style={styles.footnote}>
              The recommended range comes from standard guidance for a single
              baby and is not advice for your pregnancy. Your doctor&apos;s
              guidance is what counts.
            </Text>
          </MotiView>
        )}
      </ScrollView>

      <MeasureSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        measure={WEIGHT_MEASURE}
        value={
          editing === 'baseline'
            ? (summary?.prePregnancyKg ?? null)
            : (summary?.currentKg ?? null)
        }
        unit="kg"
        accent={Accents.pink}
        onSave={(metric) => void save(metric)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.navClearance,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    ...Shadow.glow,
  },
  heroMain: { flex: 1 },
  heroLabel: { ...Typography.label, color: Colors.onPrimaryMuted },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    color: Colors.onPrimary,
  },
  heroUnit: { ...Typography.unit, color: Colors.onPrimaryMuted },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusDot: { width: 7, height: 7, borderRadius: Radius.round },
  statusLabel: { ...Typography.label, color: Colors.onPrimary },
  heroDivider: {
    height: 1,
    backgroundColor: Colors.onPrimaryFaint,
    marginVertical: Spacing.md,
  },
  heroFootLabel: { ...Typography.label, color: Colors.onPrimaryMuted },
  heroFootValue: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
    marginTop: 2,
  },
  ringValue: {
    ...Typography.metricValue,
    fontSize: 18,
    color: Colors.onPrimary,
  },
  ringLabel: { ...Typography.label, fontSize: 9, color: Colors.onPrimaryMuted },
  sectionTitle: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  chartEmpty: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { ...Typography.label, color: Colors.textSecondary },
  statValue: {
    ...Typography.metricValue,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  baselineHint: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    lineHeight: 17,
  },
  logsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.card,
  },
  logsTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.main,
  },
  logDate: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  logValue: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Accents.violet.main,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  ctaText: { ...Typography.button, color: Colors.textInverse },
  footnote: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    lineHeight: 17,
  },
});
