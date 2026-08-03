import { StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

// Single shared style sheet for every onboarding screen. Update sizes here
// once and every screen picks it up — no per-screen font overrides.
export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 40,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  question: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  hint: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  options: {
    marginBottom: Spacing.lg,
  },

  // Option card (used by OptionCard.tsx)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 2,
  },
  optionCardSelected: { borderColor: Colors.textPrimary, borderWidth: 2 },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: { fontSize: 20 },
  optionTitle: { fontSize: 22, fontWeight: '600', color: Colors.textPrimary },
  optionSubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  optionRadio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  optionRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  optionCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCheckboxSelected: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  optionCheckmark: { color: 'white', fontSize: 14, fontWeight: '700' },

  // Inputs (height/weight, referral code, etc.)
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  label: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },

  // Unit toggle (height/weight)
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F0F5',
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  unitOption: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center' },
  unitOptionActive: { backgroundColor: 'white' },
  unitText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  unitTextActive: { color: Colors.textPrimary },

  // Date picker (date of birth)
  pickerWrapper: { alignItems: 'center', marginBottom: Spacing.md },

  // Age preview (date of birth)
  agePreview: {
    alignSelf: 'center',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  agePreviewText: { color: '#0F6E56', fontSize: 15, fontWeight: '700' },
});
