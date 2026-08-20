import {
  addDays,
  daysBetween,
  parseDateString,
  shiftDateString,
  startOfToday,
  toDateString,
} from './dates';
import { supabase } from './supabase';

/**
 * Women's Health data access — menstrual cycle tracking and pregnancy.
 *
 * Mirrors the live schema exactly:
 *
 *   cycle_entries   id, user_id, date, flow ('light'|'medium'|'heavy'),
 *                   symptoms text[], mood, bbt numeric, ovulation_test
 *                   ('positive'|'negative'); unique on (user_id, date)
 *   pregnancy_data  user_id (pk), due_date, checkups jsonb, logs jsonb
 *
 * Nothing about a cycle is stored as a derived value: the tables hold only what
 * the user logged, and every number the screen shows — cycle day, phase,
 * averages, predictions — is recomputed from those entries here. That keeps a
 * corrected log from leaving a stale prediction behind.
 *
 * Predictions are population averages applied to the user's own history. They
 * are estimates, not medical advice, which is why the screen carries a
 * disclaimer next to them.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How heavy a period day was. */
export type FlowLevel = 'light' | 'medium' | 'heavy';
/** Result of an at-home LH (ovulation) test. */
export type OvulationTest = 'positive' | 'negative';
/** The four phases of a menstrual cycle. */
export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';

/** One logged day of the cycle. */
export interface CycleEntry {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  flow: FlowLevel | null;
  symptoms: string[];
  mood: string | null;
  /** Basal body temperature in °C. */
  bbt: number | null;
  ovulationTest: OvulationTest | null;
}

/** The writable half of a cycle entry — every field is optional so the log
 *  sheet can save one measurement without clearing the others. */
export interface CycleEntryInput {
  flow?: FlowLevel | null;
  symptoms?: string[];
  mood?: string | null;
  bbt?: number | null;
  ovulationTest?: OvulationTest | null;
}

/** A run of consecutive logged period days. */
export interface PeriodSpan {
  /** `YYYY-MM-DD` of the first day. */
  start: string;
  /** `YYYY-MM-DD` of the last day. */
  end: string;
  /** Inclusive length in days. */
  length: number;
}

/** One phase of the current cycle, with the dates it covers. */
export interface PhaseSpan {
  phase: CyclePhase;
  label: string;
  /** `YYYY-MM-DD`. */
  start: string;
  /** `YYYY-MM-DD`. */
  end: string;
}

/** One bar of the fertility strip under the cycle-day numeral. */
export interface FertilityBar {
  /** 0–1; drives the bar's opacity, peaking across the ovulation window. */
  intensity: number;
  /** True for the bucket today falls in — the bar the caret points at. */
  current: boolean;
}

/** Per-cycle history behind the four trend sparklines, oldest cycle first. */
export interface CycleTrends {
  cycleLengths: number[];
  periodLengths: number[];
  /** Cycle day ovulation landed on — the positive LH test, else the estimate. */
  ovulationDays: number[];
  /** Days in the run-up to each period that carried a logged symptom. */
  pmsDays: number[];
}

/** Everything the Cycle tab renders, derived from the user's logged entries. */
export interface CycleSummary {
  /** False when no period has ever been logged — the screen shows onboarding. */
  hasData: boolean;
  /** 1-based day of the cycle in progress. */
  cycleDay: number;
  phase: CyclePhase;
  /** The line under the numeral, e.g. "Ovulation window • High fertility". */
  phaseLabel: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  lastPeriod: PeriodSpan | null;
  /** `YYYY-MM-DD` the next period is predicted to start. */
  nextPeriodDate: string;
  /** Days until that date; negative once the period is overdue. */
  daysUntilNextPeriod: number;
  /** Cycle day ovulation is expected on. */
  ovulationDay: number;
  /** Average flow as filled droplets out of five; 0 when nothing is logged. */
  averageFlow: number;
  /** Days before the period that typically carry symptoms. */
  pmsDays: number;
  phases: PhaseSpan[];
  fertilityBars: FertilityBar[];
  trends: CycleTrends;
}

/** A scheduled antenatal appointment. */
export interface Checkup {
  id: string;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Free-text clock time, e.g. `11:00 AM`. */
  time?: string;
  /** Clinician or hospital. */
  provider?: string;
}

/** One logged day of a pregnancy. */
export interface PregnancyLog {
  /** `YYYY-MM-DD`. */
  date: string;
  weightKg?: number;
  symptoms?: string[];
  /** Kicks counted in the session. */
  kicks?: number;
  mood?: string;
  sleepHours?: number;
  fundalHeightCm?: number;
  /** As written on the cuff, e.g. `110/70`. */
  bloodPressure?: string;
  notes?: string;
}

