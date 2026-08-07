import { BlurView } from 'expo-blur';
import { Href, usePathname, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  CalendarCheck,
  Heart,
  House,
  Pill,
  SlidersHorizontal,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
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

const navItems: NavItem[] = [
  { label: 'Home', icon: House, route: '/(tabs)/home', match: '/home' },
  { label: 'Medicine', icon: Pill, route: '/(tabs)/medicine', match: '/medicine' },
  {
    label: 'Planner',
    icon: CalendarCheck,
    route: '/(tabs)/planner',
    match: '/planner',
  },
  { label: 'Health', icon: Heart, route: '/(tabs)/health', match: '/health' },
  // There is no (tabs)/more screen; "More" opens Settings, which is where the
  // secondary destinations (profile, family, reports) hang off.
  {
    label: 'More',
    icon: SlidersHorizontal,
    route: '/settings',
    match: '/settings',
  },
];

// Bottom tab bar: a white sheet pinned to the bottom edge with rounded top
// corners, one row of five icon + label tabs, and the active tab picked out in
// the brand violet with a soft tinted fill.
export default function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={[styles.navBar, { paddingBottom: insets.bottom || Spacing.md }]}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.match);
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.navItem}
                onPress={() => router.push(item.route)}
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
                  style={[
                    styles.label,
                    isActive ? styles.labelActive : styles.labelInactive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs + 2,
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
