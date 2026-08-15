import { Platform } from 'react-native';

/**
 * OneLife Design System 2.0
 *
 * Derived from the approved onboarding reference: soft lavender canvas, white
 * cards with a hairline border and a low-contrast lift, generously rounded
 * corners, and one saturated accent per screen (violet → green → amber) that
 * drives the icon tile, the highlighted value, and the primary button together.
 *
 * Rules of the road:
 *  - Never write a raw hex in a screen. Add a token here instead.
 *  - Per-screen color comes from `Accents`, not from ad-hoc constants.
 *  - Every value is React Native safe (no CSS shorthand, no `linear-gradient()`
 *    strings — use `Gradients` with expo-linear-gradient).
 */

// ---------------------------------------------------------------------------
// Accent families
// ---------------------------------------------------------------------------

/** One accent family: the saturated mark, a pressed/darker variant, and the
 *  10%-ish tint used behind icons and selected rows. */
export interface Accent {
  /** Saturated color: buttons, active borders, the highlighted numeral. */
  main: string;
  /** Pressed state and text sitting on top of `tint`. */
  dark: string;
  /** Soft wash behind icon tiles, selected cards, and badges. */
  tint: string;
  /** Two-stop gradient for filled buttons and hero cards. */
  gradient: readonly [string, string];
}

const accent = (
  main: string,
  dark: string,
  tint: string,
  gradientEnd: string
): Accent => ({ main, dark, tint, gradient: [main, gradientEnd] as const });

/**
 * Screen accents. Onboarding walks violet → violet → violet → green → amber;
 * feature areas reuse the same families so a color never means two things.
 */
export const Accents = {
  violet: accent('#6C4CF1', '#5438CC', '#EDE9FE', '#9B6DF3'),
  blue: accent('#3B82F6', '#2563EB', '#DBEAFE', '#60A5FA'),
  green: accent('#22C55E', '#16A34A', '#DCFCE7', '#4ADE80'),
  amber: accent('#F59E0B', '#D97706', '#FEF3C7', '#FBBF24'),
  pink: accent('#EC4899', '#DB2777', '#FCE7F3', '#F472B6'),
  rose: accent('#F43F5E', '#E11D48', '#FFE4E6', '#FB7185'),
  orange: accent('#F97316', '#EA580C', '#FFEDD5', '#FB923C'),
  neutral: accent('#64748B', '#475569', '#F1F5F9', '#94A3B8'),
} as const;

export type AccentName = keyof typeof Accents;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const Colors = {
  // Canvas & surfaces
  background: '#F6F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFAFD',
  surfaceSunken: '#F2F2F8', // segmented-control troughs, progress tracks
  /** Zero-alpha `surface`, for gradient stops that fade a card edge out. */
  surfaceTransparent: 'rgba(255,255,255,0)',
  border: '#EDEDF4',
  borderStrong: '#DEDEE9',
  overlay: 'rgba(27,29,42,0.45)',

  // Text
  textPrimary: '#1B1D2A',
  textSecondary: '#7C8199',
  textMuted: '#A5A9BC',
  textInverse: '#FFFFFF',

  // Brand
  primary: Accents.violet.main,
  primaryDark: Accents.violet.dark,
  primaryTint: Accents.violet.tint,
  secondary: '#9B6DF3',

  /**
   * Interactive accent — links, switch tracks, active chips, "Save"/"Cancel"
   * actions. Deliberately the brand violet: in the reference every interactive
   * mark on a neutral surface is violet, never pink.
   */
  accent: Accents.violet.main,
  accentLight: Accents.violet.tint,

  // Semantic
  success: Accents.green.main,
  successTint: Accents.green.tint,
  warning: Accents.amber.main,
  warningTint: Accents.amber.tint,
  error: '#EF4444',
  errorTint: '#FEE2E2',
  /** Alias of `error`, for destructive affordances (logout, remove). */
  danger: '#EF4444',
  info: Accents.blue.main,
  infoTint: Accents.blue.tint,

  // Category accents — icon tiles in Today's Plan
  medication: '#7C3AED',
  medicationTint: Accents.violet.tint,
  nutrition: Accents.green.dark,
  nutritionTint: Accents.green.tint,
  hydration: Accents.blue.main,
  hydrationTint: Accents.blue.tint,
  activity: Accents.orange.main,
  activityTint: Accents.orange.tint,

  // Metric tiles (Steps / Sleep / BPM / Calories)
  metricSteps: Accents.green.main,
  metricSleep: '#6366F1',
  metricHeart: Accents.rose.main,
  metricCalories: Accents.orange.main,

  // Gender chips on the onboarding gender step
  genderMale: Accents.blue.main,
  genderMaleTint: Accents.blue.tint,
  genderFemale: Accents.pink.main,
  genderFemaleTint: Accents.pink.tint,
  genderOther: Accents.violet.main,
  genderOtherTint: Accents.violet.tint,
  genderUnspecified: Accents.neutral.main,
  genderUnspecifiedTint: Accents.neutral.tint,

  // Floating nav — translucent white pill over the page
  navFloatingBg: 'rgba(255,255,255,0.92)',
  navFloatingBorder: 'rgba(237,237,244,0.9)',

  // Water droplet gauge. The empty body is a pale lavender rather than white so
  // the silhouette still reads against the near-white canvas at 0%.
  waterEmpty: '#EDEAFB',
  /** Fill gradient, anchored to the droplet's full height — so a given depth is
   *  always the same colour whatever the level. */
  waterFillTop: '#A78BFA',
  waterFillMid: '#6E8FF3',
  waterFillBottom: '#4BA3EF',
  waterStrokeTop: '#9B7DF7',
  waterStrokeBottom: '#5AA7F2',
  /** Dial ticks ringing the droplet. */
  waterTick: '#DCD9EE',

  // On-gradient (text/track over the violet health card)
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255,255,255,0.82)',
  onPrimaryFaint: 'rgba(255,255,255,0.28)',

  // Gradient stops kept as flat tokens for callers that need one end only
  gradientPrimaryStart: Accents.violet.main,
  gradientPrimaryEnd: '#9B6DF3',
} as const;

