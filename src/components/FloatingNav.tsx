import { BlurView } from 'expo-blur';
import { Href, useRouter, useSegments } from 'expo-router';
import {
  Calendar,
  Heart,
  Home,
  MoreHorizontal,
  Pill,
} from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../constants/theme';

interface NavItem {
  name: string;
  label: string;
  icon: React.ReactNode;
  route: Href;
}

const navItems: NavItem[] = [
  {
    name: 'home',
    label: 'Home',
    icon: <Home size={24} stroke={Colors.textSecondary} strokeWidth={2} />,
    route: '/(tabs)/home',
  },
  {
    name: 'medicine',
    label: 'Medicine',
    icon: <Pill size={24} stroke={Colors.textSecondary} strokeWidth={2} />,
    route: '/(tabs)/medicine',
  },
  {
    name: 'planner',
    label: 'Planner',
    icon: <Calendar size={24} stroke={Colors.textSecondary} strokeWidth={2} />,
    route: '/(tabs)/planner',
  },
  {
    name: 'health',
    label: 'Health',
    icon: <Heart size={24} stroke={Colors.textSecondary} strokeWidth={2} />,
    route: '/(tabs)/health',
  },
  {
    name: 'more',
    label: 'More',
    icon: (
      <MoreHorizontal size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    ),
    // There is no (tabs)/more screen; "More" opens Settings, which is where
    // the secondary destinations (profile, family, reports) hang off.
    route: '/settings',
  },
];

export default function FloatingNav() {
  const router = useRouter();
  const segments = useSegments();
  const activeRoute = segments[1];

  const getActiveIcon = (name: string) => {
    const isActive = activeRoute === name;
    if (isActive) {
      return name === 'home' ? (
        <Home size={24} stroke={Colors.primary} strokeWidth={2} />
      ) : name === 'medicine' ? (
        <Pill size={24} stroke={Colors.primary} strokeWidth={2} />
      ) : name === 'planner' ? (
        <Calendar size={24} stroke={Colors.primary} strokeWidth={2} />
      ) : name === 'health' ? (
        <Heart size={24} stroke={Colors.primary} strokeWidth={2} />
      ) : (
        <MoreHorizontal size={24} stroke={Colors.primary} strokeWidth={2} />
      );
    }
    return name === 'home' ? (
      <Home size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    ) : name === 'medicine' ? (
      <Pill size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    ) : name === 'planner' ? (
      <Calendar size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    ) : name === 'health' ? (
      <Heart size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    ) : (
      <MoreHorizontal size={24} stroke={Colors.textSecondary} strokeWidth={2} />
    );
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={styles.navBar}>
          {navItems.map((item) => {
            const isActive = activeRoute === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.navItem}
                onPress={() => router.push(item.route)}>
                <View style={styles.iconContainer}>
                  {getActiveIcon(item.name)}
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive ? styles.labelActive : styles.labelInactive,
                  ]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.underline} />}
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
    backgroundColor: 'transparent',
  },
  blurContainer: {
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 76,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: Radius.pill,
    borderTopRightRadius: Radius.pill,
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.floating,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  labelActive: {
    color: Colors.primary,
  },
  labelInactive: {
    color: Colors.textSecondary,
    opacity: 0.6,
  },
  underline: {
    width: 24,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
    marginTop: Spacing.xs,
  },
});
