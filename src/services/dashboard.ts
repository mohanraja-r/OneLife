import { toDateString, startOfToday } from './dates';
import {
  HealthSummary,
  computeStreak,
  formatWater,
  getHealthEntry,
  getHealthGoals,
  getHealthHistory,
  hydrationInsight,
  summariseHealth,
  weekOverWeekSteps,
} from './health';
import {
  NutritionSummary,
  getMealsForDate,
  getNutritionTargets,
  summariseNutrition,
} from './meals';
import {
  ScheduledDose,
  formatTimeLabel,
  getTodaysDoses,
  nextPendingDose,
} from './medicine';
import { PlannerTask, TaskCategory, getTasksForDate } from './planner';
import {
  VitalRow,
  VitalsEntry,
  buildVitalRows,
  getVitals,
  getVitalsHistory,
} from './vitals';

/**
 * The Home dashboard's single read.
 *
 * Home shows six domains at once — activity, hydration, nutrition, medicine,
 * the planner and vitals — and every one of them already has a service. This
 * composes those rather than querying anything itself, so the screen makes one
 * call, the six requests overlap, and no widget can render a different day from
 * its neighbour.
 *
 * Nothing here invents a figure. A domain with nothing logged comes back empty
 * and the card says so.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Days of history behind the week chart, the streak and the trend. */
const HISTORY_DAYS = 14;
/** Days of history behind the Health Overview sparklines. */
const VITALS_HISTORY_DAYS = 7;

const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: 'Work',
  personal: 'Personal',
  fitness: 'Fitness',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which domain a Today's Plan card came from, so the screen can route it. */
export type PlanKind = 'medicine' | 'hydration' | 'task';

/** One card in the Today's Plan strip. */
export interface PlanCard {
  id: string;
  kind: PlanKind;
  title: string;
  /** What it is, e.g. `2 doses` or `Fitness`. */
  subtitle: string;
  /** Where it stands, e.g. `Next: 12:30 PM`, `On track`, `All day`. */
  status: string;
  done: boolean;
}

/** One entry in the "Insights for You" carousel. */
export interface Insight {
  id: string;
  title: string;
  body: string;
  /** Bar fill 0–1, on the insights that describe progress. */
  progress?: number;
  /** Percent change against the previous week, when there is a baseline. */
  delta?: number;
}

