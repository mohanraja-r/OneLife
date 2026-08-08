import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Accent, Colors, Radius, Typography } from '../constants/theme';

// Geometry of the scale. One tick per `step`, five points apart, with the
// selected value pinned to the vertical centre of the viewport.
const TICK_GAP = 5;
const RULER_HEIGHT = 200;
const LABEL_WIDTH = 34;
const LABEL_HEIGHT = 18;
const LABEL_GAP = 4;
const TICK_COLUMN = 18;
/** Horizontal offset of the vertical rail the ticks hang off. */
const RAIL_X = LABEL_WIDTH + LABEL_GAP + TICK_COLUMN;
const MAJOR_TICK = 16;
const MAJOR_THICKNESS = 2;
const MINOR_TICK = 9;
const MINOR_THICKNESS = 1.5;
const HIGHLIGHT_LENGTH = 44;
const DOT_SIZE = 12;
const FADE_HEIGHT = 44;
/** Slack above and below the scale so edge labels are never clipped. */
const EDGE = LABEL_HEIGHT;

export interface RulerPickerProps {
  /** Smallest selectable value. */
  min: number;
  /** Largest selectable value, drawn at the top of the scale. */
  max: number;
  /** Value increment between adjacent ticks. */
  step: number;
  /** Number of ticks between two labelled major ticks. */
  majorEvery: number;
  value: number;
  accent: Accent;
  onChange: (value: number) => void;
  /** Renders the text beside a major tick; defaults to the raw number. */
  formatLabel?: (value: number) => string;
  /** Renders the highlighted value beside the selection dot. */
  formatValue?: (value: number) => string;
  accessibilityLabel?: string;
}

/** Rounds a value onto the nearest step and trims binary-float drift. */
function snapToStep(value: number, step: number) {
  return Number((Math.round(value / step) * step).toFixed(4));
}

/**
 * Vertical measuring-tape picker: the user drags the scale and the value under
 * the centre line is selected, so no keyboard is ever involved.
 */
function RulerPicker({
  min,
  max,
  step,
  majorEvery,
  value,
  accent,
  onChange,
  formatLabel,
  formatValue,
  accessibilityLabel,
}: RulerPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const didInitialScroll = useRef(false);
  const lastReported = useRef(value);

  const tickCount = Math.round((max - min) / step) + 1;
  const scaleHeight = tickCount * TICK_GAP + EDGE * 2;

  /**
   * The scale is drawn once and never re-rendered while scrolling — only the
   * centre marker tracks the value, which keeps long scales smooth.
   */
  const scale = useMemo(() => {
    const marks = [];
    for (let i = 0; i < tickCount; i++) {
      // Ticks run high-to-low so the largest value sits at the top.
      const tickValue = snapToStep(max - i * step, step);
      const isMajor = i % majorEvery === 0;
      const thickness = isMajor ? MAJOR_THICKNESS : MINOR_THICKNESS;
      const centre = EDGE + i * TICK_GAP + TICK_GAP / 2;

      marks.push(
        <View
          key={`t${tickValue}`}
          style={[
            isMajor ? styles.tickMajor : styles.tickMinor,
            { top: centre - thickness / 2 },
          ]}
        />
      );

      if (isMajor) {
        marks.push(
          <Text
            key={`l${tickValue}`}
            numberOfLines={1}
            style={[styles.tickLabel, { top: centre - LABEL_HEIGHT / 2 }]}>
            {formatLabel ? formatLabel(tickValue) : String(tickValue)}
          </Text>
        );
      }
    }
    return marks;
  }, [tickCount, max, step, majorEvery, formatLabel]);

  /** Scroll offset that centres a given value under the selection line. */
  const offsetForValue = useCallback(
    (v: number) => ((max - v) / step) * TICK_GAP,
    [max, step]
  );

  /** Jumps the scale to the incoming value once the content has been measured. */
  const handleContentSizeChange = useCallback(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    scrollRef.current?.scrollTo({ y: offsetForValue(value), animated: false });
  }, [offsetForValue, value]);

  /** Maps the live scroll offset onto a stepped value and reports changes up. */
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / TICK_GAP);
      const next = Math.min(
        max,
        Math.max(min, snapToStep(max - index * step, step))
      );
      if (next === lastReported.current) return;
      lastReported.current = next;
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(next);
    },
    [min, max, step, onChange]
  );

  return (
    <View
      style={styles.viewport}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      // `now`/`min`/`max` cross the bridge as integers — a fractional step such
      // as 68.5 kg throws "Loss of precision during arithmetic conversion" on
      // iOS. `text` carries the exact value to VoiceOver instead.
      accessibilityValue={{
        min: Math.round(min),
        max: Math.round(max),
        now: Math.round(value),
        text: formatValue ? formatValue(value) : String(value),
      }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={TICK_GAP}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={styles.scrollContent}>
        <View style={{ height: scaleHeight }}>{scale}</View>
      </ScrollView>

      {/* Static rail, selection marker and edge fades sit above the scale. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.rail} />

        <LinearGradient
          colors={[Colors.surface, Colors.surfaceTransparent]}
          style={[styles.fade, styles.fadeTop]}
        />
        <LinearGradient
          colors={[Colors.surfaceTransparent, Colors.surface]}
          style={[styles.fade, styles.fadeBottom]}
        />

        <View style={styles.selection}>
          {/* Opaque so it masks the major label it may land on. */}
          <Text
            style={[styles.selectionLabel, { color: accent.main }]}
            numberOfLines={1}>
            {formatValue ? formatValue(value) : String(value)}
          </Text>
          <View style={styles.selectionSpacer} />
          <View
            style={[styles.selectionDot, { backgroundColor: accent.main }]}
          />
          <LinearGradient
            colors={[accent.main, Colors.surfaceTransparent]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.selectionLine}
          />
        </View>
      </View>
    </View>
  );
}

export default memo(RulerPicker);

const styles = StyleSheet.create({
  viewport: {
    height: RULER_HEIGHT,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  scrollContent: {
    // Half a viewport of padding lets the first and last ticks reach the centre.
    paddingVertical: RULER_HEIGHT / 2 - TICK_GAP / 2 - EDGE,
  },
  tickLabel: {
    ...Typography.label,
    position: 'absolute',
    left: 0,
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    lineHeight: LABEL_HEIGHT,
    textAlign: 'right',
    color: Colors.textMuted,
  },
  tickMajor: {
    position: 'absolute',
    left: RAIL_X - MAJOR_TICK,
    width: MAJOR_TICK,
    height: MAJOR_THICKNESS,
    borderRadius: 1,
    backgroundColor: Colors.borderStrong,
  },
  tickMinor: {
    position: 'absolute',
    left: RAIL_X - MINOR_TICK,
    width: MINOR_TICK,
    height: MINOR_THICKNESS,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  rail: {
    position: 'absolute',
    left: RAIL_X,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: Colors.borderStrong,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
  selection: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Sized to the value label, not the dot, so Android never clips the text.
    top: RULER_HEIGHT / 2 - (LABEL_HEIGHT + 4) / 2,
    height: LABEL_HEIGHT + 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionLabel: {
    ...Typography.caption,
    fontWeight: '700',
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT + 4,
    lineHeight: LABEL_HEIGHT + 4,
    marginRight: LABEL_GAP,
    textAlign: 'right',
    backgroundColor: Colors.surface,
  },
  selectionSpacer: {
    width: TICK_COLUMN + 1.5 - DOT_SIZE / 2,
  },
  selectionDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: Radius.round,
  },
  selectionLine: {
    width: HIGHLIGHT_LENGTH,
    height: 2,
    borderRadius: 1,
  },
});