/** Ticked hospital-bag items, plus anything the user added themselves. */
export interface BagState {
  /** Catalogue ids that are packed. */
  packed: string[];
  /** User-added items, which live only here and not in the catalogue. */
  custom: { id: string; name: string; categoryId: string }[];
}

/** What is recorded against one completed test, keyed by its template key. */
export interface TestState {
  /** `YYYY-MM-DD` it was done. */
  doneDate: string;
  note?: string;
}

/** Which regional diet chart the user reads. */
export type DietRegion = 'north' | 'south';

/** Who arrived. `twins` is a count rather than a sex, but it is the answer
 *  people give to this question, so it sits in the same list. */
export type BabyOutcome = 'girl' | 'boy' | 'twins';

/** The stored `pregnancy_data` row. */
export interface PregnancyRecord {
  /** `YYYY-MM-DD`. */
  dueDate: string;
  checkups: Checkup[];
  logs: PregnancyLog[];
  /** Weight before the pregnancy began — the baseline every gain is measured
   *  from. Null until she sets it. */
  prePregnancyWeightKg: number | null;
  bag: BagState;
  /** Completed tests, keyed by `TestTemplate.key`. */
  tests: Record<string, TestState>;
  /** Null until she picks one; the diet screen falls back to north. */
  dietRegion: DietRegion | null;
  /** `YYYY-MM-DD` the baby arrived. Null while the pregnancy is ongoing. */
  deliveredOn: string | null;
  babyOutcome: BabyOutcome | null;
}

/** How big the baby is this week, for the size card. */
export interface BabySize {
  /** Comparison object, e.g. `Papaya`. */
  name: string;
  emoji: string;
  /** Crown-rump length in cm. */
  lengthCm: number;
  weightG: number;
  /** One-line development milestone for the week. */
  fact: string;
}

