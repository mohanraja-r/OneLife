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
