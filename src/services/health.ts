import {
  addDays,
  parseDateString,
  shiftDateString,
  startOfToday,
  toDateString,
} from './dates';
import { supabase } from './supabase';

/**
 * Health tracking data access — the daily step count and water intake behind
 * the Health tab.
 *
 * Mirrors the schema added in `migrations/005_health_tracking.sql`:
 *
 *   health_entries  id, user_id, date, steps, water_ml;
 *                   unique on (user_id, date)
 *   profiles        step_goal, water_goal_ml
 *
 * Steps are typed in by hand: nothing here reads a pedometer, so a stored
 * value is whatever the user last entered rather than a running total. When
 * device sync arrives it replaces `setSteps`, not the shape of the row.
 *
 * Goals live on `profiles` because they describe the person, not the day.
 * Raising a goal therefore re-scores past days against the new target, which
 * is what someone changing a goal expects to see.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One calendar day's logged health numbers. */
export interface HealthEntry {
  /** `YYYY-MM-DD`. */
  date: string;
  steps: number;
  waterMl: number;
}

/** The daily targets progress is measured against. */
export interface HealthGoals {
  stepGoal: number;
  waterGoalMl: number;
}

/** Everything the Health tab renders, derived from the entry and the goals. */
export interface HealthSummary {
  entry: HealthEntry;
  goals: HealthGoals;
  /** Steps as a fraction of the goal, clamped to 0–1 for the ring. */
  stepProgress: number;
  /** Water as a fraction of the goal, clamped to 0–1 for the ring. */
  waterProgress: number;
  /** Whole percent of the step goal reached; can exceed 100. */
  stepPercent: number;
  /** Whole percent of the water goal reached; can exceed 100. */
  waterPercent: number;
  /** Steps still to walk, 0 once the goal is met. */
  stepsRemaining: number;
  /** Millilitres still to drink, 0 once the goal is met. */
  waterRemainingMl: number;
  /** Water logged, counted in glasses. */
  glasses: number;
  /** The goal counted in glasses. */
  goalGlasses: number;
  /** True when both goals are met — the state the screen celebrates. */
  allGoalsMet: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Goal used before the profile has one, matching the column default. */
export const DEFAULT_STEP_GOAL = 10000;
/** Goal used before the profile has one, matching the column default. */
export const DEFAULT_WATER_GOAL_ML = 2000;
/** What one glass counts as, for the "6 of 8 glasses" phrasing. */
export const GLASS_ML = 250;

/** The goals a signed-out or brand-new profile falls back to. */
const FALLBACK_GOALS: HealthGoals = {
  stepGoal: DEFAULT_STEP_GOAL,
  waterGoalMl: DEFAULT_WATER_GOAL_ML,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HealthEntryRow {
  date: string;
  steps: number | null;
  water_ml: number | null;
}

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to track your health.');
  return userId;
}

/** Maps a `health_entries` row onto the camelCase shape the screens consume. */
function toHealthEntry(row: HealthEntryRow): HealthEntry {
  return {
    date: row.date,
    steps: row.steps ?? 0,
    waterMl: row.water_ml ?? 0,
  };
}

/** The zero-valued entry a day with nothing logged yet stands in with. */
function emptyEntry(date: string): HealthEntry {
  return { date, steps: 0, waterMl: 0 };
}

/** Constrains a value to a range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to a whole non-negative count, since neither metric can go negative. */
function toCount(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

/** Today's date as the `YYYY-MM-DD` string the `date` column stores. */
export function todayKey(): string {
  return toDateString(startOfToday());
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetches one day's health entry, or a zeroed one when nothing is logged. */
export async function getHealthEntry(
  date: string = todayKey()
): Promise<HealthEntry> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('health_entries')
    .select('date, steps, water_ml')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  // A day with nothing logged has no row at all, which is not an error — the
  // screen still has to render a ring at zero.
  return data ? toHealthEntry(data) : emptyEntry(date);
}

/** The profile columns backing the health goals; both are null until the user
 *  sets a goal of their own. */
interface HealthGoalsRow {
  step_goal: number | null;
  water_goal_ml: number | null;
}

/** Fetches the signed-in user's step and water goals, falling back to defaults. */
export async function getHealthGoals(): Promise<HealthGoals> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select('step_goal, water_goal_ml')
    .eq('id', userId)
    .maybeSingle<HealthGoalsRow>();

  if (error) throw error;
  if (!data) return FALLBACK_GOALS;

  return {
    stepGoal: data.step_goal ?? DEFAULT_STEP_GOAL,
    waterGoalMl: data.water_goal_ml ?? DEFAULT_WATER_GOAL_ML,
  };
}

/** Loads today's entry and the goals together, for the Health tab's first paint. */
export async function getTodayHealth(): Promise<{
  entry: HealthEntry;
  goals: HealthGoals;
}> {
  const date = todayKey();
  const [entry, goals] = await Promise.all([
    getHealthEntry(date),
    getHealthGoals(),
  ]);
  return { entry, goals };
}

/** Fetches the last `days` of entries, oldest first, skipping unlogged days. */
export async function getHealthHistory(days = 7): Promise<HealthEntry[]> {
  const userId = await requireUserId();
  const since = toDateString(
    new Date(startOfToday().getTime() - (days - 1) * 86_400_000)
  );

  const { data, error } = await supabase
    .from('health_entries')
    .select('date, steps, water_ml')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data as HealthEntryRow[]).map(toHealthEntry);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Writes one field of a day's entry, creating the row when the day has none.
 *
 * The upsert keys on the `(user_id, date)` unique constraint, so it cannot
 * race a second row into existence for the same day.
 */
async function upsertEntry(
  date: string,
  patch: Partial<Pick<HealthEntryRow, 'steps' | 'water_ml'>>
): Promise<HealthEntry> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('health_entries')
    .upsert(
      { user_id: userId, date, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select('date, steps, water_ml')
    .single();

  if (error) throw error;
  return toHealthEntry(data);
}

/** Saves the manually entered step count for a day. */
export async function setSteps(
  steps: number,
  date: string = todayKey()
): Promise<HealthEntry> {
  return upsertEntry(date, { steps: toCount(steps) });
}

/** Saves the water logged for a day, in millilitres. */
export async function setWaterMl(
  waterMl: number,
  date: string = todayKey()
): Promise<HealthEntry> {
  return upsertEntry(date, { water_ml: toCount(waterMl) });
}

/** Saves the user's step and water goals onto their profile. */
export async function setHealthGoals(goals: HealthGoals): Promise<HealthGoals> {
  const userId = await requireUserId();

  // Both columns are `check (> 0)`, so a cleared field would be rejected by
  // the database — clamp to 1 here and let the UI enforce anything friendlier.
  const next: HealthGoals = {
    stepGoal: Math.max(1, toCount(goals.stepGoal)),
    waterGoalMl: Math.max(1, toCount(goals.waterGoalMl)),
  };

  const { error } = await supabase
    .from('profiles')
    .update({ step_goal: next.stepGoal, water_goal_ml: next.waterGoalMl })
    .eq('id', userId);

  if (error) throw error;
  return next;
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/** Turns a day's entry and the user's goals into every number the tab shows. */
export function summariseHealth(
  entry: HealthEntry,
  goals: HealthGoals
): HealthSummary {
  // Guarded against a zero goal so a bad profile row cannot divide by zero and
  // paint the ring with NaN.
  const stepGoal = Math.max(1, goals.stepGoal);
  const waterGoal = Math.max(1, goals.waterGoalMl);

  const stepRatio = entry.steps / stepGoal;
  const waterRatio = entry.waterMl / waterGoal;

  return {
    entry,
    goals,
    stepProgress: clamp(stepRatio, 0, 1),
    waterProgress: clamp(waterRatio, 0, 1),
    stepPercent: Math.round(stepRatio * 100),
    waterPercent: Math.round(waterRatio * 100),
    stepsRemaining: Math.max(0, stepGoal - entry.steps),
    waterRemainingMl: Math.max(0, waterGoal - entry.waterMl),
    glasses: Math.round(entry.waterMl / GLASS_ML),
    goalGlasses: Math.round(waterGoal / GLASS_ML),
    allGoalsMet: entry.steps >= stepGoal && entry.waterMl >= waterGoal,
  };
}

/** Formats a step count with thousands separators, e.g. `7,842`. */
export function formatSteps(steps: number): string {
  return steps.toLocaleString();
}

// ---------------------------------------------------------------------------
// Derived activity figures
// ---------------------------------------------------------------------------

/**
 * Stride length as a fraction of height. 0.415 is the standard walking figure;
 * it varies with pace and leg length, so everything built on it is an estimate.
 */
const STRIDE_RATIO = 0.415;
/** Stand-ins when the profile has no measurements yet. */
const FALLBACK_HEIGHT_CM = 170;
const FALLBACK_WEIGHT_KG = 70;
/** Kilocalories burned per step per kilogram of body weight, walking. */
const KCAL_PER_STEP_PER_KG = 0.0005;
/** Typical walking cadence, used to turn a step count into active minutes. */
const STEPS_PER_ACTIVE_MINUTE = 100;
/** Hour the hydration pacing assumes someone stops drinking for the night. */
const WIND_DOWN_HOUR = 22;

/** Estimates distance walked in kilometres from step count and height. */
export function estimateDistanceKm(steps: number, heightCm: number | null): number {
  const strideM = ((heightCm ?? FALLBACK_HEIGHT_CM) * STRIDE_RATIO) / 100;
  return (steps * strideM) / 1000;
}

/** Estimates kilocalories burned walking, from step count and body weight. */
export function estimateCalories(steps: number, weightKg: number | null): number {
  return Math.round(
    steps * (weightKg ?? FALLBACK_WEIGHT_KG) * KCAL_PER_STEP_PER_KG
  );
}

/** Estimates minutes spent walking, assuming a steady everyday cadence. */
export function estimateActiveMinutes(steps: number): number {
  return Math.round(steps / STEPS_PER_ACTIVE_MINUTE);
}

/** Formats a minute count as `1h 24m`, or `45m` under the hour. */
export function formatActiveTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** One column of the weekly steps chart. */
export interface WeekBar {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Single-letter weekday label, e.g. `M`. */
  label: string;
  steps: number;
  /** Height as a fraction of the chart's ceiling, 0–1. */
  height: number;
  /** True for the day being viewed — the bar picked out in full colour. */
  current: boolean;
}

/** The weekly chart's shape: seven bars and the axis they are drawn against. */
export interface WeekChart {
  bars: WeekBar[];
  /** Value at the top of the axis, rounded up to a readable number. */
  ceiling: number;
  /** The busiest day of the week, for the callout above its bar. */
  peak: WeekBar | null;
}

/**
 * Builds the seven-day steps chart ending on `endDate`.
 *
 * Days with no logged entry are drawn as empty bars rather than skipped, so the
 * week always reads as seven columns and a gap is visible as a gap.
 */
export function buildWeekChart(
  entries: HealthEntry[],
  endDate: string,
  stepGoal: number
): WeekChart {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const end = parseDateString(endDate);

  const bars: WeekBar[] = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(end, i - 6);
    const key = toDateString(day);
    return {
      date: key,
      // `narrow` gives the single letter the chart labels each column with.
      label: day.toLocaleDateString(undefined, { weekday: 'narrow' }),
      steps: byDate.get(key)?.steps ?? 0,
      height: 0,
      current: key === endDate,
    };
  });

  // The axis tops out at the goal or the best day, whichever is higher, so a
  // week that beat the goal is not clipped flat.
  const best = Math.max(...bars.map((bar) => bar.steps), 0);
  const ceiling = Math.max(stepGoal, best, 1);
  bars.forEach((bar) => {
    bar.height = Math.min(bar.steps / ceiling, 1);
  });

  const peak = bars.reduce<WeekBar | null>(
    (top, bar) => (bar.steps > 0 && (!top || bar.steps > top.steps) ? bar : top),
    null
  );

  return { bars, ceiling, peak };
}

/**
 * Counts consecutive days up to `endDate` where at least one goal was met.
 *
 * "Either goal" rather than both: a streak that only survives a perfect day is
 * one most people break in the first week, which makes it useless as
 * encouragement.
 */
export function computeStreak(
  entries: HealthEntry[],
  goals: HealthGoals,
  endDate: string
): number {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));

  let streak = 0;
  for (let i = 0; ; i += 1) {
    const key = shiftDateString(endDate, -i);
    const entry = byDate.get(key);
    if (!entry) break;
    const met =
      entry.steps >= goals.stepGoal || entry.waterMl >= goals.waterGoalMl;
    if (!met) break;
    streak += 1;
  }
  return streak;
}

