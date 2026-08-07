/**
 * OneLife design tokens — colors, spacing, and typography.
 * v3: purple/indigo visual refresh (glassmorphism, floating nav, health
 * score ring) — functionality unchanged, this file only updates values.
 * Every existing key name is preserved so no other file needs to change
 * its imports; only the underlying color values shifted.
 */

import { Platform } from 'react-native';

export const Colors = {
  background: '#F7F6FC',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1FA',
  border: '#E7E4F5',

  textPrimary: '#1E1B2E',
  textSecondary: '#6E6A85',
  textMuted: '#A6A2BC',

  accent: '#6C5CE7',
  accentLight: '#EDEAFC',
  accentGradientStart: '#8B7FF0',
  accentGradientEnd: '#6C5CE7',

  medicineBg: '#F3EEFF',
  medicineAccent: '#DCCFFF',
  medicineText: '#7B5FD9',

  plannerBg: '#EEF1FF',
  plannerAccent: '#D6DEFF',

  danger: '#E15B64',
  warningBg: '#FFF1EE',
  warningText: '#C15A3F',

  womensHealthAccent: '#D4508A',
  womensHealthBg: '#FDEAF3',

  waterBlue: '#4C7EF3',
  activityOrange: '#F2A65A',

  // New tokens for the glassmorphism / floating-nav style
  glassBg: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.5)',
  navFloatingBg: 'rgba(30,27,46,0.92)',
  success: '#3CBE8B',
  successLight: '#E4F8F0',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 12,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const Typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
} as const;

// Reusable shadow preset for floating cards / the floating nav bar
export const Shadows = {
  card: {
    shadowColor: '#3A2F73',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
