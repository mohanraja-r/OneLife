import { shiftDateString, startOfToday, toDateString } from './dates';
import { supabase } from './supabase';

/**
 * Daily vitals — the numbers behind Home's "Health Overview" card.
 *
 * Mirrors the schema added in `migrations/008_vitals.sql`:
 *
 *   vitals  id, user_id, date, heart_rate, sleep_minutes, stress, energy;
 *           unique on (user_id, date)
 *
 * Every metric is nullable and stays null until the user logs it. Nothing here
 * estimates: a phone in Expo Go cannot read a heart rate or a sleep stage, and
 * a plausible-looking number the user never entered is worse than a dash.
 *
 * Shaped like `health.ts` on purpose — same day-keyed upsert, same split
 * between reads, writes and pure derivations — so the two read as one module.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StressLevel = 'low' | 'moderate' | 'high';
export type EnergyLevel = 'low' | 'ok' | 'good' | 'great';

/** Which metric a row, edit or write is about. */
export type VitalField = 'heartRate' | 'sleepMinutes' | 'stress' | 'energy';

/** One calendar day's logged vitals. Null means "not logged", never zero. */
export interface VitalsEntry {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Resting beats per minute. */
  heartRate: number | null;
  /** Time asleep, in minutes. */
  sleepMinutes: number | null;
  stress: StressLevel | null;
  energy: EnergyLevel | null;
}

/** A single edit, paired so the field and the value cannot drift apart. */
export type VitalPatch =
  | { field: 'heartRate'; value: number | null }
  | { field: 'sleepMinutes'; value: number | null }
  | { field: 'stress'; value: StressLevel | null }
  | { field: 'energy'; value: EnergyLevel | null };

/** One row of the Health Overview card. */
export interface VitalRow {
  field: VitalField;
  label: string;
  /** Formatted reading, or null when the day has nothing logged. */
  value: string | null;
  /** Recent readings for the sparkline, oldest first. */
  series: number[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Selectable stress levels, in the order the chips show them. */
export const STRESS_LEVELS: readonly StressLevel[] = [
  'low',
  'moderate',
  'high',
];

/** Selectable energy levels, in the order the chips show them. */
export const ENERGY_LEVELS: readonly EnergyLevel[] = [
  'low',
  'ok',
  'good',
  'great',
];

export const STRESS_LABELS: Record<StressLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  low: 'Low',
  ok: 'OK',
  good: 'Good',
  great: 'Great',
};

/**
 * Bounds mirroring the table's check constraints, so a bad value is refused by
 * the sheet with a readable message instead of by Postgres with a 400.
 */
export const VITAL_BOUNDS: Record<'heartRate' | 'sleepMinutes', {
  min: number;
  max: number;
}> = {
  heartRate: { min: 20, max: 260 },
  sleepMinutes: { min: 0, max: 1440 },
};

/** Ordinal positions, so the categorical metrics can still draw a sparkline. */
const STRESS_SCALE: Record<StressLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};
const ENERGY_SCALE: Record<EnergyLevel, number> = {
  low: 1,
  ok: 2,
  good: 3,
  great: 4,
};

/** Maps each field to its column, so the upsert never hand-writes snake_case. */
const COLUMNS: Record<VitalField, string> = {
  heartRate: 'heart_rate',
  sleepMinutes: 'sleep_minutes',
  stress: 'stress',
  energy: 'energy',
};

const SELECT_COLUMNS = 'date, heart_rate, sleep_minutes, stress, energy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface VitalsRow {
  date: string;
  heart_rate: number | null;
  sleep_minutes: number | null;
  stress: string | null;
  energy: string | null;
}

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to track your health.');
  return userId;
}

/** Narrows a stored stress string to the union, or null if it is not one. */
function toStress(value: string | null): StressLevel | null {
  return STRESS_LEVELS.includes(value as StressLevel)
    ? (value as StressLevel)
    : null;
}

/** Narrows a stored energy string to the union, or null if it is not one. */
function toEnergy(value: string | null): EnergyLevel | null {
  return ENERGY_LEVELS.includes(value as EnergyLevel)
    ? (value as EnergyLevel)
    : null;
}

/** Maps a `vitals` row onto the camelCase shape the screens consume. */
function toVitalsEntry(row: VitalsRow): VitalsEntry {
  return {
    date: row.date,
    heartRate: row.heart_rate,
    sleepMinutes: row.sleep_minutes,
    stress: toStress(row.stress),
    energy: toEnergy(row.energy),
  };
}

