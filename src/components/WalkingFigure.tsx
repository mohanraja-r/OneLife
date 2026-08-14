import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Accents, Colors } from '../constants/theme';

/** The illustration's own coordinate space. */
const VIEW_W = 120;
const VIEW_H = 132;
/** Height follows from the width, so callers pass one dimension. */
const ASPECT = VIEW_H / VIEW_W;

interface Props {
  /** Rendered width in points. */
  size: number;
  /**
   * Progress towards the step goal, 0–1. Drives how much of the ground arc
   * under the walker is filled in, so the drawing carries the number too.
   */
  progress: number;
}

/**
 * A walking figure for the Steps card — mid-stride, on a ground line that
 * fills left to right as the day's goal is approached.
 *
 * Replaces the progress ring: steps now arrive from the device rather than
 * being typed in, so the card reads as a status illustration rather than an
 * input control.
 */
export default function WalkingFigure({ size, progress }: Props) {
  const filled = Math.min(Math.max(progress, 0), 1);
  const height = size * ASPECT;

  // The ground line is a plain rule rather than an arc, so the filled portion
  // is a simple width — no path maths, and it stays crisp at any size.
  const groundLeft = 12;
  const groundRight = 108;
  const groundY = 122;
  const filledTo = groundLeft + (groundRight - groundLeft) * filled;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Defs>
        <LinearGradient id="walkBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Accents.green.gradient[1]} />
          <Stop offset="1" stopColor={Accents.green.main} />
        </LinearGradient>
      </Defs>

      {/* Soft disc behind the walker, so the figure reads against the card. */}
      <Circle cx="60" cy="62" r="52" fill={Accents.green.tint} />

      {/* Motion lines trailing the walker. */}
      <G stroke={Accents.green.main} strokeWidth="3" strokeLinecap="round" opacity="0.45">
        <Path d="M8 52 H24" />
        <Path d="M2 66 H20" />
        <Path d="M8 80 H24" />
      </G>

      {/* Head */}
      <Circle cx="70" cy="30" r="11" fill="url(#walkBody)" />

      {/* Torso, leaning into the stride */}
      <Path
        d="M68 42 C62 52 58 62 56 74 L70 78 C74 66 78 56 80 46 Z"
        fill="url(#walkBody)"
      />

      {/* Arms: one swung forward, one back */}
      <G
        stroke="url(#walkBody)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none">
        <Path d="M70 50 L86 60 L84 74" />
        <Path d="M64 52 L50 62 L52 76" />
      </G>

      {/* Legs, mid-stride — the front one reaching, the back one pushing off */}
      <G
        stroke="url(#walkBody)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none">
        <Path d="M62 76 L74 92 L72 112" />
        <Path d="M60 76 L46 90 L36 106" />
      </G>

      {/* Feet */}
      <Ellipse cx="74" cy="115" rx="9" ry="4" fill={Accents.green.dark} />
      <Ellipse cx="33" cy="109" rx="9" ry="4" fill={Accents.green.dark} />

      {/* Ground line: the unfilled remainder, then the progress over it. */}
      <Path
        d={`M${groundLeft} ${groundY} H${groundRight}`}
        stroke={Colors.surfaceSunken}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {filled > 0 && (
        <Path
          d={`M${groundLeft} ${groundY} H${filledTo}`}
          stroke={Accents.green.main}
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