/** Everything Home renders for one day. */
export interface DashboardData {
  /** `YYYY-MM-DD` the whole screen describes. */
  date: string;
  isToday: boolean;
  health: HealthSummary;
  /** Consecutive days up to `date` where a goal was met. */
  streak: number;
  /** Percent change in steps against the previous week, or null with no baseline. */
  stepTrend: number | null;
  nutrition: NutritionSummary;
  /** Today's doses. Empty on a past day — the schedule only describes today. */
  doses: ScheduledDose[];
  nextDose: ScheduledDose | null;
  tasks: PlannerTask[];
  plan: PlanCard[];
  vitals: VitalsEntry;
  vitalRows: VitalRow[];
  insights: Insight[];
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/**
 * Builds the Today's Plan strip from what is actually scheduled: the day's
 * doses, the standing hydration goal, and each planner task.
 *
 * The reference design shows a fixed four — Medicine, Workout, Hydration,
 * Mindfulness — but only the first three have anything behind them, and a card
 * for a workout nobody scheduled is decoration. Tasks supply the rest, so the
 * strip is as long as the day is.
 */
export function buildPlan(
  doses: ScheduledDose[],
  tasks: PlannerTask[],
  health: HealthSummary
): PlanCard[] {
  const cards: PlanCard[] = [];

  if (doses.length > 0) {
    const next = nextPendingDose(doses);
    cards.push({
      id: 'medicine',
      kind: 'medicine',
      title: 'Medicine',
      subtitle: `${doses.length} ${doses.length === 1 ? 'dose' : 'doses'}`,
      status: next ? `Next: ${next.label}` : 'All taken',
      done: next === null,
    });
  }

  cards.push({
    id: 'hydration',
    kind: 'hydration',
    title: 'Hydration',
    subtitle: `${formatWater(health.goals.waterGoalMl)} goal`,
    status:
      health.waterRemainingMl === 0
        ? 'Goal met'
        : `${health.waterPercent}% there`,
    done: health.waterRemainingMl === 0,
  });

  for (const task of tasks) {
    cards.push({
      id: task.id,
      kind: 'task',
      title: task.title,
      subtitle: TASK_CATEGORY_LABELS[task.category],
      // Postgres hands back `HH:MM:SS`; the label formatter wants `HH:MM`.
      status: task.time ? formatTimeLabel(task.time.slice(0, 5)) : 'All day',
      done: task.completed,
    });
  }

  return cards;
}

/**
 * Builds the insights carousel from the day's own numbers.
 *
 * Each one is included only when the data supports it, so an account with no
 * history shows fewer cards rather than encouraging figures nobody earned.
 */
export function buildInsights(
  health: HealthSummary,
  streak: number,
  stepTrend: number | null,
  nutrition: NutritionSummary,
  isToday: boolean
): Insight[] {
  const insights: Insight[] = [];
  const stepGoalMet = health.entry.steps >= health.goals.stepGoal;
  const waterGoalMet = health.waterRemainingMl === 0;

  if (stepGoalMet && waterGoalMet) {
    insights.push({
      id: 'both-goals',
      title: 'Great job!',
      body: 'You hit your step goal and stayed hydrated.',
    });
  } else if (stepGoalMet) {
    insights.push({
      id: 'step-goal',
      title: 'Step goal reached',
      body: `${health.entry.steps.toLocaleString()} steps today — nicely done.`,
    });
  } else if (waterGoalMet) {
    insights.push({
      id: 'water-goal',
      title: 'Fully hydrated',
      body: `You reached your ${formatWater(health.goals.waterGoalMl)} goal today.`,
    });
  }

  if (stepTrend !== null) {
    insights.push({
      id: 'weekly-progress',
      title: 'Your weekly progress',
      body:
        stepTrend >= 0
          ? `You're ${stepTrend}% better than last week.`
          : `You're ${Math.abs(stepTrend)}% behind last week.`,
      // The bar reads as "share of this week's goal reached", which is what the
      // percentage is measured against.
      progress: health.stepProgress,
      delta: stepTrend,
    });
  }

  if (streak >= 2) {
    insights.push({
      id: 'streak',
      title: `${streak} day streak`,
      body: 'Keep it up! Consistency brings results.',
    });
  }

  // Only meaningful for the day in progress — pacing advice about a day that
  // already ended is noise.
  const hydration = isToday ? hydrationInsight(health) : null;
  if (hydration) {
    insights.push({ id: 'hydration', title: 'Stay on pace', body: hydration });
  }

  if (!nutrition.empty && nutrition.caloriesLeft > 0) {
    insights.push({
      id: 'calories',
      title: 'Calories left',
      body: `${nutrition.caloriesLeft.toLocaleString()} kcal of your ${nutrition.targets.calories.toLocaleString()} kcal budget still available.`,
      progress: nutrition.calorieProgress,
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Loads every figure Home shows for one day, in a single round of requests. */
export async function getDashboard(
  date: string = toDateString(startOfToday())
): Promise<DashboardData> {
  const isToday = date === toDateString(startOfToday());

  const [
    entry,
    goals,
    history,
    targets,
    meals,
    tasks,
    vitals,
    vitalsHistory,
    doses,
  ] = await Promise.all([
    getHealthEntry(date),
    getHealthGoals(),
    getHealthHistory(HISTORY_DAYS),
    getNutritionTargets(),
    getMealsForDate(date),
    getTasksForDate(date),
    getVitals(date),
    getVitalsHistory(VITALS_HISTORY_DAYS, date),
    // The dose schedule is built for today only, so a past day shows the
    // planner and hydration alone rather than a schedule it cannot reconstruct.
    isToday ? getTodaysDoses() : Promise.resolve<ScheduledDose[]>([]),
  ]);

  const health = summariseHealth(entry, goals);
  const nutrition = summariseNutrition(meals, targets);
  const streak = computeStreak(history, goals, date);
  const stepTrend = weekOverWeekSteps(history, date);

  return {
    date,
    isToday,
    health,
    streak,
    stepTrend,
    nutrition,
    doses,
    nextDose: nextPendingDose(doses),
    tasks,
    plan: buildPlan(doses, tasks, health),
    vitals,
    vitalRows: buildVitalRows(vitals, vitalsHistory),
    insights: buildInsights(health, streak, stepTrend, nutrition, isToday),
  };
}
