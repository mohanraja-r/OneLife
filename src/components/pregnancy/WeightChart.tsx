import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';

import { Accents, Colors, Spacing, Typography } from '../../constants/theme';
import type { GainBand, WeightPoint } from '../../services/pregnancy';

/** Weeks the x-axis spans — a full term. */
const MAX_WEEK = 40;
/** Gridline weeks, matching the reference design's axis. */
const X_TICKS = [0, 10, 13, 20, 27, 30, 40];

interface Props {
  points: WeightPoint[];
  band: GainBand[];
  /** Chart width in points — pass the measured container width. */
  width: number;
  height?: number;
}

/** Left gutter for the y-axis labels. */
const PAD_LEFT = 26;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
/** Bottom gutter for the x-axis labels. */
const PAD_BOTTOM = 26;

/**
 * The weight-gain chart: logged readings drawn over the recommended range.
 *
 * The band is the point of the chart. A single line of numbers cannot say
 * whether a gain is normal, whereas a line sitting inside a shaded range says
 * it at a glance — and says it without ever printing a verdict.
 */
export default function WeightChart({ points, band, width, height = 220 }: Props): JSX.Element {
  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  // Only readings with a known gain can be plotted — a reading taken before a
  // baseline exists has no vertical position on this axis.
  const plotted = points.filter(
    (point): point is WeightPoint & { gainKg: number } => point.gainKg !== null
  );

  // The y-axis has to clear both the band and anything logged above it, so a
  // gain outside the recommended range is still drawn rather than clipped.
  const maxBand = band.length ? band[band.length - 1].maxKg : 16;
  const maxPoint = plotted.reduce((top, point) => Math.max(top, point.gainKg), 0);
  const yMax = Math.max(4, Math.ceil(Math.max(maxBand, maxPoint) / 4) * 4);

  /** Horizontal position for a gestational week. */
  const x = (week: number) => PAD_LEFT + (week / MAX_WEEK) * plotWidth;
  /** Vertical position for a gain in kilograms, measured from the baseline. */
  const y = (kg: number) => PAD_TOP + plotHeight - (kg / yMax) * plotHeight;

  // The band is one closed shape: along the top edge, then back along the
  // bottom. Drawing it as two lines with a fill between them is not something
  // SVG offers directly.
  const bandPath = band.length
    ? [
        `M ${x(band[0].week)} ${y(band[0].maxKg)}`,
        ...band.slice(1).map((entry) => `L ${x(entry.week)} ${y(entry.maxKg)}`),
        ...[...band]
          .reverse()
          .map((entry) => `L ${x(entry.week)} ${y(entry.minKg)}`),
        'Z',
      ].join(' ')
    : '';

  const linePoints = plotted
    .map((point) => `${x(point.week)},${y(point.gainKg)}`)
    .join(' ');

  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];
  const latest = plotted[plotted.length - 1] ?? null;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Horizontal gridlines, one per y-axis label. */}
        {yTicks.map((tick) => (
          <Line
            key={`grid-${tick}`}
            x1={PAD_LEFT}
            y1={y(tick)}
            x2={width - PAD_RIGHT}
            y2={y(tick)}
            stroke={Colors.border}
            strokeWidth={1}
          />
        ))}

        {yTicks.map((tick) => (
          <SvgText
            key={`ylabel-${tick}`}
            x={PAD_LEFT - 6}
            y={y(tick) + 3}
            fontSize={9}
            fill={Colors.textMuted}
            textAnchor="end">
            {Math.round(tick)}
          </SvgText>
        ))}

        {!!bandPath && (
          <Path d={bandPath} fill={Accents.pink.tint} opacity={0.9} />
        )}

        {/* The upper edge of the band, dashed — the "target" line. */}
        {band.length > 0 && (
          <Polyline
            points={band
              .map((entry) => `${x(entry.week)},${y(entry.maxKg)}`)
              .join(' ')}
            fill="none"
            stroke={Accents.pink.main}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        )}

        {plotted.length > 1 && (
          <Polyline
            points={linePoints}
            fill="none"
            stroke={Accents.pink.main}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {plotted.map((point) => (
          <Circle
            key={point.date}
            cx={x(point.week)}
            cy={y(point.gainKg)}
            r={3}
            fill={Accents.pink.main}
          />
        ))}

        {/* The latest reading gets a ring so the eye lands on it first. */}
        {latest && (
          <Circle
            cx={x(latest.week)}
            cy={y(latest.gainKg)}
            r={5.5}
            fill={Colors.surface}
            stroke={Accents.pink.main}
            strokeWidth={2.5}
          />
        )}

        {X_TICKS.map((week) => (
          <SvgText
            key={`xlabel-${week}`}
            x={x(week)}
            y={height - 8}
            fontSize={9}
            fill={Colors.textMuted}
            textAnchor="middle">
            {week}
          </SvgText>
        ))}
      </Svg>

      <Text style={styles.axisLabel}>Weeks</Text>
    </View>
  );
}

/** The colour key beneath the chart. */
export function WeightChartLegend(): JSX.Element {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendLine, { backgroundColor: Accents.pink.main }]} />
        <Text style={styles.legendLabel}>You</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: Accents.pink.tint }]} />
        <Text style={styles.legendLabel}>Recommended range</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendLine: { width: 14, height: 2.5, borderRadius: 2 },
  legendSwatch: { width: 14, height: 10, borderRadius: 3 },
  legendLabel: { ...Typography.label, fontSize: 11, color: Colors.textSecondary },
});