/**
 * Percentage change in steps over the last seven days against the seven before
 * them, or null when there is not enough history to compare.
 */
export function weekOverWeekSteps(
  entries: HealthEntry[],
  endDate: string
): number | null {
  const total = (from: number, to: number) =>
    entries
      .filter((entry) => {
        const start = shiftDateString(endDate, from);
        const end = shiftDateString(endDate, to);
        return entry.date >= start && entry.date <= end;
      })
      .reduce((sum, entry) => sum + entry.steps, 0);

  const previous = total(-13, -7);
  // Without a prior week there is no baseline, and dividing by zero would
  // report an infinite improvement on the first good day.
  if (previous === 0) return null;
  return Math.round(((total(-6, 0) - previous) / previous) * 100);
}

/** How many of the day's two goals have been met. */
export function goalsMet(summary: HealthSummary): number {
  return (
    (summary.entry.steps >= summary.goals.stepGoal ? 1 : 0) +
    (summary.entry.waterMl >= summary.goals.waterGoalMl ? 1 : 0)
  );
}

/**
 * A hydration nudge for the rest of the day, or null once the goal is met.
 *
 * Paces the remainder against the hours left before winding down, so the
 * suggestion is a share of what is outstanding rather than the whole thing.
 */
export function hydrationInsight(
  summary: HealthSummary,
  now: Date = new Date()
): string | null {
  const remaining = summary.waterRemainingMl;
  if (remaining <= 0) return null;

  const hoursLeft = Math.max(0, WIND_DOWN_HOUR - now.getHours());
  if (hoursLeft <= 1) {
    return `${formatWater(remaining)} left to reach your goal today.`;
  }

  // Split what is left over the remaining hours, then suggest the next couple
  // of hours' worth — rounded to a glass-sized number.
  const perHour = remaining / hoursLeft;
  const suggestion = Math.max(
    GLASS_ML,
    Math.round((perHour * 2) / 50) * 50
  );
  const by = new Date(now);
  by.setHours(now.getHours() + 2, 0, 0, 0);
  const byLabel = by.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `Try drinking another ${formatWater(
    Math.min(suggestion, remaining)
  )} before ${byLabel} to stay on pace with your goal.`;
}

/**
 * Splits millilitres into numeral and unit, switching to litres past 1 L, so
 * the droplet readout can size the two differently.
 */
export function splitWater(ml: number): { value: string; unit: string } {
  if (ml < 1000) return { value: String(Math.round(ml)), unit: 'ml' };
  // Trailing zeros are trimmed so 2000 reads `2 L`, not `2.00 L`.
  return {
    value: (ml / 1000).toFixed(2).replace(/\.?0+$/, ''),
    unit: 'L',
  };
}

/** Formats millilitres as litres once past 1 L, e.g. `1.25 L` or `750 ml`. */
export function formatWater(ml: number): string {
  const { value, unit } = splitWater(ml);
  return `${value} ${unit}`;
}
