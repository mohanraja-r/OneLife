import type { JSX } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  Colors,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';

interface Props {
  /** The failure to show. Render nothing when there isn't one. */
  message: string | null;
  /** Re-runs the failed load. Omit to show the message without an action. */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * The tinted banner a screen shows when a load fails, with the retry affordance
 * that always accompanies it.
 */
export default function ErrorNotice({
  message,
  onRetry,
  retryLabel = 'Try again',
}: Props): JSX.Element | null {
  if (!message) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retry}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.errorTint,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  text: { ...Typography.caption, color: Colors.error, flex: 1 },
  retry: { ...Typography.caption, color: Colors.error, fontWeight: '700' },
});
