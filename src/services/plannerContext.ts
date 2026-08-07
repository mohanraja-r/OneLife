import { supabase } from './supabase';

interface ContextItem {
  time: string; // HH:MM
  label: string;
  icon: string;
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

  (meals ?? []).forEach((meal: any) => {
    const time = new Date(meal.logged_at).toTimeString().slice(0, 5);
    const firstItem = meal.items?.[0]?.name ?? 'Meal';
    const extra = (meal.items?.length ?? 1) - 1;
    items.push({
      time,
      label: extra > 0 ? `${firstItem} +${extra} more` : firstItem,
      icon: '🍽️',
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

  (doses ?? []).forEach((dose: any) => {
    const time = new Date(dose.scheduled_for).toTimeString().slice(0, 5);
    const name = dose.medicines?.name ?? 'Medicine';
    items.push({
      time,
      label: `${name} ${dose.status === 'taken' ? '— taken' : '— due'}`,
      icon: '💊',
      status: dose.status === 'taken' ? 'done' : dose.status === 'missed' ? 'due' : 'neutral',
    });
  });

  return items;
}