/** Everything the Pregnancy tab renders, derived from the due date and logs. */
export interface PregnancySummary {
  /** Completed weeks of gestation. */
  week: number;
  /** Days into the current week, 0–6. */
  day: number;
  trimester: 1 | 2 | 3;
  trimesterLabel: string;
  weeksToGo: number;
  /** 0–1 along the 40-week term, for the progress bar. */
  progress: number;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  babySize: BabySize;
  /** Weight gained since the earliest logged weight; null without two logs. */
  totalWeightGainKg: number | null;
  /** Latest logged fundal height, else the week-matches-centimetres estimate. */
  fundalHeightCm: number | null;
  /** Latest logged reading, e.g. `110/70`. */
  bloodPressure: string | null;
  /** The soonest checkup still ahead, or null when none is scheduled. */
  nextCheckup: Checkup | null;
  /** Checkups from today onwards, soonest first. */
  upcomingCheckups: Checkup[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback cycle length before the user has logged two periods. */
const DEFAULT_CYCLE_LENGTH = 28;
/** Fallback period length before the user has logged a full period. */
const DEFAULT_PERIOD_LENGTH = 5;
/** The luteal phase is the stable half of a cycle, so ovulation is counted
 *  back from the next period rather than forward from the last one. */
const LUTEAL_LENGTH = 14;
/** Cycle lengths outside this range are treated as a missed log, not a cycle. */
const MIN_CYCLE_LENGTH = 21;
const MAX_CYCLE_LENGTH = 45;
/** A blank day inside a period still counts as the same period, up to this
 *  many days — people skip a light day without meaning to end the period. */
const PERIOD_GAP_TOLERANCE = 2;
/** How many days before a period count as the PMS window. */
const PMS_WINDOW = 5;
/** Bars in the fertility strip under the cycle-day numeral. */
const FERTILITY_BARS = 10;
/** A full term, counted from the last menstrual period. */
const GESTATION_DAYS = 280;

/** How each flow level scores when averaging into droplets. */
const FLOW_WEIGHT: Record<FlowLevel, number> = {
  light: 1,
  medium: 2,
  heavy: 3,
};

/** Human-readable name for each phase. */
const PHASE_NAME: Record<CyclePhase, string> = {
  period: 'Period',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
};

/** The line shown under the cycle-day numeral for each phase. */
const PHASE_CAPTION: Record<CyclePhase, string> = {
  period: 'Period • Low fertility',
  follicular: 'Follicular phase • Rising fertility',
  ovulation: 'Ovulation window • High fertility',
  luteal: 'Luteal phase • Low fertility',
};

/**
 * Week-by-week size comparisons. Lengths are crown-rump in centimetres and
 * weights are grams, both population averages from standard fetal growth
 * charts — an individual baby tracking above or below these is normal.
 */
const BABY_SIZES: (BabySize & { week: number })[] = [
  { week: 4, name: 'Poppy seed', emoji: '🌱', lengthCm: 0.1, weightG: 1, fact: 'The neural tube is starting to form' },
  { week: 5, name: 'Sesame seed', emoji: '🌾', lengthCm: 0.3, weightG: 1, fact: 'The heart begins to beat this week' },
  { week: 6, name: 'Lentil', emoji: '🫘', lengthCm: 0.6, weightG: 1, fact: 'Arm and leg buds are appearing' },
  { week: 7, name: 'Blueberry', emoji: '🫐', lengthCm: 1.3, weightG: 1, fact: 'The brain is growing fast' },
  { week: 8, name: 'Raspberry', emoji: '🍇', lengthCm: 1.6, weightG: 1, fact: 'Fingers and toes are taking shape' },
  { week: 9, name: 'Grape', emoji: '🍇', lengthCm: 2.3, weightG: 2, fact: 'All essential organs have started forming' },
  { week: 10, name: 'Kumquat', emoji: '🍊', lengthCm: 3.1, weightG: 4, fact: 'Tiny nails are beginning to grow' },
  { week: 11, name: 'Fig', emoji: '🫒', lengthCm: 4.1, weightG: 7, fact: 'The baby can open and close their fists' },
  { week: 12, name: 'Lime', emoji: '🍋‍🟩', lengthCm: 5.4, weightG: 14, fact: 'Reflexes are developing' },
  { week: 13, name: 'Lemon', emoji: '🍋', lengthCm: 7.4, weightG: 23, fact: 'Vocal cords are forming' },
  { week: 14, name: 'Peach', emoji: '🍑', lengthCm: 8.7, weightG: 43, fact: 'The baby can squint and frown' },
  { week: 15, name: 'Apple', emoji: '🍎', lengthCm: 10.1, weightG: 70, fact: 'Legs are now longer than the arms' },
  { week: 16, name: 'Avocado', emoji: '🥑', lengthCm: 11.6, weightG: 100, fact: 'The heart pumps around 25 litres a day' },
  { week: 17, name: 'Turnip', emoji: '🥔', lengthCm: 13, weightG: 140, fact: 'Body fat is starting to build up' },
  { week: 18, name: 'Bell pepper', emoji: '🫑', lengthCm: 14.2, weightG: 190, fact: 'The ears are in their final position' },
  { week: 19, name: 'Tomato', emoji: '🍅', lengthCm: 15.3, weightG: 240, fact: 'A protective coating covers the skin' },
  { week: 20, name: 'Banana', emoji: '🍌', lengthCm: 16.4, weightG: 300, fact: 'Halfway there — the anomaly scan is due' },
  { week: 21, name: 'Carrot', emoji: '🥕', lengthCm: 18.1, weightG: 360, fact: 'Movements are becoming easier to feel' },
  { week: 22, name: 'Papaya', emoji: '🥭', lengthCm: 19, weightG: 430, fact: 'Can hear sounds from outside now' },
  { week: 23, name: 'Grapefruit', emoji: '🍊', lengthCm: 20, weightG: 501, fact: 'The lungs are practising breathing' },
  { week: 24, name: 'Corn', emoji: '🌽', lengthCm: 21, weightG: 600, fact: 'Taste buds are developing' },
  { week: 25, name: 'Swede', emoji: '🥬', lengthCm: 22, weightG: 660, fact: 'Hair is growing and gaining colour' },
  { week: 26, name: 'Lettuce', emoji: '🥬', lengthCm: 23, weightG: 760, fact: 'The eyes are beginning to open' },
  { week: 27, name: 'Cauliflower', emoji: '🥦', lengthCm: 24, weightG: 875, fact: 'Sleeping and waking now follow a rhythm' },
  { week: 28, name: 'Aubergine', emoji: '🍆', lengthCm: 25, weightG: 1005, fact: 'Third trimester — the brain is growing quickly' },
  { week: 29, name: 'Butternut squash', emoji: '🎃', lengthCm: 26, weightG: 1153, fact: 'Muscles and lungs keep maturing' },
  { week: 30, name: 'Cabbage', emoji: '🥬', lengthCm: 27, weightG: 1319, fact: 'The baby can tell light from dark' },
  { week: 31, name: 'Coconut', emoji: '🥥', lengthCm: 28, weightG: 1502, fact: 'All five senses are working' },
  { week: 32, name: 'Squash', emoji: '🎃', lengthCm: 28.9, weightG: 1702, fact: 'Most babies have turned head-down soon' },
  { week: 33, name: 'Pineapple', emoji: '🍍', lengthCm: 30, weightG: 1918, fact: 'The skull stays soft and flexible for birth' },
  { week: 34, name: 'Cantaloupe', emoji: '🍈', lengthCm: 31, weightG: 2146, fact: 'Fingernails reach the fingertips' },
  { week: 35, name: 'Honeydew melon', emoji: '🍈', lengthCm: 32, weightG: 2383, fact: 'Weight gain speeds up from here' },
  { week: 36, name: 'Romaine lettuce', emoji: '🥬', lengthCm: 33, weightG: 2622, fact: 'The baby is running out of room to stretch' },
  { week: 37, name: 'Chard', emoji: '🥬', lengthCm: 34, weightG: 2859, fact: 'Early term — the lungs are nearly ready' },
  { week: 38, name: 'Leek', emoji: '🥬', lengthCm: 35, weightG: 3083, fact: 'The grasp reflex is firm now' },
  { week: 39, name: 'Watermelon', emoji: '🍉', lengthCm: 35.6, weightG: 3288, fact: 'Full term — the baby could arrive any day' },
  { week: 40, name: 'Pumpkin', emoji: '🎃', lengthCm: 36.2, weightG: 3462, fact: 'Due date week — most babies come within a fortnight' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CycleEntryRow {
  id: string;
  date: string;
  flow: FlowLevel | null;
  symptoms: string[] | null;
  mood: string | null;
  bbt: number | string | null;
  ovulation_test: OvulationTest | null;
}

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to track your cycle.');
  return userId;
}

/** Maps a `cycle_entries` row onto the camelCase shape the screens consume. */
function toCycleEntry(row: CycleEntryRow): CycleEntry {
  return {
    id: row.id,
    date: row.date,
    flow: row.flow,
    symptoms: row.symptoms ?? [],
    mood: row.mood,
    // Postgres `numeric` arrives as a string, so it has to be coerced.
    bbt: row.bbt === null ? null : Number(row.bbt),
    ovulationTest: row.ovulation_test,
  };
}

/** Rounds to a whole number, falling back when the input is not finite. */
function round(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

/** Mean of a list, or the fallback when it is empty. */
function mean(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Constrains a value to a range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Cycle — reads and writes
// ---------------------------------------------------------------------------

/** Fetches the signed-in user's cycle entries from the last `days`, oldest first. */
export async function getCycleEntries(days = 400): Promise<CycleEntry[]> {
  const userId = await requireUserId();
  const since = toDateString(addDays(startOfToday(), -days));

  const { data, error } = await supabase
    .from('cycle_entries')
    .select('id, date, flow, symptoms, mood, bbt, ovulation_test')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data as CycleEntryRow[]).map(toCycleEntry);
}

/**
 * Saves one day's cycle log, merging into whatever is already stored for that
 * date so logging a mood does not wipe that morning's temperature.
 */
export async function logCycleEntry(
  date: string,
  input: CycleEntryInput
): Promise<CycleEntry> {
  const userId = await requireUserId();

  const row: Record<string, unknown> = { user_id: userId, date };
  if (input.flow !== undefined) row.flow = input.flow;
  if (input.symptoms !== undefined) row.symptoms = input.symptoms;
  if (input.mood !== undefined) row.mood = input.mood;
  if (input.bbt !== undefined) row.bbt = input.bbt;
  if (input.ovulationTest !== undefined) {
    row.ovulation_test = input.ovulationTest;
  }

  const { data, error } = await supabase
    .from('cycle_entries')
    .upsert(row, { onConflict: 'user_id,date' })
    .select('id, date, flow, symptoms, mood, bbt, ovulation_test')
    .single();

  if (error) throw error;
  return toCycleEntry(data);
}

/** Removes a day's cycle log entirely. */
export async function deleteCycleEntry(date: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('cycle_entries')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Cycle — derivations
// ---------------------------------------------------------------------------

/**
 * Groups logged flow days into periods. A blank day inside a period is
 * tolerated (people skip a light day), but a longer gap starts a new period.
 */
export function findPeriods(entries: CycleEntry[]): PeriodSpan[] {
  const flowDays = entries
    .filter((entry) => entry.flow !== null)
    .map((entry) => entry.date)
    .sort();

  const periods: PeriodSpan[] = [];
  for (const date of flowDays) {
    const open = periods[periods.length - 1];
    const gap = open
      ? daysBetween(parseDateString(open.end), parseDateString(date))
      : Infinity;

    if (open && gap <= PERIOD_GAP_TOLERANCE) {
      open.end = date;
      open.length =
        daysBetween(parseDateString(open.start), parseDateString(open.end)) + 1;
    } else {
      periods.push({ start: date, end: date, length: 1 });
    }
  }

  return periods;
}

/** Lengths of the completed cycles between consecutive period starts. */
function completedCycleLengths(periods: PeriodSpan[]): number[] {
  const lengths: number[] = [];
  for (let i = 1; i < periods.length; i += 1) {
    const length = daysBetween(
      parseDateString(periods[i - 1].start),
      parseDateString(periods[i].start)
    );
    // A length outside the plausible range means a period went unlogged, so
    // counting it would drag the average away from the user's real cycle.
    if (length >= MIN_CYCLE_LENGTH && length <= MAX_CYCLE_LENGTH) {
      lengths.push(length);
    }
  }
  return lengths;
}

/** Which phase a cycle day falls in, given the cycle's shape. */
function phaseForDay(
  day: number,
  periodLength: number,
  ovulationDay: number
): CyclePhase {
  if (day <= periodLength) return 'period';
  if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return 'ovulation';
  if (day < ovulationDay) return 'follicular';
  return 'luteal';
}

/**
 * How fertile a cycle day is, 0–1. Peaks across the ovulation window and stays
 * raised over the five days before it, which is how long sperm survive.
 */
function fertilityForDay(day: number, ovulationDay: number): number {
  const offset = day - ovulationDay;
  if (offset >= -1 && offset <= 1) return 1;
  if (offset >= -5 && offset <= 2) return 0.55;
  return 0.15;
}

/** Builds the four phase bands of the cycle starting on `periodStart`. */
function buildPhases(
  periodStart: string,
  periodLength: number,
  ovulationDay: number,
  cycleLength: number
): PhaseSpan[] {
  // Ranges are clamped and skipped when empty so a short cycle (where the
  // period runs into the fertile window) cannot produce a backwards band.
  const bands: { phase: CyclePhase; from: number; to: number }[] = [
    { phase: 'period', from: 1, to: periodLength },
    { phase: 'follicular', from: periodLength + 1, to: ovulationDay - 2 },
    { phase: 'ovulation', from: ovulationDay - 1, to: ovulationDay + 1 },
    { phase: 'luteal', from: ovulationDay + 2, to: cycleLength },
  ];

  return bands
    .map((band) => ({
      phase: band.phase,
      from: clamp(band.from, 1, cycleLength),
      to: clamp(band.to, 1, cycleLength),
    }))
    .filter((band) => band.to >= band.from)
    .map((band) => ({
      phase: band.phase,
      label: PHASE_NAME[band.phase],
      start: shiftDateString(periodStart, band.from - 1),
      end: shiftDateString(periodStart, band.to - 1),
    }));
}

/** Buckets the cycle into the bars of the fertility strip. */
function buildFertilityBars(
  cycleDay: number,
  ovulationDay: number,
  cycleLength: number
): FertilityBar[] {
  const perBar = cycleLength / FERTILITY_BARS;
  const currentIndex = clamp(
    Math.floor((cycleDay - 1) / perBar),
    0,
    FERTILITY_BARS - 1
  );

  return Array.from({ length: FERTILITY_BARS }, (_, index) => {
    // A bar covers several days, so it takes the most fertile of them.
    const first = Math.floor(index * perBar) + 1;
    const last = Math.floor((index + 1) * perBar);
    let intensity = 0;
    for (let day = first; day <= Math.max(first, last); day += 1) {
      intensity = Math.max(intensity, fertilityForDay(day, ovulationDay));
    }
    return { intensity, current: index === currentIndex };
  });
}

/** Counts the days in the PMS window before `periodStart` carrying a symptom. */
function pmsDaysBefore(entries: CycleEntry[], periodStart: string): number {
  const windowStart = shiftDateString(periodStart, -PMS_WINDOW);
  return entries.filter(
    (entry) =>
      entry.date >= windowStart &&
      entry.date < periodStart &&
      entry.symptoms.length > 0
  ).length;
}

/** Cycle day the positive LH test landed on within a cycle, when there is one. */
function testedOvulationDay(
  entries: CycleEntry[],
  cycleStart: string,
  cycleEnd: string
): number | null {
  const positive = entries.find(
    (entry) =>
      entry.ovulationTest === 'positive' &&
      entry.date >= cycleStart &&
      entry.date < cycleEnd
  );
  if (!positive) return null;

  return (
    daysBetween(parseDateString(cycleStart), parseDateString(positive.date)) + 1
  );
}

/** Builds the per-cycle history behind the four trend sparklines. */
function buildTrends(
  entries: CycleEntry[],
  periods: PeriodSpan[],
  fallbackOvulationDay: number
): CycleTrends {
  const cycleLengths: number[] = [];
  const ovulationDays: number[] = [];
  const pmsDays: number[] = [];

  for (let i = 1; i < periods.length; i += 1) {
    const start = periods[i - 1].start;
    const next = periods[i].start;
    const length = daysBetween(parseDateString(start), parseDateString(next));
    if (length < MIN_CYCLE_LENGTH || length > MAX_CYCLE_LENGTH) continue;

    cycleLengths.push(length);
    ovulationDays.push(
      testedOvulationDay(entries, start, next) ??
        Math.max(1, length - LUTEAL_LENGTH)
    );
    pmsDays.push(pmsDaysBefore(entries, next));
  }

  return {
    cycleLengths,
    periodLengths: periods.map((period) => period.length),
    ovulationDays: ovulationDays.length
      ? ovulationDays
      : [fallbackOvulationDay],
    pmsDays,
  };
}

/**
 * Turns raw cycle entries into every number the Cycle tab shows — cycle day,
 * phase, averages, phase bands and predictions.
 */
export function summariseCycle(entries: CycleEntry[]): CycleSummary {
  const today = toDateString(startOfToday());
  const periods = findPeriods(entries);
  const lastPeriod = periods[periods.length - 1] ?? null;

  const lengths = completedCycleLengths(periods);
  const averageCycleLength = round(
    mean(lengths, DEFAULT_CYCLE_LENGTH),
    DEFAULT_CYCLE_LENGTH
  );

  // The period in progress is still growing, so it would understate the
  // average — only completed periods count towards the typical length.
  const completedPeriods = periods.filter((period) => period.end < today);
  const averagePeriodLength = clamp(
    round(
      mean(
        completedPeriods.map((period) => period.length),
        DEFAULT_PERIOD_LENGTH
      ),
      DEFAULT_PERIOD_LENGTH
    ),
    1,
    Math.max(1, averageCycleLength - 1)
  );

  const anchor = lastPeriod?.start ?? today;
  const cycleDay =
    daysBetween(parseDateString(anchor), parseDateString(today)) + 1;

  const estimatedOvulationDay = Math.max(
    1,
    averageCycleLength - LUTEAL_LENGTH
  );
  const ovulationDay =
    testedOvulationDay(entries, anchor, shiftDateString(today, 1)) ??
    estimatedOvulationDay;

  const nextPeriodDate = shiftDateString(anchor, averageCycleLength);
  const daysUntilNextPeriod = daysBetween(
    parseDateString(today),
    parseDateString(nextPeriodDate)
  );

  const flowScores = entries
    .filter((entry) => entry.flow !== null)
    .map((entry) => FLOW_WEIGHT[entry.flow as FlowLevel]);
  const averageFlow = flowScores.length
    ? clamp(round((mean(flowScores) / 3) * 5), 1, 5)
    : 0;

  const loggedPmsDays = periods
    .slice(1)
    .map((period) => pmsDaysBefore(entries, period.start));
  const pmsDays = loggedPmsDays.length
    ? round(mean(loggedPmsDays))
    : Math.min(PMS_WINDOW, averageCycleLength - ovulationDay);

  const phase = phaseForDay(cycleDay, averagePeriodLength, ovulationDay);

  return {
    hasData: lastPeriod !== null,
    cycleDay: Math.max(1, cycleDay),
    phase,
    phaseLabel: PHASE_CAPTION[phase],
    averageCycleLength,
    averagePeriodLength,
    lastPeriod,
    nextPeriodDate,
    daysUntilNextPeriod,
    ovulationDay,
    averageFlow,
    pmsDays,
    phases: buildPhases(
      anchor,
      averagePeriodLength,
      ovulationDay,
      averageCycleLength
    ),
    fertilityBars: buildFertilityBars(
      cycleDay,
      ovulationDay,
      averageCycleLength
    ),
    trends: buildTrends(entries, periods, estimatedOvulationDay),
  };
}

// ---------------------------------------------------------------------------
// Pregnancy — reads and writes
// ---------------------------------------------------------------------------

/** Fetches the signed-in user's pregnancy record, or null when none is set up. */
/**
 * The `pregnancy_data` columns getPregnancy selects, as Postgres returns them:
 * jsonb columns arrive already parsed but can be null, and `numeric` arrives as
 * a string.
 */
interface PregnancyDataRow {
  due_date: string;
  checkups: Checkup[] | null;
  logs: PregnancyLog[] | null;
  pre_pregnancy_weight_kg: string | number | null;
  bag: Partial<BagState> | null;
  tests: Record<string, TestState> | null;
  diet_region: DietRegion | null;
  delivered_on: string | null;
  baby_outcome: BabyOutcome | null;
}

export async function getPregnancy(): Promise<PregnancyRecord | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('pregnancy_data')
    .select(
      'due_date, checkups, logs, pre_pregnancy_weight_kg, bag, tests, diet_region, delivered_on, baby_outcome'
    )
    .eq('user_id', userId)
    .maybeSingle<PregnancyDataRow>();

  if (error) throw error;
  if (!data) return null;

  const row = data;
  const bag = row.bag ?? {};

  return {
    dueDate: row.due_date,
    checkups: [...(row.checkups ?? [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    logs: [...(row.logs ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    // Postgres `numeric` arrives as a string, so it has to be coerced.
    prePregnancyWeightKg:
      row.pre_pregnancy_weight_kg === null ||
      row.pre_pregnancy_weight_kg === undefined
        ? null
        : Number(row.pre_pregnancy_weight_kg),
    bag: { packed: bag.packed ?? [], custom: bag.custom ?? [] },
    tests: row.tests ?? {},
    dietRegion: row.diet_region ?? null,
    deliveredOn: row.delivered_on ?? null,
    babyOutcome: row.baby_outcome ?? null,
  };
}

/** Closes the pregnancy out, recording when the baby arrived and who it was. */
export async function setDelivery(
  deliveredOn: string,
  outcome: BabyOutcome
): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ delivered_on: deliveredOn, baby_outcome: outcome })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Reopens a pregnancy marked delivered by mistake. */
export async function clearDelivery(): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ delivered_on: null, baby_outcome: null })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Records the weight the pregnancy started from — the gain baseline. */
export async function setPrePregnancyWeight(weightKg: number): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ pre_pregnancy_weight_kg: weightKg })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Remembers which regional diet chart she reads. */
export async function setDietRegion(region: DietRegion): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ diet_region: region })
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Writes the complete set of packed hospital-bag item ids.
 *
 * Takes the whole set rather than toggling one id, because toggling meant
 * reading the stored array, changing one entry and writing it back — and two
 * taps in quick succession both read the same array, so the second write
 * dropped the first item. Sending the full intended state makes a late write
 * harmless instead of destructive.
 */
export async function savePackedItems(packed: string[]): Promise<void> {
  const userId = await requireUserId();
  const record = await getPregnancy();
  if (!record) throw new Error('Set a due date before packing your bag.');

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ bag: { ...record.bag, packed } })
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Marks a scheduled test done, or clears it when `doneDate` is null.
 *
 * Stored keyed by the template key rather than as a list, so re-marking the
 * same test overwrites rather than accumulating duplicates.
 */
