// Simple in-memory store for onboarding answers as the user moves through
// the 4 steps. Not persisted to Supabase until the final step submits —
// this avoids partial/incomplete profile rows if the user abandons partway.
// A production version might use Zustand or Context; a plain module-level
// object is enough for 4 fields and keeps this scaffold dependency-free.

export type Goal = 'lose_weight' | 'gain_muscle' | 'maintain' | 'manage_condition';
export type Gender = 'woman' | 'man' | 'unspecified';
export type DietaryPreference = 'veg' | 'non_veg' | 'eggetarian';
export type ActivityLevel = 'low' | 'moderate' | 'high';

interface OnboardingState {
  goal?: Goal;
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  activityLevel?: ActivityLevel;
  dietaryPreference?: DietaryPreference;
  allergies?: string[];
}

export const onboardingState: OnboardingState = {};

export function resetOnboardingState() {
  Object.keys(onboardingState).forEach((key) => delete (onboardingState as any)[key]);
}
