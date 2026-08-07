// In-memory onboarding state across all screens. Persisted to Supabase
// only at the very end (after account creation on the final screen).

export type Gender = 'woman' | 'man' | 'non_binary' | 'unspecified';
export type HeightUnit = 'cm' | 'ft_in';
export type WeightUnit = 'kg' | 'lb';
export type WorkoutFrequency = 'rarely' | 'sometimes' | 'frequently';
export type Goal =
  | 'lose_weight'
  | 'maintain'
  | 'gain_weight'
  | 'improve_health'
  | 'build_muscle';
export type EatingStyle =
  | 'balanced'
  | 'whole_foods'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'high_protein'
  | 'no_special_diet';
export type ProfessionalGuidance =
  'personal_trainer' | 'dietitian' | 'both' | 'neither';

interface OnboardingState {
  gender?: Gender;
  dateOfBirth?: string;
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
  Object.keys(onboardingState).forEach(
    (key) => delete (onboardingState as any)[key]
  );
}

// Updated from 13 to 12 — Height and Weight are now a single combined step.
// Steps: Gender(1), DOB(2), Height&Weight(3), Workout(4), Goal(5),
// Challenges(6), Eating Style(7), Professional Guidance(8), Achieve
// Targets(9), Previous Apps(10), Referral Code(11), Referral Source(12).
export const TOTAL_STEPS = 12;