export async function setTestDone(
  key: string,
  doneDate: string | null,
  note?: string
): Promise<void> {
  const userId = await requireUserId();
  const record = await getPregnancy();
  if (!record) throw new Error('Set a due date before recording tests.');

  const tests = { ...record.tests };
  if (doneDate === null) {
    delete tests[key];
  } else {
    tests[key] = { doneDate, ...(note ? { note } : {}) };
  }

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ tests })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Creates or moves the pregnancy's due date, keeping checkups and logs. */
export async function setDueDate(dueDate: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .upsert({ user_id: userId, due_date: dueDate }, { onConflict: 'user_id' });

  if (error) throw error;
}

/** Ends the pregnancy tracking by removing the record and everything in it. */
export async function clearPregnancy(): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_data')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Saves one day's pregnancy log, merging into that date's existing entry.
 *
 * `logs` is a jsonb array rather than its own table, so the merge is a
 * read-modify-write of the whole array.
 */
export async function logPregnancyEntry(
  date: string,
  input: Omit<PregnancyLog, 'date'>
): Promise<void> {
  const userId = await requireUserId();
  const record = await getPregnancy();
  if (!record) throw new Error('Set a due date before logging.');

  const existing = record.logs.find((log) => log.date === date);
  const merged: PregnancyLog = { ...existing, ...input, date };
  const logs = [
    ...record.logs.filter((log) => log.date !== date),
    merged,
  ].sort((a, b) => a.date.localeCompare(b.date));

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ logs })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Adds an antenatal appointment to the pregnancy record. */
export async function addCheckup(checkup: Omit<Checkup, 'id'>): Promise<void> {
  const userId = await requireUserId();
  const record = await getPregnancy();
  if (!record) throw new Error('Set a due date before adding a checkup.');

  const checkups = [
    ...record.checkups,
    { ...checkup, id: `${Date.now()}` },
  ].sort((a, b) => a.date.localeCompare(b.date));

  const { error } = await supabase
    .from('pregnancy_data')
    .update({ checkups })
    .eq('user_id', userId);

  if (error) throw error;
}

