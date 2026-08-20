import type { JSX } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '../../constants/theme';

interface Props {
  /** Spinner tint — pass the screen's accent where it isn't brand violet. */
  color?: string;
  /** Fill the remaining space and centre, instead of sitting inline. */
  fill?: boolean;
}

/** The centred spinner a screen shows while its first load is in flight. */
export default function LoadingState({
  color = Colors.primary,
  fill = false,
}: Props): JSX.Element {
  return (
    <View style={fill ? styles.fill : styles.inline}>
      <ActivityIndicator color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { paddingVertical: Spacing.max, alignItems: 'center' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
