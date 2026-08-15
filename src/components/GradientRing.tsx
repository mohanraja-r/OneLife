import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Colors } from '../constants/theme';

interface Props {
  /** Outer diameter in points. */
  size: number;
  /** Stroke width of the ring. */
  thickness: number;
  /** How much of the ring is filled, 0–1. Values outside are clamped. */
  progress: number;
  /** Gradient stops for the filled arc, start to end. */
  colors: readonly [string, string];
  /** Colour of the unfilled remainder. */
  trackColor?: string;
  /** Centred content, e.g. the value the ring is measuring. */
  children?: ReactNode;
}

/**
 * A circular progress ring with a gradient arc, drawn as a stroked SVG circle.
 *
 * Distinct from `ProgressRing`, which fakes an arc out of two clipped
 * half-circle borders because the project had no SVG dependency at the time.
 * That trick cannot carry a gradient along the arc, and it can only round the
 * whole border at once, so it has no rounded cap. This is the real thing.
 */
export default function GradientRing({
  size,
  thickness,
  progress,
  colors,
  trackColor = Colors.surfaceSunken,
  children,
}: Props) {
  const filled = Math.min(Math.max(progress, 0), 1);
  // The stroke straddles the path, so the radius has to pull in by half of it
  // or the ring would be clipped by the viewBox on both sides.
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />

        {filled > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringFill)"
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            // A stroked circle starts at 3 o'clock; this brings it to the top.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>

      <View style={[styles.center, { width: size, height: size }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
