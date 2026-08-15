import { supabase } from './supabase';

export type MealSource = 'photo' | 'manual' | 'quickadd';

export interface MealItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Serving amount the macros above describe, e.g. `120` in "120 g". */
  quantity?: number;
  /** Unit the serving is measured in — `g`, `ml`, `cup`, `piece`. */
  unit?: string;
}

/** Units the serving-size picker offers, in the order it shows them. */
export const SERVING_UNITS = ['g', 'ml', 'piece', 'cup', 'tbsp', 'bowl'] as const;

export interface Meal {
  id: string;
  user_id: string;
  logged_at: string;
  source: MealSource;
  photo_url: string | null;
  items: MealItem[];
  ai_suggestion: string;
  confirmed: boolean;
}

export interface IdentifyMealResult {
  items: MealItem[];
  suggestion: string;
  error?: string;
}

// Calls the identify-meal Edge Function. Never touches the Claude API key —
// that lives server-side only. Returns AI's best guess; nothing is saved
// until the user confirms via saveMeal().
export async function identifyMeal(params: {
  imageBase64?: string;
  mediaType?: string;
  manualText?: string;
}): Promise<IdentifyMealResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const { data: profile } = await supabase
    .from('profiles')
    .select('goal, dietary_preference')
    .eq('id', userId)
    .maybeSingle();

  const { data, error } = await supabase.functions.invoke('identify-meal', {
    body: {
      ...params,
      userGoal: profile?.goal ?? 'maintain',
      dietaryPreference: profile?.dietary_preference ?? 'non_veg',
    },
  });

  if (error) throw error;
  return data as IdentifyMealResult;
}

export interface SaveMealInput {
  source: MealSource;
  photoUrl?: string;
  items: MealItem[];
  aiSuggestion: string;
}

export async function saveMeal(input: SaveMealInput): Promise<Meal> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      source: input.source,
      photo_url: input.photoUrl ?? null,
      items: input.items,
      ai_suggestion: input.aiSuggestion,
      confirmed: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Meal;
}

export async function getTodaysMeals(): Promise<Meal[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', `${todayStr}T00:00:00`)
    .lte('logged_at', `${todayStr}T23:59:59`)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data as Meal[];
}

// Frequently-logged meals for the Home dashboard's "quick add" list — the
// top 5 most-repeated meal item combinations from the last 30 days.
export async function getFrequentMeals(): Promise<Meal[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', thirtyDaysAgo)
    .order('logged_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  // Group by a simple signature (sorted item names joined) and rank by
  // frequency — good enough for v1 without a dedicated aggregation table.
  const meals = data as Meal[];
  const grouped = new Map<string, { meal: Meal; count: number }>();

  for (const meal of meals) {
    const signature = meal.items.map((i) => i.name.toLowerCase()).sort().join('|');
    const existing = grouped.get(signature);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(signature, { meal, count: 1 });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((g) => g.meal);
}

/** Formats an item's serving as a short label ("120 g"), or '' when the AI did
 *  not return a portion for it. */
export function servingLabel(item: MealItem): string {
  if (item.quantity === undefined || !item.unit) return '';
  return `${item.quantity} ${item.unit}`;
}

/** Names a draft meal for the confirm screen — the single item it holds, or the
 *  first item plus a count of the rest. */
export function mealTitle(items: MealItem[]): string {
  if (items.length === 0) return 'Your meal';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} +${items.length - 1}`;
}

/** Sums the macros across a meal's items. Takes just `items` so callers holding
 *  a draft, not a saved Meal, can use it too. */
export function calculateMealTotals(meal: Pick<Meal, 'items'>) {
  return meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ---------------------------------------------------------------------------
// Daily targets — the Nutrition card on Home
// ---------------------------------------------------------------------------

/** A day's calorie and macro budget, in kcal and grams. */
export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** One macro's progress against its target, for the Nutrition card's bars. */
export interface MacroProgress {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  /** Grams eaten so far today. */
  eaten: number;
  /** Grams budgeted for the day. */
  target: number;
  /** `eaten / target`, clamped to 0–1 for the bar fill. */
  progress: number;
}

/** Everything the Nutrition card renders for one day. */
export interface NutritionSummary {
  targets: NutritionTargets;
  eaten: { calories: number; protein: number; carbs: number; fat: number };
  /** Calories still available, floored at 0 once the budget is spent. */
  caloriesLeft: number;
  /** Calories eaten as a fraction of the target, clamped to 0–1 for the ring. */
  calorieProgress: number;
  macros: MacroProgress[];
  /** True when nothing has been logged — the card's empty state. */
  empty: boolean;
}

/**
 * Budget used before onboarding has computed one. These match the reference
 * design's figures rather than any individual's needs, and every profile that
 * finished onboarding overrides them.
 */
export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: 2000,
  protein: 120,
  carbs: 200,
  fat: 70,
};

/** Fetches the signed-in user's calorie and macro targets from their profile. */
export async function getNutritionTargets(): Promise<NutritionTargets> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'daily_calorie_target, macro_protein_target, macro_carbs_target, macro_fat_target'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const row = data;
  if (!row) return DEFAULT_NUTRITION_TARGETS;

  // Each column is nullable and filled in separately by onboarding, so they
  // fall back one at a time rather than all-or-nothing.
  return {
    calories: row.daily_calorie_target ?? DEFAULT_NUTRITION_TARGETS.calories,
    protein: row.macro_protein_target ?? DEFAULT_NUTRITION_TARGETS.protein,
    carbs: row.macro_carbs_target ?? DEFAULT_NUTRITION_TARGETS.carbs,
    fat: row.macro_fat_target ?? DEFAULT_NUTRITION_TARGETS.fat,
  };
}

/** Meals logged on one calendar day (`YYYY-MM-DD`), oldest first. */
export async function getMealsForDate(date: string): Promise<Meal[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data as Meal[];
}

/** Turns a day's meals and the user's targets into the Nutrition card's numbers. */
export function summariseNutrition(
  meals: Meal[],
  targets: NutritionTargets
): NutritionSummary {
  const eaten = meals.reduce(
    (totals, meal) => {
      const mealTotals = calculateMealTotals(meal);
      return {
        calories: totals.calories + mealTotals.calories,
        protein: totals.protein + mealTotals.protein,
        carbs: totals.carbs + mealTotals.carbs,
        fat: totals.fat + mealTotals.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Guarded against a zero target so a bad profile row cannot divide by zero
  // and paint the ring with NaN.
  const ratio = (value: number, target: number) =>
    Math.min(Math.max(value / Math.max(1, target), 0), 1);

  return {
    targets,
    eaten,
    caloriesLeft: Math.max(0, targets.calories - eaten.calories),
    calorieProgress: ratio(eaten.calories, targets.calories),
    macros: [
      {
        key: 'protein',
        label: 'Protein',
        eaten: Math.round(eaten.protein),
        target: targets.protein,
        progress: ratio(eaten.protein, targets.protein),
      },
      {
        key: 'carbs',
        label: 'Carbs',
        eaten: Math.round(eaten.carbs),
        target: targets.carbs,
        progress: ratio(eaten.carbs, targets.carbs),
      },
      {
        key: 'fat',
        label: 'Fats',
        eaten: Math.round(eaten.fat),
        target: targets.fat,
        progress: ratio(eaten.fat, targets.fat),
      },
    ],
    empty: meals.length === 0,
  };
}
