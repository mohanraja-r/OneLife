import { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { Colors } from '../constants/theme';

/**
 * Droplet silhouette, in the component's own 100 × 132 coordinate space: a
 * point at the top opening into a circle of radius 34 centred on (50, 78).
 */
const DROP_PATH =
  'M50 4 C50 4 16 48 16 78 C16 96.7 31.2 112 50 112 C68.8 112 84 96.7 84 78 C84 48 50 4 50 4 Z';

/** The viewBox the path and the tick ring are laid out in. */
const VIEW_W = 100;
const VIEW_H = 132;
/** Ratio the rendered height is derived from, so callers pass width only. */
const ASPECT = VIEW_H / VIEW_W;

/** Topmost and bottommost y of the droplet, which the fill spans. */
const DROP_TOP = 4;
const DROP_BOTTOM = 112;

/** Centre of the droplet's bulb — the tick ring and the readout both sit on it. */
const CENTER_X = 50;
const CENTER_Y = 78;

const TICK_COUNT = 40;
const TICK_INNER = 44;
const TICK_OUTER = 49;
/**
 * Arc left bare at the top. The tick ring is a circle about the bulb, but the
 * droplet is not — it tapers to a point well outside that circle, so marks near
 * 12 o'clock would land inside the body and be painted over by it.
 *
 * Measured against the path, the first tick clears at a 64° gap; 70° keeps a
 * margin for the outward half of the silhouette's 2pt stroke. Widening the
 * ring instead is not an option: the point sits 74 units above the bulb centre,
 * so a circle enclosing it would dwarf the droplet.
 */
const TICK_GAP_DEG = 70;

interface Tick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Lays the dial ticks around the bulb, leaving a gap under the droplet's point. */
function buildTicks(): Tick[] {
  const start = TICK_GAP_DEG / 2;
  const sweep = 360 - TICK_GAP_DEG;

  return Array.from({ length: TICK_COUNT }, (_, i) => {
    // Measured clockwise from 12 o'clock, so the gap straddles the point.
    const deg = start + (i / (TICK_COUNT - 1)) * sweep;
    const rad = (deg * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    return {
      x1: CENTER_X + TICK_INNER * sin,
      y1: CENTER_Y - TICK_INNER * cos,
      x2: CENTER_X + TICK_OUTER * sin,
      y2: CENTER_Y - TICK_OUTER * cos,
    };
  });
}

interface Props {
  /** Rendered width in points; height follows the droplet's aspect ratio. */
  size: number;
  /** How full the droplet is, 0–1. Values outside are clamped. */
  progress: number;
  /** The readout, centred on the bulb. */
  children?: ReactNode;
}

/**
 * The water screen's hero gauge: a droplet that fills from the bottom as water
 * is logged, ringed by dial ticks.
 *
 * Drawn with react-native-svg because the shape genuinely needs paths — a
 * teardrop cannot be expressed as border radii, and the fill has to be clipped
 * to that silhouette. The library is already in the bundle as
 * lucide-react-native's peer dependency, so this costs nothing at runtime.
 */
export default function WaterDroplet({ size, progress, children }: Props) {
  const filled = Math.min(Math.max(progress, 0), 1);
  // Measured down from the droplet's tip, so 0% leaves the body empty and 100%
  // covers it exactly.
  const waterlineY = DROP_TOP + (1 - filled) * (DROP_BOTTOM - DROP_TOP);

  const ticks = useMemo(buildTicks, []);
  const height = size * ASPECT;

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <ClipPath id="dropClip">
            <Path d={DROP_PATH} />
          </ClipPath>

          {/* `userSpaceOnUse` pins the stops to the droplet rather than to the
              fill rectangle, so the colour at a given depth does not shift as
              the level changes. */}
          <LinearGradient
            id="waterFill"
            x1="0"
            y1={DROP_TOP}
            x2="0"
            y2={DROP_BOTTOM}
            gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={Colors.waterFillTop} />
            <Stop offset="0.55" stopColor={Colors.waterFillMid} />
            <Stop offset="1" stopColor={Colors.waterFillBottom} />
          </LinearGradient>

          <LinearGradient id="dropStroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.waterStrokeTop} />
            <Stop offset="1" stopColor={Colors.waterStrokeBottom} />
          </LinearGradient>
        </Defs>

        {ticks.map((tick, i) => (
          <Line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={Colors.waterTick}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        ))}

        {/* The unfilled body, which the water is drawn over. */}
        <Path d={DROP_PATH} fill={Colors.waterEmpty} />

        <G clipPath="url(#dropClip)">
          <Rect
            x="0"
            y={waterlineY}
            width={VIEW_W}
            height={DROP_BOTTOM - waterlineY}
            fill="url(#waterFill)"
          />
        </G>

        <Path
          d={DROP_PATH}
          fill="none"
          stroke="url(#dropStroke)"
          strokeWidth={2}
        />
      </Svg>

      {/* Centred on the bulb rather than the whole box, so the readout sits in
          the round of the droplet instead of drifting up into the point. */}
      <View
        pointerEvents="none"
        style={[
          styles.readout,
          {
            top: (CENTER_Y / VIEW_H) * height - size / 2,
            height: size,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
