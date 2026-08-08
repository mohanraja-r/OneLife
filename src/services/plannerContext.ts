import { supabase } from './supabase';

/** Shape of the joined rows this module reads; the client is untyped, so the
 *  queries below are cast to these rather than passed around as `any`. */
interface MealRow {
  logged_at: string;
  items: { name?: string | null }[] | null;
}

interface DoseRow {
  scheduled_for: string;
  status: string;
  medicines: { name?: string | null; dosage?: string | null } | null;
}

/** Which tracker a read-only timeline marker came from. */
export type ContextKind = 'meal' | 'medicine';

export interface ContextItem {
  time: string; // HH:MM
  label: string;
  /** Sub-line under the label — the dosage, or how many items the meal had. */
  detail: string;
  kind: ContextKind;
  status: 'done' | 'due' | 'neutral';
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Pulls meals logged and medicine doses due/taken on a given date, formatted
// as read-only timeline markers. These are context only — editing a meal or
// medicine happens on their own tabs, not from the Planner.
export async function getTasksContextForDate(date: string): Promise<ContextItem[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const items: ContextItem[] = [];

  // Meals logged that day
  const { data: meals } = await supabase
    .from('meals')
    .select('logged_at, items')
    .eq('user_id', userId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`);

  ((meals ?? []) as MealRow[]).forEach((meal) => {
    const time = new Date(meal.logged_at).toTimeString().slice(0, 5);
    const firstItem = meal.items?.[0]?.name ?? 'Meal';
    const count = meal.items?.length ?? 1;
    items.push({
      time,
      label: firstItem,
      detail: count > 1 ? `${count} items logged` : 'Logged',
      kind: 'meal',
      status: 'done',
    });
  });

  // Medicine doses due that day
  const { data: doses } = await supabase
    .from('dose_log')
    .select('scheduled_for, status, medicine_id, medicines(name, dosage)')
    .eq('owner_id', userId)
    .gte('scheduled_for', `${date}T00:00:00`)
    .lte('scheduled_for', `${date}T23:59:59`);

  ((doses ?? []) as DoseRow[]).forEach((dose) => {
    const time = new Date(dose.scheduled_for).toTimeString().slice(0, 5);
    const name = dose.medicines?.name ?? 'Medicine';
    const dosage = dose.medicines?.dosage ?? '';
    const state = dose.status === 'taken' ? 'Taken' : dose.status === 'missed' ? 'Missed' : 'Due';
    items.push({
      time,
      label: name,
      detail: dosage ? `${dosage} · ${state}` : state,
      kind: 'medicine',
      status: dose.status === 'taken' ? 'done' : dose.status === 'missed' ? 'due' : 'neutral',
    });
  });

  return items;
}
