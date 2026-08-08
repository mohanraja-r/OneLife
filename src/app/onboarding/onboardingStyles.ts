import { StyleSheet } from 'react-native';

import {
  Colors,
  Radius,
  Shadow,
  Spacing,
  Typography,
} from '../../constants/theme';

/**
 * Single shared style sheet for every onboarding screen — update a size here
 * once and every screen picks it up. Nothing accent-colored lives in here:
 * per-screen color is applied inline from `Accents` so one sheet can serve the
 * violet, green, and amber steps.
 */
export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
  },

  // Body sits between the progress header and the pinned button.
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },

  // Scrolling body used by QuestionScreen — same rhythm as `content`, but the
  // options list can run past the fold on the longer steps.
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },

  // Round tinted tile above the question — accent tint applied inline.
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  title: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  // Kept for screens that ask a question in the title slot.
  question: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.secondary,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },

  options: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },

  // Option card (used by OptionCard.tsx)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  // Border + background are accent-colored inline; this only bumps the weight.
  optionCardSelected: {
    borderWidth: 2,
    ...Shadow.raised,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: { fontSize: 18 },
  optionTitle: { ...Typography.optionLabel, color: Colors.textPrimary },
  optionTitleSelected: { fontWeight: '700' },
  optionSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: { borderWidth: 0 },
  optionCheckmark: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },

  optionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCheckboxSelected: { borderWidth: 0 },

  // Inputs (referral code, free text, etc.)
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  // Input with a trailing glyph (the gift on the referral step).
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadow.card,
  },
  inputField: {
    flex: 1,
    paddingVertical: Spacing.lg,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  // Small centered divider label, e.g. "Popular apps you may have used".
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Reassurance / reward callout — tinted inline with the screen accent.
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.tile,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  noteBody: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Centered text link under the primary button ("I don't have a code").
  textLink: {
    ...Typography.caption,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Three-up tile grid (the "popular apps" picker).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  gridTile: {
    width: '30%',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    ...Shadow.card,
  },
  gridTileIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTileLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // Segmented unit toggle (cm / ft & in, kg / lb). The active pill takes the
  // screen accent tint inline.
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: Spacing.xxl,
  },
  unitOption: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  unitText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unitTextActive: { fontWeight: '700' },

  // Hero numeric readout: "170 cm" / "68.0 kg"
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  readoutValue: { ...Typography.displayNumber, color: Colors.textPrimary },
  readoutUnit: { ...Typography.unit, color: Colors.textSecondary },

  // Compact readout, for the two side-by-side measurement cards.
  readoutCompact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  readoutCompactValue: {
    ...Typography.largeNumber,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.textPrimary,
  },

  // Side-by-side measurement cards (height / weight), each holding a readout,
  // a ruler and its own unit toggle.
  measureRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  measureCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  measureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  measureIcon: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  measureLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Unit toggle stretched to a card's width, rather than centered on the page.
  unitToggleInline: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.pill,
    padding: 4,
    marginTop: Spacing.md,
  },
  unitOptionInline: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },

  // "Already have an account? Log in" — welcome and create-account both end
  // on this line. Accent-colored inline so each screen keeps its own tint.
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: { ...Typography.caption, color: Colors.textSecondary },
  loginLink: { ...Typography.caption, fontWeight: '700' },

  // Date picker (date of birth)
  pickerWrapper: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },

  // Age preview badge — background tinted inline with the screen accent.
  agePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  agePreviewLabel: { ...Typography.caption, color: Colors.textSecondary },
  agePreviewValue: { ...Typography.cardTitle, color: Colors.textPrimary },

  // Pinned footer holding the Continue button.
  footer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
