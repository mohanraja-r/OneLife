import { CalendarHeart, Droplet } from 'lucide-react-native';
import { MotiView } from 'moti';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { formatShortDate } from '../../services/dates';
import type { CycleEntry, CyclePhase, CycleSummary } from '../../services/women';
import AnimatedPressable from '../AnimatedPressable';
import ProgressRing from '../ProgressRing';
import Sparkline from '../Sparkline';

import { CYCLE_LOGS, LogKind } from './LogSheet';
import { Disclaimer, LogRow, SectionHeader, StatLine, cardStyles } from './shared';

/** Droplets drawn in the "Average flow" row. */
const FLOW_DROPLETS = 5;

/** The colour each phase is picked out in, on the phases card and the trends. */
const PHASE_ACCENT: Record<CyclePhase, Accent> = {
  period: Accents.pink,
  follicular: Accents.violet,
  ovulation: Accents.rose,
  luteal: Accents.amber,
};

interface TrendCard {
  key: string;
  title: string;
  values: number[];
  unit: string;
  accent: Accent;
}

interface Props {
  summary: CycleSummary;
  /** Today's entry, so the log tiles can show what is already recorded. */
  today: CycleEntry | null;
  onPickLog: (kind: LogKind) => void;
  /** Opens the full history — the "See all" / "See insights" links. */
  onSeeAll: () => void;
}