/** Removes an antenatal appointment by id. */
export async function removeCheckup(checkupId: string): Promise<void> {
  const userId = await requireUserId();
  const record = await getPregnancy();
  if (!record) return;

  const { error } = await supabase
    .from('pregnancy_data')
    .update({
      checkups: record.checkups.filter((checkup) => checkup.id !== checkupId),
    })
    .eq('user_id', userId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Pregnancy — derivations
// ---------------------------------------------------------------------------

/** The size comparison for a gestational week, clamped to the chart's range. */
export function babySizeForWeek(week: number): BabySize {
  const bounded = clamp(week, BABY_SIZES[0].week, BABY_SIZES[BABY_SIZES.length - 1].week);
  // Weeks before the first chart entry fall back to it rather than going empty.
  let match = BABY_SIZES[0];
  for (const size of BABY_SIZES) {
    if (size.week <= bounded) match = size;
  }
  return match;
}

/**
 * How long past the due date a record keeps showing on the dashboard.
 *
 * Nothing ends a pregnancy automatically, so a record left in place would
 * otherwise read "week 40, due any day" indefinitely. Two weeks covers a normal
 * overdue stretch; past that the strip hides itself and asks whether the baby
 * has arrived rather than going on asserting something almost certainly wrong.
 */
export const OVERDUE_GRACE_DAYS = 14;

/**
 * True once a record no longer describes an ongoing pregnancy — either because
 * she has marked the baby as delivered, or because the due date is far enough
 * past that carrying on counting would be asserting something almost certainly
 * wrong.
 */
export function isPregnancyStale(record: PregnancyRecord, asOf?: Date): boolean {
  if (record.deliveredOn !== null) return true;

  const day = asOf ?? startOfToday();
  return daysBetween(parseDateString(record.dueDate), day) > OVERDUE_GRACE_DAYS;
}

/**
 * Turns a due date and the logged entries into everything the tab shows.
 *
 * `asOf` defaults to today. Home passes its selected date so that paging back
 * through the dashboard shows the week she was at then, not the week she is at
 * now.
 */
export function summarisePregnancy(
  record: PregnancyRecord,
  asOf?: Date
): PregnancySummary {
  const today = asOf ?? startOfToday();
  const due = parseDateString(record.dueDate);
  const start = addDays(due, -GESTATION_DAYS);

  const daysPregnant = clamp(daysBetween(start, today), 0, GESTATION_DAYS);
  const week = Math.floor(daysPregnant / 7);
  const day = daysPregnant % 7;
  const trimester: 1 | 2 | 3 = week <= 13 ? 1 : week <= 27 ? 2 : 3;

  const withWeight = record.logs.filter(
    (log) => typeof log.weightKg === 'number'
  );
  const totalWeightGainKg =
    withWeight.length >= 2
      ? Number(
          (
            (withWeight[withWeight.length - 1].weightKg as number) -
            (withWeight[0].weightKg as number)
          ).toFixed(1)
        )
      : null;

  const latestFundal = [...record.logs]
    .reverse()
    .find((log) => typeof log.fundalHeightCm === 'number');
  // From roughly week 20 fundal height in centimetres tracks the week number,
  // so that stands in until a measurement is logged.
  const fundalHeightCm =
    latestFundal?.fundalHeightCm ?? (week >= 20 && week <= 36 ? week : null);

  const latestBp = [...record.logs].reverse().find((log) => log.bloodPressure);

  const todayString = toDateString(today);
  const upcomingCheckups = record.checkups.filter(
    (checkup) => checkup.date >= todayString
  );

  return {
    week,
    day,
    trimester,
    trimesterLabel:
      trimester === 1
        ? 'First trimester'
        : trimester === 2
          ? 'Second trimester'
          : 'Third trimester',
    weeksToGo: Math.max(0, Math.ceil((GESTATION_DAYS - daysPregnant) / 7)),
    progress: daysPregnant / GESTATION_DAYS,
    dueDate: record.dueDate,
    babySize: babySizeForWeek(week),
    totalWeightGainKg,
    fundalHeightCm,
    bloodPressure: latestBp?.bloodPressure ?? null,
    nextCheckup: upcomingCheckups[0] ?? null,
    upcomingCheckups,
  };
}
