import { supabase } from './supabase';

export type TaskCategory = 'work' | 'personal' | 'fitness';
export type RepeatOption = 'never' | 'daily' | 'weekly' | 'monthly';

export interface PlannerTask {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  repeat: RepeatOption;
  reminder: boolean;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface AddTaskInput {
  title: string;
  category: TaskCategory;
  date: string;
  time?: string;
  repeat?: RepeatOption;
  reminder?: boolean;
  notes?: string;
}

async function getUserId(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('No active session');
  return userId;
}

export async function addTask(input: AddTaskInput): Promise<PlannerTask> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('planner_tasks')
    .insert({
      user_id: userId,
      title: input.title,
      category: input.category,
      date: input.date,
      time: input.time ?? null,
      repeat: input.repeat ?? 'never',
      reminder: input.reminder ?? false,
      notes: input.notes ?? null,
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlannerTask;
}

export async function updateTask(id: string, updates: Partial<AddTaskInput>): Promise<PlannerTask> {
  const { data, error } = await supabase
    .from('planner_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlannerTask;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('planner_tasks').update({ completed }).eq('id', id);
  if (error) throw error;
}

// Tasks for a single day (YYYY-MM-DD), sorted by time. Tasks with no time
// (all-day) are returned first.
export async function getTasksForDate(date: string): Promise<PlannerTask[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('planner_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('time', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return data as PlannerTask[];
}

export async function getTaskById(id: string): Promise<PlannerTask | null> {
  const { data, error } = await supabase
    .from('planner_tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PlannerTask | null;
}
