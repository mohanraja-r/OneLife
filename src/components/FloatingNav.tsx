import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, usePathname, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { CalendarCheck, House, Pill, ScanQrCode } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Colors,
  Gradients,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';

interface NavItem {
  label: string;
  icon: LucideIcon;
  route: Href;
  /** Resolved pathname this tab owns, used to decide the active state. */
  match: string;
}

const home: NavItem = {
  label: 'Home',
  icon: House,
  route: '/(tabs)/home',
  match: '/home',
};
const medicine: NavItem = {
  label: 'Medicine',
  icon: Pill,
  route: '/(tabs)/medicine',
  match: '/medicine',
};
const planner: NavItem = {
  label: 'Planner',
  icon: CalendarCheck,
  route: '/(tabs)/planner',
  match: '/planner',
};
// The same destinations for everyone, whatever their profile says. Women's
// Health is a row in the profile drawer rather than a tab: gating a slot on
// gender made the bar shift under the user.
//
// Profile is not here either — the account hub is the drawer behind the
// dashboard's hamburger now, so the bar carries only the top-level screens.
const navItems: NavItem[] = [home, medicine, planner];

/** How many destinations sit to the left of the centre scanner disc. */
const SCAN_SLOT = 2;

/** Gradient disc diameter. */
const DISC = 58;
/** White collar drawn behind the disc, punching it out of the bar. */
const COLLAR = DISC + 12;
/** How far the collar rises above the bar's top edge. */
const LIFT = 30;

// Bottom tab bar: a white sheet pinned to the bottom edge with rounded top
// corners, two icon + label tabs either side of the scanner, and the active tab
// picked out in the brand violet with a soft tinted fill.
//
// The scanner is a raised disc punched through the middle of the bar, not a
// fifth tab: it pushes the meal-logging flow on top of the current screen
// rather than switching destination, so it never takes the active state.
//
// The row is built as two equal-width groups either side of a fixed centre
// reservation rather than a five-slot row, so the disc sits at a true 50%.
export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  /** Renders one destination tab, picked out in violet when it is the route. */
  const renderItem = (item: NavItem) => {
    const isActive = pathname.startsWith(item.match);
    const Icon = item.icon;
    return (
      <TouchableOpacity
        key={item.label}
        style={styles.navItem}
        onPress={() => !isActive && router.push(item.route)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}>
        <Icon
          size={22}
          strokeWidth={isActive ? 2.2 : 1.8}
          color={isActive ? Colors.primary : Colors.textSecondary}
          fill={isActive ? Colors.primaryTint : 'transparent'}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            isActive ? styles.labelActive : styles.labelInactive,
          ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    // `box-none` so the empty strip the disc rises into stays transparent to
    // taps — without it the padding would swallow presses on the screen behind.
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={[styles.navBar, { paddingBottom: insets.bottom || Spacing.md }]}>
          <View style={styles.group}>{navItems.slice(0, SCAN_SLOT).map(renderItem)}</View>
          <View style={styles.centerGap} />
          <View style={styles.group}>{navItems.slice(SCAN_SLOT).map(renderItem)}</View>
        </View>
      </BlurView>

      {/* Sits outside the BlurView, whose `overflow: hidden` would otherwise
          shear off the half of the disc that overhangs the bar. */}
      <TouchableOpacity
        style={styles.scanFab}
        onPress={() => router.push('/log-meal')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Scan a meal">
        <LinearGradient
          colors={Gradients.primary}
          start={Gradients.diagonal.start}
          end={Gradients.diagonal.end}
          style={styles.scanDisc}>
          <ScanQrCode size={28} color={Colors.textInverse} strokeWidth={2} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Reserves the strip the disc overhangs into. Android does not deliver
    // touches to children outside their parent's bounds, so the disc has to
    // live inside this padding to stay tappable along its top half.
    paddingTop: LIFT,
  },
  blurContainer: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.navFloatingBorder,
    overflow: 'hidden',
    ...Shadow.floating,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.navFloatingBg,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  /** One half of the row. Both are `flex: 1`, so the gap between them — and the
   *  disc inside it — lands dead centre however many tabs each half holds. */
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  centerGap: { width: COLLAR + Spacing.md },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  scanFab: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: COLLAR,
    height: COLLAR,
    borderRadius: Radius.round,
    // The white collar reads as the bar being punched out around the disc.
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.glow,
  },
  scanDisc: {
    width: DISC,
    height: DISC,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Typography.tabLabel,
  },
  labelActive: {
    color: Colors.primary,
  },
  labelInactive: {
    color: Colors.textSecondary,
  },
});
