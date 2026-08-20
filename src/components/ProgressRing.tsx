import { type JSX, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors } from '../constants/theme';

interface Props {
  /** Outer diameter in points. */
  size: number;
  /** Stroke width of the ring. */
  thickness: number;
  /** How much of the ring is filled, 0–1. Values outside are clamped. */
  progress: number;
  /** Colour of the filled arc. */
  color: string;
  /** Colour of the unfilled remainder. */
  trackColor?: string;
  /** Centred content, e.g. the value the ring is measuring. */
  children?: ReactNode;
}

/**
 * A circular progress ring drawn with plain Views — the project has no
 * react-native-svg dependency, so the arc is made from two half-circle borders
 * clipped to one side of the ring each.
 *
 * A View can only round its border as a whole, so the arc element is a circle
 * with just its top and right borders coloured: a semicircle centred on the
 * 45° diagonal. Rotating that by 225° parks it over the left half, where the
 * right-hand clip hides it completely — that is 0%. Sweeping it clockwise
 * feeds it into the right clip up to 50%, and the second copy repeats the trick
 * in the left clip for the rest.
 */
export default function ProgressRing({
  size,
  thickness,
  progress,
  color,
  trackColor = Colors.surfaceSunken,
  children,
}: Props): JSX.Element {
  const filled = Math.min(Math.max(progress, 0), 1);
  const firstSweep = Math.min(filled, 0.5) * 360;
  const secondSweep = 180 + Math.max(filled - 0.5, 0) * 360;

  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: thickness,
  };
  const arc = {
    ...circle,
    position: 'absolute' as const,
    top: 0,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.track,
          circle,
          { borderColor: trackColor },
        ]}
      />

      {/* Right half: carries the first 50% of the sweep. */}
      <View style={[styles.clip, { left: size / 2, width: size / 2, height: size }]}>
        <View
          style={[
            arc,
            { left: -size / 2, transform: [{ rotate: `${225 + firstSweep}deg` }] },
          ]}
        />
      </View>

      {/* Left half: only enters once the right half is full. */}
      {filled > 0.5 && (
        <View style={[styles.clip, { left: 0, width: size / 2, height: size }]}>
          <View
            style={[
              arc,
              { left: 0, transform: [{ rotate: `${225 + secondSweep}deg` }] },
            ]}
          />
        </View>
      )}

      <View style={[styles.center, { width: size, height: size }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: 0, left: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