/** The all-null entry a day with nothing logged stands in with. */
export function emptyVitals(date: string): VitalsEntry {
  return {
    date,
    heartRate: null,
    sleepMinutes: null,
    stress: null,
    energy: null,
  };
}

/** Today's date as the `YYYY-MM-DD` string the `date` column stores. */
export function todayKey(): string {
  return toDateString(startOfToday());
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetches one day's vitals, or an all-null entry when nothing is logged. */
export async function getVitals(
  date: string = todayKey()
): Promise<VitalsEntry> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('vitals')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  // A day with nothing logged has no row, which is not an error — the card
  // still has to render four dashes.
  return data ? toVitalsEntry(data) : emptyVitals(date);
}

/** Fetches the last `days` of vitals ending on `endDate`, oldest first. */
export async function getVitalsHistory(
  days = 7,
  endDate: string = todayKey()
): Promise<VitalsEntry[]> {
  const userId = await requireUserId();
  const since = shiftDateString(endDate, -(days - 1));

  const { data, error } = await supabase
    .from('vitals')
    .select(SELECT_COLUMNS)
    .eq('user_id', userId)
    .gte('date', since)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) throw error;
  return data.map(toVitalsEntry);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Writes one metric of a day's entry, creating the row when the day has none.
 *
 * The upsert keys on the `(user_id, date)` unique constraint, so it cannot race
 * a second row into existence for the same day.
 */
export async function setVital(
  patch: VitalPatch,
  date: string = todayKey()
): Promise<VitalsEntry> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('vitals')
    .upsert(
      {
        user_id: userId,
        date,
        [COLUMNS[patch.field]]: patch.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toVitalsEntry(data);
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/** Formats a minute count as `7h 32m`, or `45m` under the hour. */
export function formatSleep(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Splits `7h 32m` worth of minutes into the hours and minutes a sheet edits. */
export function splitSleep(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** Reads one field off an entry as the number a sparkline can plot. */
function seriesValue(entry: VitalsEntry, field: VitalField): number | null {
  switch (field) {
    case 'heartRate':
      return entry.heartRate;
    case 'sleepMinutes':
      return entry.sleepMinutes;
    case 'stress':
      return entry.stress ? STRESS_SCALE[entry.stress] : null;
    case 'energy':
      return entry.energy ? ENERGY_SCALE[entry.energy] : null;
  }
}

/** Formats one field of an entry for display, or null when it is unlogged. */
export function formatVital(
  entry: VitalsEntry,
  field: VitalField
): string | null {
  switch (field) {
    case 'heartRate':
      return entry.heartRate === null ? null : `${entry.heartRate} bpm`;
    case 'sleepMinutes':
      return entry.sleepMinutes === null
        ? null
        : formatSleep(entry.sleepMinutes);
    case 'stress':
      return entry.stress ? STRESS_LABELS[entry.stress] : null;
    case 'energy':
      return entry.energy ? ENERGY_LABELS[entry.energy] : null;
  }
}

/** Human name for each metric, used by the card and the logging sheet. */
export const VITAL_LABELS: Record<VitalField, string> = {
  heartRate: 'Heart Rate',
  sleepMinutes: 'Sleep',
  stress: 'Stress',
  energy: 'Energy',
};

/** The four metrics in the order the Health Overview card lists them. */
export const VITAL_FIELDS: readonly VitalField[] = [
  'heartRate',
  'sleepMinutes',
  'stress',
  'energy',
];

/**
 * Builds the Health Overview rows: today's reading per metric plus the recent
 * series behind it.
 *
 * Unlogged days are dropped from the series rather than plotted as zero — a gap
 * in logging is not a night of no sleep, and a zero would drag the line to the
 * floor and flatten every real reading above it.
 */
export function buildVitalRows(
  entry: VitalsEntry,
  history: VitalsEntry[]
): VitalRow[] {
  return VITAL_FIELDS.map((field) => ({
    field,
    label: VITAL_LABELS[field],
    value: formatVital(entry, field),
    series: history
      .map((day) => seriesValue(day, field))
      .filter((value): value is number => value !== null),
  }));
}

/** True when the day has no metric logged at all — the card's empty state. */
export function isVitalsEmpty(entry: VitalsEntry): boolean {
  return VITAL_FIELDS.every((field) => formatVital(entry, field) === null);
}