/** Renders a series' span as `26 - 29 days`, or an em dash when it is empty. */
function rangeLabel(values: number[], unit: string): string {
  if (values.length === 0) return '—';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min} ${unit}` : `${min} - ${max} ${unit}`;
}

/** Which log tiles already hold a value for today. */
function loggedKinds(today: CycleEntry | null): Set<LogKind> {
  const done = new Set<LogKind>();
  if (!today) return done;
  if (today.flow) done.add('flow');
  if (today.symptoms.length) done.add('symptoms');
  if (today.mood) done.add('mood');
  if (today.bbt !== null) done.add('bbt');
  if (today.ovulationTest) done.add('ovulation');
  return done;
}

/**
 * The Cycle tab: where the user is in their cycle today, what they can log,
 * this month's numbers, the phase calendar and the long-run trends.
 */
export default function CyclePanel({
  summary,
  today,
  onPickLog,
  onSeeAll,
}: Props) {
  const {
    hasData,
    cycleDay,
    phaseLabel,
    averageCycleLength,
    averagePeriodLength,
    lastPeriod,
    daysUntilNextPeriod,
    averageFlow,
    pmsDays,
    phases,
    fertilityBars,
    trends,
  } = summary;

  // Past the predicted date the countdown flips into a "late" reading rather
  // than showing a negative number of days.
  const nextPeriodLine =
    daysUntilNextPeriod > 1
      ? `Next period expected in ${daysUntilNextPeriod} days`
      : daysUntilNextPeriod === 1
        ? 'Next period expected tomorrow'
        : daysUntilNextPeriod === 0
          ? 'Next period expected today'
          : `Period is ${Math.abs(daysUntilNextPeriod)} days late`;

  const trendCards: TrendCard[] = [
    {
      key: 'cycle',
      title: 'Cycle length',
      values: trends.cycleLengths,
      unit: 'days',
      accent: Accents.violet,
    },
    {
      key: 'period',
      title: 'Period length',
      values: trends.periodLengths,
      unit: 'days',
      accent: Accents.pink,
    },
    {
      key: 'ovulation',
      title: 'Ovulation day',
      values: trends.ovulationDays,
      unit: '',
      accent: Accents.blue,
    },
    {
      key: 'pms',
      title: 'PMS days',
      values: trends.pmsDays,
      unit: 'days',
      accent: Accents.amber,
    },
  ];

  // Everything below is anchored to the last logged period. Without one there
  // is no cycle to be on day N of, so the hero asks for that first rather than
  // presenting a default 28-day cycle as if it were the user's own.
  if (!hasData) {
    return (
      <View>
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={styles.emptyCard}>
          <View style={styles.emptyTile}>
            <CalendarHeart
              size={28}
              color={Accents.pink.main}
              strokeWidth={1.8}
            />
          </View>
          <Text style={styles.emptyTitle}>Start tracking your cycle</Text>
          <Text style={styles.emptyBody}>
            Log your flow on a period day and we&apos;ll work out your cycle
            day, fertile window and next period from there. Predictions sharpen
            with every cycle you log.
          </Text>
        </MotiView>

        <SectionHeader title="Log today" />
        <LogRow
          kinds={CYCLE_LOGS}
          logged={loggedKinds(today)}
          onPick={onPickLog}
        />

        <Disclaimer text="Predictions are estimates based on your logged data, not medical advice. Consult a doctor for fertility or health concerns." />
      </View>
    );
  }

  return (
    <View>
      <View style={cardStyles.row}>
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.slow }}
          style={styles.heroCard}>
          <Text style={styles.heroLabel}>CYCLE DAY</Text>
          <Text style={styles.heroValue}>{cycleDay}</Text>
          <Text style={styles.heroPhase}>{phaseLabel}</Text>

          {/* Fertility across the cycle: the darkest bars are the fertile
              window, and the caret marks where today sits. */}
          <View style={styles.bars}>
            {fertilityBars.map((bar, index) => (
              <View key={index} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: Accents.pink.main,
                      opacity: bar.intensity,
                    },
                  ]}
                />
                {bar.current && <View style={styles.caret} />}
              </View>
            ))}
          </View>

          <Text style={styles.heroFooter}>{nextPeriodLine}</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: Motion.slow, delay: 60 }}
          style={styles.ringCard}>
          <ProgressRing
            size={78}
            thickness={7}
            // The ring reads as "how far through this cycle you are".
            progress={cycleDay / averageCycleLength}
            color={Accents.pink.main}
            trackColor={Accents.pink.tint}>
            <Text style={styles.ringValue}>{averageCycleLength}</Text>
            <Text style={styles.ringUnit}>days</Text>
          </ProgressRing>
          <Text style={styles.ringCaption}>Avg cycle length</Text>
          <Text style={styles.ringNumber}>{averageCycleLength} days</Text>
        </MotiView>
      </View>

      <SectionHeader title="Log today" actionLabel="See all" onAction={onSeeAll} />
      <LogRow kinds={CYCLE_LOGS} logged={loggedKinds(today)} onPick={onPickLog} />

      <View style={[cardStyles.row, styles.summaryRow]}>
        <View style={[cardStyles.card, cardStyles.column]}>
          <View style={cardStyles.cardHeader}>
            <Text style={cardStyles.cardTitle}>This month</Text>
            <AnimatedPressable onPress={onSeeAll}>
              <Text style={cardStyles.cardAction}>See insights</Text>
            </AnimatedPressable>
          </View>

          <StatLine label="Avg cycle length" value={`${averageCycleLength} days`} />
          <StatLine
            label="Last period"
            value={
              lastPeriod
                ? `${formatShortDate(lastPeriod.start)} – ${formatShortDate(lastPeriod.end)}`
                : '—'
            }
          />
          <StatLine label="Average flow">
            <View style={styles.droplets}>
              {Array.from({ length: FLOW_DROPLETS }, (_, index) => (
                <Droplet
                  key={index}
                  size={12}
                  strokeWidth={0}
                  color={
                    index < averageFlow ? Accents.rose.main : Accents.rose.tint
                  }
                  fill={
                    index < averageFlow ? Accents.rose.main : Accents.rose.tint
                  }
                />
              ))}
            </View>
          </StatLine>
          <StatLine label="PMS days" value={`${pmsDays} days`} />
        </View>

        <View style={[cardStyles.card, cardStyles.column]}>
          <View style={cardStyles.cardHeader}>
            <Text style={cardStyles.cardTitle}>Cycle phases</Text>
            <AnimatedPressable onPress={onSeeAll}>
              <Text style={cardStyles.cardAction}>See calendar</Text>
            </AnimatedPressable>
          </View>

          {phases.map((span) => (
            <View key={span.phase} style={styles.phaseRow}>
              <View
                style={[
                  styles.phaseDot,
                  { backgroundColor: PHASE_ACCENT[span.phase].main },
                ]}
              />
              <Text style={styles.phaseName} numberOfLines={1}>
                {span.label}
              </Text>
              <Text style={styles.phaseDates} numberOfLines={1}>
                {formatShortDate(span.start)} – {formatShortDate(span.end)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <SectionHeader title="Trends" actionLabel="See all" onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendRow}>
        {trendCards.map((card) => (
          <View key={card.key} style={[cardStyles.card, styles.trendCard]}>
            <Text style={styles.trendTitle} numberOfLines={1}>
              {card.title}
            </Text>
            <Text style={styles.trendRange} numberOfLines={1}>
              {rangeLabel(card.values, card.unit)}
            </Text>
            {card.values.length > 1 ? (
              <Sparkline
                values={card.values}
                width={104}
                height={34}
                color={card.accent.main}
              />
            ) : (
              <View style={styles.trendEmpty}>
                <Text style={styles.trendEmptyText}>
                  Log a few cycles to see this
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Period length is measured, not predicted, so it is worth saying which
          of these numbers came from the user and which the app estimated. */}
      <View style={styles.footnoteRow}>
        <CalendarHeart size={14} color={Colors.textMuted} strokeWidth={2} />
        <Text style={styles.footnote}>
          Based on a {averageCycleLength}-day cycle and a{' '}
          {averagePeriodLength}-day period.
        </Text>
      </View>

      <Disclaimer text="Predictions are estimates based on your logged data, not medical advice. Consult a doctor for fertility or health concerns." />
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flex: 2.1,
    backgroundColor: Accents.pink.tint,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.card,
  },
  heroLabel: {
    ...Typography.label,
    letterSpacing: 0.8,
    color: Accents.pink.dark,
  },
  heroValue: {
    ...Typography.displayNumber,
    color: Accents.pink.dark,
    marginTop: Spacing.xs,
  },
  heroPhase: {
    ...Typography.caption,
    color: Accents.pink.dark,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  bars: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  barColumn: { alignItems: 'center', gap: 3 },
  bar: { width: 12, height: 4, borderRadius: Radius.round },
  caret: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Accents.pink.dark,
  },
  heroFooter: {
    ...Typography.caption,
    color: Accents.pink.dark,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  ringCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  ringValue: {
    ...Typography.scoreValue,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  ringUnit: { ...Typography.label, color: Colors.textSecondary },
  ringCaption: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  ringNumber: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  summaryRow: { marginTop: Spacing.xxl },
  droplets: { flexDirection: 'row', gap: 2 },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  phaseDot: { width: 8, height: 8, borderRadius: Radius.round },
  phaseName: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
  phaseDates: { ...Typography.label, color: Colors.textSecondary },
  trendRow: { gap: Spacing.md, paddingRight: Spacing.screen },
  trendCard: { width: 140, gap: Spacing.xs },
  trendTitle: { ...Typography.label, color: Colors.textSecondary },
  trendRange: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  trendEmpty: { height: 34, justifyContent: 'center' },
  trendEmptyText: { ...Typography.label, color: Colors.textMuted },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  footnote: { ...Typography.label, color: Colors.textMuted, flex: 1 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  emptyTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Accents.pink.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Typography.cardTitle, color: Colors.textPrimary },
  emptyBody: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
