import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  HitSize,
  Radius,
  Spacing,
  Typography,
} from '../../constants/theme';
import AnimatedPressable from '../AnimatedPressable';

interface Props {
  title: string;
  /** Right-hand control — an info or share button. Omit for a bare header. */
  action?: ReactNode;
}

/** The back-arrow-and-title bar every pregnancy detail screen opens with. */
export default function PregnancyHeader({ title, action }: Props) {
  return (
    <View style={styles.header}>
      <AnimatedPressable
        onPress={() => router.back()}
        style={styles.back}
        // The tap target is the square, so the arrow can stay visually small.
        haptic={false}>
        <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.2} />
      </AnimatedPressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  back: {
    width: HitSize,
    height: HitSize,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  // Mirrors the back button's width so the title stays optically centred.
  action: {
    width: HitSize,
    height: HitSize,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
