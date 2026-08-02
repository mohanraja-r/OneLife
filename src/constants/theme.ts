/**
 * OneLife design tokens — colors, spacing, and typography pulled directly
 * from the approved UX mockups. Single source of truth for all screens.
 */

import { Platform } from 'react-native';

export const Colors = {
  background: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F6F2',
  border: '#E5E3DC',

  textPrimary: '#1C1C1E',
  textSecondary: '#7A7870',
  textMuted: '#9C9A91',

  accent: '#1D9E75',
  accentLight: '#EAF3F0',
  accentGradientStart: '#34C77B',

  medicineBg: '#FDF1EC',
  medicineAccent: '#F6D9CC',
  medicineText: '#9C7B6B',

  plannerBg: '#EEF2FB',
  plannerAccent: '#D9E3F7',

  danger: '#D85A30',
  warningBg: '#FDF1EC',
  warningText: '#9C4B2E',

  womensHealthAccent: '#B23D6C',
  womensHealthBg: '#FDEEF3',

  waterBlue: '#1C6FC9',
  activityOrange: '#D68B4A',
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
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const Typography = {
  title: { fontSize: 22, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
