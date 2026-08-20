import { getDashboard } from './dashboard';
import { calculateMealTotals, getTodaysMeals } from './meals';
import { getMedicalRecord, selfScope } from './medical';
import { getAllMedicines } from './medicine';
import { invokeEdgeFunction, supabase } from './supabase';

/** One turn of the assistant conversation, as stored in `chat_messages`. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

/** Maps a `chat_messages` row onto the shape the screen consumes. */
function toMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    role: row.role === 'assistant' ? 'assistant' : 'user',
    content: row.content,
    createdAt: row.created_at,
  };
}

/** Returns the signed-in user's id, throwing when there is no session. */
async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('No active session');
  return userId;
}

/** Reads the signed-in user's whole conversation, oldest turn first. */
export async function getChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ChatRow[]).map(toMessage);
}

/** Appends one turn to the conversation and returns the stored row. */
export async function addMessage(
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role, content })
    .select('id, role, content, created_at')
    .single();

  if (error) throw error;
  return toMessage(data);
}

/** Deletes every message in the signed-in user's conversation. */
export async function clearChatMessages(): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/** The snapshot of a user's own data the assistant is allowed to answer from. */
export interface AssistantContext {
  profile: Record<string, unknown> | null;
  medicines: { name: string; dosage: string; times: string[] }[];
  medicalInfo: Record<string, unknown> | null;
  recentMeals: { title: string; calories: number }[];
  healthData: Record<string, unknown> | null;
}

/**
 * Gathers the user's profile, medicines, medical record and today's numbers
 * into the single payload the assistant answers personal questions from.
 *
 * Each read is independent and any one of them may be empty for a new account,
 * so a failure degrades that section to null rather than failing the whole
 * turn — an assistant that can still answer general questions beats one that
 * refuses to reply because a record is missing.
 */
export async function buildAssistantContext(): Promise<AssistantContext> {
  const [profileRes, medicinesRes, medicalRes, mealsRes, dashboardRes] =
    await Promise.allSettled([
      (async () => {
        const userId = await requireUserId();
        const { data } = await supabase
          .from('profiles')
          .select('name, gender, goal, dietary_preference, eating_style')
          .eq('id', userId)
          .maybeSingle();
        return data;
      })(),
      getAllMedicines(),
      (async () => getMedicalRecord(await selfScope()))(),
      getTodaysMeals(),
      getDashboard(),
    ]);

  const medicines =
    medicinesRes.status === 'fulfilled'
      ? medicinesRes.value.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          times: m.times,
        }))
      : [];

  const medicalInfo =
    medicalRes.status === 'fulfilled'
      ? {
          bloodType: medicalRes.value.bloodType,
          allergies: medicalRes.value.allergies.map((a) => a.name),
          conditions: medicalRes.value.conditions.map((c) => c.name),
        }
      : null;

  const recentMeals =
    mealsRes.status === 'fulfilled'
      ? mealsRes.value.map((meal) => ({
          title: meal.items.map((i) => i.name).join(', '),
          calories: calculateMealTotals(meal).calories,
        }))
      : [];

  const healthData =
    dashboardRes.status === 'fulfilled'
      ? {
          caloriesEaten: dashboardRes.value.nutrition.eaten.calories,
          calorieTarget: dashboardRes.value.nutrition.targets.calories,
          caloriesLeft: dashboardRes.value.nutrition.caloriesLeft,
          steps: dashboardRes.value.health.entry.steps,
          stepGoal: dashboardRes.value.health.goals.stepGoal,
          waterMl: dashboardRes.value.health.entry.waterMl,
          waterGoalMl: dashboardRes.value.health.goals.waterGoalMl,
        }
      : null;

  return {
    profile:
      profileRes.status === 'fulfilled' && profileRes.value
        ? (profileRes.value)
        : null,
    medicines,
    medicalInfo,
    recentMeals,
    healthData,
  };
}

/**
 * Sends one question to the `ai-chat` edge function along with the running
 * conversation and the user's own data, and returns the assistant's reply.
 */
export async function askAssistant(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const context = await buildAssistantContext();

  const result = await invokeEdgeFunction<{ content?: string; error?: string }>(
    'ai-chat',
    {
      message,
      conversationHistory: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      userContext: context,
    }
  );

  if (result.error) throw new Error(result.error);
  if (!result.content) throw new Error('The assistant did not return a reply.');

  return result.content;
}
