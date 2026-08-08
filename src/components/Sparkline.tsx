import { StyleSheet, View } from 'react-native';

import { Radius } from '../constants/theme';

interface Props {
  /** Series to draw, oldest first. Fewer than two points renders nothing. */
  values: number[];
  width: number;
  height: number;
  color: string;
  /** Stroke width of the line. */
  thickness?: number;
}

/**
 * A minimal line chart drawn with plain Views — the project has no
 * react-native-svg dependency, so each segment between two points is a thin
 * rectangle rotated to the angle between them and pinned at its left edge.
 */
export default function Sparkline({
  values,
  width,
  height,
  color,
  thickness = 2,
}: Props) {
  if (values.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series has no range to normalise against, so it sits mid-height.
  const span = max - min || 1;
  const step = width / (values.length - 1);
  // Keep the stroke inside the box: the line's centre can only travel between
  // half a thickness from each edge.
  const usable = Math.max(height - thickness, 1);

  const points = values.map((value, index) => ({
    x: index * step,
    y:
      thickness / 2 +
      (max === min ? usable / 2 : (1 - (value - min) / span) * usable),
  }));

  return (
    <View style={{ width, height }}>
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                left: point.x,
                top: point.y - thickness / 2,
                width: length,
                height: thickness,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}

      {/* A dot on the latest value, so the series has a clear "now" end. */}
      <View
        style={[
          styles.dot,
          {
            left: points[points.length - 1].x - thickness * 1.5,
            top: points[points.length - 1].y - thickness * 1.5,
            width: thickness * 3,
            height: thickness * 3,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    borderRadius: Radius.round,
    // Rotating about the left edge keeps the segment's start pinned to its
    // point; the default centre origin would shift it off the line.
    transformOrigin: 'left center',
  },
  dot: { position: 'absolute', borderRadius: Radius.round },
});