// ---------------------------------------------------------------------------
// Gradients — stop arrays for expo-linear-gradient's `colors` prop
// ---------------------------------------------------------------------------

export const Gradients = {
  primary: [Colors.gradientPrimaryStart, Colors.gradientPrimaryEnd] as const,
  avatar: ['#8B7CF6', '#C4A5F5'] as const,
  /** Violet → pink, for the water screen's "Add Water" action. */
  waterAction: ['#9061F9', '#F2469B'] as const,
  /** Violet → pink sweep for the steps ring and the insight banner. */
  activity: [Accents.violet.main, Accents.pink.main] as const,
  /** Top-to-bottom stops of the droplet's water fill. */
  waterFill: [
    Colors.waterFillTop,
    Colors.waterFillMid,
    Colors.waterFillBottom,
  ] as const,
  /** Soft lavender→pink wash behind the Family greeting card. */
  familyHero: [Accents.violet.tint, Accents.pink.tint] as const,
  /** 135° diagonal, matching the hero card in the reference. */
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  /** Left-to-right, for buttons and progress fills. */
  horizontal: { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4pt grid
// ---------------------------------------------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  max: 48,
  /** Standard screen gutter. */
  screen: 24,
  /** Bottom padding so scroll content clears the floating nav. */
  navClearance: 120,
} as const;

// ---------------------------------------------------------------------------
// Radius
// ---------------------------------------------------------------------------

export const Radius = {
  sm: 8,
  md: 12,
  tile: 14, // icon tiles inside list rows
  lg: 16, // metric cards, plan rows, option cards
  card: 20, // standalone cards
  xl: 24, // health score card, primary buttons
  xxl: 28, // floating nav
  pill: 38,
  round: 999, // fully circular
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const Typography = {
  /** Marketing hero on the welcome screen: 34/700. */
  largeHero: { fontSize: 34, fontWeight: '700' as const, lineHeight: 40 },
  /** Onboarding question / screen title: 28/700. */
  screenTitle: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  /** Alias of `screenTitle` for existing callers. */
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  /** In-app header bar: 20/700. */
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  /** Section title: 20/600. */
  sectionTitle: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  /** Card title: 18/600. */
  cardTitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  /** Hero numeral (height/weight readouts): 44/700. */
  displayNumber: { fontSize: 44, fontWeight: '700' as const, lineHeight: 52 },
  /** Large number: 42/700. */
  largeNumber: { fontSize: 42, fontWeight: '700' as const, lineHeight: 48 },
  /** Unit suffix trailing a display numeral: 17/600. */
  unit: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  /** Body: 16/400. */
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  /** Option-card label: 16/600. */
  optionLabel: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  /** Secondary text: 15/400. */
  secondary: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  /** Caption: 13/500. */
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  /** Small label: 12/500. */
  label: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  /** Button: 17/600. */
  button: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  /** Metric tile value: 17/700. */
  metricValue: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  /** Health-score numeral inside the ring: 30/700. */
  scoreValue: { fontSize: 30, fontWeight: '700' as const, lineHeight: 34 },
  /** Floating nav label: 11/600. */
  tabLabel: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
} as const;

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

export const Shadow = {
  /** Hairline lift under white cards. */
  card: Platform.select({
    ios: {
      shadowColor: '#1B1D2A',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  /** Selected option card / raised control. */
  raised: Platform.select({
    ios: {
      shadowColor: '#1B1D2A',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 4 },
    default: {},
  }),
  /** Floating nav and sheets. */
  floating: Platform.select({
    ios: {
      shadowColor: '#1B1D2A',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  }),
  /** Violet lift under the health score card and primary buttons. */
  glow: Platform.select({
    ios: {
      shadowColor: Accents.violet.main,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

/** Colored lift matching a screen's accent — for primary buttons. */
export const accentShadow = (color: string) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: 0.32,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  });

// ---------------------------------------------------------------------------
// Motion — shared timings for moti transitions
// ---------------------------------------------------------------------------

export const Motion = {
  fast: 200,
  base: 280,
  slow: 320,
  /** Per-item delay for staggered list entrances. */
  stagger: 45,
  /** Delay before the first staggered item. */
  enterDelay: 80,
} as const;

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

export const Opacity = {
  disabled: 0.45,
  pressed: 0.85,
  inactive: 0.6,
} as const;

/** Minimum tappable square — keep every icon-only control at least this big. */
export const HitSize = 44;
