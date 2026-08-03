// In-memory onboarding state across all 16 screens. Persisted to Supabase
// only at the very end (after account creation on screen 16), matching the
// original "don't write partial profiles" principle — now the account
// itself doesn't exist until the end either, so nothing can be written
// until then anyway.

export type Gender = 'woman' | 'man' | 'non_binary' | 'unspecified';
export type HeightUnit = 'cm' | 'ft_in';
export type WeightUnit = 'kg' | 'lb';
export type WorkoutFrequency = 'rarely' | 'sometimes' | 'frequently';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight' | 'improve_health' | 'build_muscle';
export type EatingStyle =
  | 'balanced' | 'whole_foods' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'high_protein' | 'no_special_diet';
export type ProfessionalGuidance = 'personal_trainer' | 'dietitian' | 'both' | 'neither';

interface OnboardingState {
  gender?: Gender;
  dateOfBirth?: string; // YYYY-MM-DD
  heightValue?: number;
  heightUnit?: HeightUnit;
  weightValue?: number;
  weightUnit?: WeightUnit;
  workoutFrequency?: WorkoutFrequency;
  goal?: Goal;
  biggestChallenges?: string[];
  eatingStyle?: EatingStyle;
  professionalGuidance?: ProfessionalGuidance;
  achieveTargets?: string[];
  usedPreviousApp?: boolean;
  previousAppName?: string;
  referralCode?: string;
  referralSource?: string;
}

export const onboardingState: OnboardingState = {};

export function resetOnboardingState() {
  Object.keys(onboardingState).forEach((key) => delete (onboardingState as any)[key]);
}

// Total step count for the progress bar. Screen 1 (Welcome) and Screen 15
// (plan generation) and Screen 16 (sign-in) are not counted as data-entry
// steps — the progress bar covers screens 2–14 (13 steps). Adjust freely if
// you'd rather count all 16.
export const TOTAL_STEPS = 13;
