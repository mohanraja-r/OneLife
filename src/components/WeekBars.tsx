import { StyleSheet, Text, View } from 'react-native';

import { Accents, Colors, Radius, Spacing, Typography } from '../constants/theme';
import { WeekChart, formatSteps } from '../services/health';

/** Height of the plot area, above the weekday labels. */
const PLOT_HEIGHT = 78;
const BAR_WIDTH = 9;

interface Props {
  chart: WeekChart;
}

/** Formats an axis value compactly, e.g. `12K`. */
function axisLabel(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

/**
 * The seven-day steps chart on the Steps card: one bar per day against a
 * gridded axis, with the viewed day picked out and the week's best day
 * carrying a callout.
 */
export default function WeekBars({ chart }: Props) {
  const { bars, ceiling, peak } = chart;

  return (
    <View style={styles.container}>
      {/* Axis: top, middle and zero, matching the three gridlines. */}
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>{axisLabel(ceiling)}</Text>
        <Text style={styles.axisLabel}>{axisLabel(ceiling / 2)}</Text>
        <Text style={styles.axisLabel}>0</Text>
      </View>

      <View style={styles.plotArea}>
        <View style={styles.gridlines} pointerEvents="none">
          <View style={styles.gridline} />
          <View style={styles.gridline} />
          <View style={styles.gridline} />
        </View>

        <View style={styles.bars}>
          {bars.map((bar) => {
            const isPeak = peak !== null && bar.date === peak.date;
            return (
              <View key={bar.date} style={styles.column}>
                {/* Reserved whether or not it is shown, so the bar heights are
                    measured against the same baseline in every column. */}
                <View style={styles.calloutSlot}>
                  {isPeak && (
                    <View style={styles.callout}>
                      <Text style={styles.calloutText}>
                        {formatSteps(bar.steps)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(bar.height * PLOT_HEIGHT, 3),
                        backgroundColor: bar.current
                          ? Accents.violet.main
                          : Colors.primaryTint,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.dayLabel,
                    bar.current && styles.dayLabelCurrent,
                  ]}>
                  {bar.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: Spacing.sm },
  axis: {
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    // Lines up the axis numbers with the gridlines rather than the callouts.
    marginTop: 18,
  },
  axisLabel: {
    ...Typography.label,
    fontSize: 9,
    lineHeight: 10,
    color: Colors.textMuted,
  },
  plotArea: { flex: 1 },
  gridlines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
  },
  gridline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  bars: { flexDirection: 'row' },
  column: { flex: 1, alignItems: 'center' },
  calloutSlot: { height: 18, justifyContent: 'center' },
  callout: {
    backgroundColor: Accents.violet.main,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs + 1,
    paddingVertical: 1,
  },
  calloutText: {
    ...Typography.label,
    fontSize: 9,
    lineHeight: 12,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  track: { height: PLOT_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: Radius.round },
  dayLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  dayLabelCurrent: { color: Accents.violet.main, fontWeight: '700' },
});
