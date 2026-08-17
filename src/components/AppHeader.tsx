import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  Colors,
  HitSize,
  Spacing,
  Typography,
} from '../constants/theme';

interface Props {
  /** The page name, shown next to the back arrow. */
  title: string;
  /** Right-hand control — an add, edit, share or delete button. */
  action?: ReactNode;
  /**
   * Forces the back arrow off. The header hides it on its own when there is
   * nothing to pop, so this is only for screens that must not go back at all.
   */
  showBack?: boolean;
}

/**
 * The bar every screen but the dashboard opens with: a back arrow in the top
 * left, the page name beside it, and an optional control on the right.
 *
 * Screens own their own safe-area inset — most sit inside a `SafeAreaView`, and
 * the few that draw under the status bar pass their own `paddingTop` on the
 * wrapper instead.
 */
export default function AppHeader({
  title,
  action,
  showBack = true,
}: Props): ReactNode {
  // A tab root opened straight from the bottom bar has nothing to pop, and
  // router.back() would be a dead tap — so the arrow only appears when there is
  // somewhere to return to.
  const canGoBack = showBack && router.canGoBack();

  return (
    <View style={styles.header}>
      {canGoBack && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ChevronLeft size={26} color={Colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {!!action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  // Pulled back by the chevron's own side bearing, so the arrow reads as
  // sitting on the screen gutter rather than indented from it.
  back: {
    width: HitSize - 10,
    height: HitSize,
    marginLeft: -Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.heading,
    flex: 1,
    color: Colors.textPrimary,
  },
  action: {
    minWidth: HitSize,
    height: HitSize,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
