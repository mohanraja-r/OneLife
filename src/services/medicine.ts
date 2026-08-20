import { supabase } from './supabase';

/**
 * Medicine data access.
 *
 * Mirrors the live `medicines` / `dose_log` schema exactly:
 *
 *   medicines  id, owner_id, is_managed_profile, name, dosage, frequency,
 *              times text[], food_relation, duration_type, duration_end_date,
 *              active
 *   dose_log   id, medicine_id, owner_id, scheduled_for timestamptz,
 *              status ('pending' | 'taken' | 'missed'), taken_at
 *
 * A medicine stores its reminder slots as `times` (["08:00", "21:00"]); there
 * is no per-dose row until the user acts on one, so today's schedule is the
 * cross product of active medicines and their slots, left-joined onto whatever
 * dose_log rows already exist for today.
 */

/** When a dose should be taken relative to a meal. */
export type FoodRelation = 'before' | 'after' | 'any';
/** Whether a medicine runs forever or ends on a set date. */
export type DurationType = 'ongoing' | 'course';
/** State of a single scheduled dose. */
export type DoseStatus = 'pending' | 'taken' | 'missed';

export interface Medicine {
  id: string;
  ownerId: string;
  /**
   * Set when this medicine belongs to a managed family member. A managed member
   * has no account of their own, so the caregiver owns the row and this points
   * at the `family_links` entry that says whose tablet it actually is.
   */
  memberId: string | null;
  name: string;
  dosage: string;
  frequency: string;
  /** Reminder slots in 24-hour `HH:MM` form. */
  times: string[];
  foodRelation: FoodRelation;
  durationType: DurationType;
  /** `YYYY-MM-DD`, or null for an ongoing medicine. */
  durationEndDate: string | null;
  active: boolean;
}

/** The writable half of a medicine — everything the add/edit form collects. */
export interface MedicineInput {
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  foodRelation: FoodRelation;
  durationType: DurationType;
  durationEndDate?: string | null;
  /** False pauses the medicine: it keeps its history but stops being scheduled. */
  active?: boolean;
}

/** One medicine at one reminder slot on a given day. */
export interface ScheduledDose {
  /** `medicineId|HH:MM` — stable across reloads, safe as a list key. */
  id: string;
  medicineId: string;
  name: string;
  dosage: string;
  foodRelation: FoodRelation;
  /** 24-hour slot, e.g. `08:00`. */
  time: string;
  /** Display form of `time`, e.g. `8:00 AM`. */
  label: string;
  /** ISO instant this dose is due. */
  scheduledFor: string;
  status: DoseStatus;
  /** Set once a dose_log row exists for this dose. */
  logId?: string;
}

/** Headline adherence numbers for the Medicine screen's stat row. */
export interface AdherenceSummary {
  /** Doses taken in the last 7 days as a percentage of doses expected. */
  onTrackPercent: number;
  /** Number of active medicines. */
  medicineCount: number;
  /** Doses marked taken in the last 7 days. */
  takenThisWeek: number;
  /** Doses explicitly marked missed in the last 7 days. */
  missedThisWeek: number;
  /** Doses taken on each of the last 7 days, oldest first — the stat sparkline. */
  weeklyTrend: number[];
}

/**
 * Whose medicines a read is about. Managed members' rows sit in the caregiver's
 * own `owner_id`, so the owner alone cannot separate them — every read states
 * both halves and the two never get mixed up.
 */
export interface MedicineScope {
  /** Account holding the rows — the caregiver, for a managed member. */
  ownerId: string;
  /** `family_links.id` for a managed member; null for your own medicines. */
  memberId: string | null;
}

interface MedicineRow {
  id: string;
  owner_id: string;
  member_id: string | null;
  name: string;
  dosage: string;
  frequency: string;
  times: string[] | null;
  food_relation: FoodRelation | null;
  duration_type: DurationType | null;
  duration_end_date: string | null;
  active: boolean | null;
}

/** The `dose_log` columns read when building a day's schedule. */
interface DoseLogRow {
  id: string;
  medicine_id: string;
  scheduled_for: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to manage medicines.');
  return userId;
}

/** Left-pads a clock component to two digits. */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Splits a clock string into hours and minutes, or null when it is not a time.
 *
 * Deliberately strict: a partially typed value such as `930` has no minutes to
 * read, and silently treating that as `undefined` is what used to crash the
 * schedule while it rendered.
 */
function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):([0-5]\d)/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  if (hours > 23) return null;

  return { hours, minutes: Number(match[2]) };
}

/** Canonicalises any stored or typed time to zero-padded 24-hour `HH:MM`. */
function normaliseTime(time: string): string {
  const parsed = parseTime(time);
  return parsed
    ? `${pad(parsed.hours)}:${pad(parsed.minutes)}`
    : time.slice(0, 5);
}

/** Formats a 24-hour `HH:MM` slot as a 12-hour label such as `8:00 AM`. */
export function formatTimeLabel(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;

  const suffix = parsed.hours < 12 ? 'AM' : 'PM';
  const hour12 = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
  return `${hour12}:${pad(parsed.minutes)} ${suffix}`;
}

/** Turns a `HH:MM` slot into a Date today, ready to seed a time picker. */
export function timeToDate(time: string): Date {
  const { hours, minutes } = parseTime(time) ?? { hours: 9, minutes: 0 };
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Turns a picked Date back into the `HH:MM` slot the app stores. */
export function dateToTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Renders a Date as the `YYYY-MM-DD` string Postgres `date` columns expect. */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Builds the local Date for a `HH:MM` slot on the given day. */
function doseInstant(time: string, day: Date): Date {
  const { hours, minutes } = parseTime(time) ?? { hours: 0, minutes: 0 };
  const instant = new Date(day);
  instant.setHours(hours, minutes, 0, 0);
  return instant;
}

/** Maps a `medicines` row onto the camelCase shape the app screens consume. */
function toMedicine(row: MedicineRow): Medicine {
  return {
    id: row.id,
    ownerId: row.owner_id,
    memberId: row.member_id ?? null,
    name: row.name,
    dosage: row.dosage,
    frequency: row.frequency,
    times: (row.times ?? []).map(normaliseTime),
    foodRelation: row.food_relation ?? 'any',
    durationType: row.duration_type ?? 'ongoing',
    durationEndDate: row.duration_end_date,
    active: row.active ?? true,
  };
}

/** Maps a medicine form payload onto the snake_case columns of `medicines`. */
function toRow(input: Partial<MedicineInput>) {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name.trim();
  if (input.dosage !== undefined) row.dosage = input.dosage.trim();
  if (input.frequency !== undefined) row.frequency = input.frequency;
  if (input.times !== undefined) row.times = input.times.map(normaliseTime);
  if (input.foodRelation !== undefined) row.food_relation = input.foodRelation;
  if (input.durationType !== undefined) {
    row.duration_type = input.durationType;
    // An ongoing medicine must not keep a stale end date behind it.
    if (input.durationType === 'ongoing') row.duration_end_date = null;
  }
  if (input.durationEndDate !== undefined && input.durationType !== 'ongoing') {
    row.duration_end_date = input.durationEndDate;
  }
  if (input.active !== undefined) row.active = input.active;

  return row;
}

// ---------------------------------------------------------------------------
// Medicines
// ---------------------------------------------------------------------------

/** Fetches every medicine in one scope, alphabetically. */
async function medicinesForScope(scope: MedicineScope): Promise<Medicine[]> {
  const owned = supabase
    .from('medicines')
    .select('*')
    .eq('owner_id', scope.ownerId)
    .order('name', { ascending: true });

  const { data, error } = await (scope.memberId
    ? owned.eq('member_id', scope.memberId)
    : owned.is('member_id', null));

  if (error) throw error;
  return (data as MedicineRow[]).map(toMedicine);
}

/**
 * Fetches every medicine belonging to the signed-in user, name first.
 *
 * Managed family members' medicines share this `owner_id`, so they are excluded
 * here — they belong on that member's screen, not in your own list.
 */
export async function getAllMedicines(): Promise<Medicine[]> {
  return medicinesForScope({ ownerId: await requireUserId(), memberId: null });
}

/** Fetches the medicines belonging to one family member. */
export async function getMedicinesForMember(
  scope: MedicineScope
): Promise<Medicine[]> {
  return medicinesForScope(scope);
}

/** Fetches a single medicine by id, or null when it no longer exists. */
export async function getMedicineById(
  medicineId: string
): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('id', medicineId)
    .maybeSingle<MedicineRow>();

  if (error) throw error;
  return data ? toMedicine(data) : null;
}

/**
 * Creates a medicine and returns the saved row. Pass `memberId` to file it
 * under a managed family member instead of the signed-in user.
 */
export async function addMedicine(
  input: MedicineInput,
  memberId: string | null = null
): Promise<Medicine> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('medicines')
    .insert({
      active: true,
      ...toRow(input),
      owner_id: userId,
      member_id: memberId,
    })
    .select()
    .single<MedicineRow>();

  if (error) throw error;
  return toMedicine(data);
}

/** Applies a partial edit to a medicine and returns the updated row. */
export async function updateMedicine(
  medicineId: string,
  input: Partial<MedicineInput>
): Promise<Medicine> {
  const { data, error } = await supabase
    .from('medicines')
    .update(toRow(input))
    .eq('id', medicineId)
    .select()
    .single<MedicineRow>();

  if (error) throw error;
  return toMedicine(data);
}

/** Deletes a medicine along with its dose history. */
export async function deleteMedicine(medicineId: string): Promise<void> {
  // dose_log references medicines, so its rows have to go first.
  const { error: logError } = await supabase
    .from('dose_log')
    .delete()
    .eq('medicine_id', medicineId);
  if (logError) throw logError;

  const { error } = await supabase
    .from('medicines')
    .delete()
    .eq('id', medicineId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Doses
// ---------------------------------------------------------------------------

/** Builds today's dose schedule for one scope by expanding each active slot. */
async function todaysDosesForScope(
  scope: MedicineScope
): Promise<ScheduledDose[]> {
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const owned = supabase
    .from('medicines')
    .select('*')
    .eq('owner_id', scope.ownerId)
    .eq('active', true)
    .or(
      `duration_end_date.is.null,duration_end_date.gte.${toDateString(today)}`
    );

  const { data: rows, error } = await (scope.memberId
    ? owned.eq('member_id', scope.memberId)
    : owned.is('member_id', null));

  if (error) throw error;

  const medicines = (rows as MedicineRow[]).map(toMedicine);
  if (medicines.length === 0) return [];

  // Filtered by medicine rather than owner: a managed member's doses are logged
  // against the caregiver's `owner_id`, so the medicine is the only thing that
  // separates their schedule from the caregiver's own.
  const { data: logs, error: logError } = await supabase
    .from('dose_log')
    .select('id, medicine_id, scheduled_for, status')
    .in(
      'medicine_id',
      medicines.map((medicine) => medicine.id)
    )
    .gte('scheduled_for', dayStart.toISOString())
    .lt('scheduled_for', dayEnd.toISOString());

  if (logError) throw logError;

  // Doses are identified by medicine + wall-clock slot, so index the logs the
  // same way rather than by their raw timestamp.
  const logBySlot = new Map<string, { id: string; status: DoseStatus }>();
  for (const log of (logs ?? []) as DoseLogRow[]) {
    const at = new Date(log.scheduled_for);
    const slot = `${log.medicine_id}|${pad(at.getHours())}:${pad(at.getMinutes())}`;
    logBySlot.set(slot, { id: log.id, status: log.status as DoseStatus });
  }

  const doses = medicines.flatMap((medicine) =>
    medicine.times.map<ScheduledDose>((time) => {
      const id = `${medicine.id}|${time}`;
      const log = logBySlot.get(id);
      return {
        id,
        medicineId: medicine.id,
        name: medicine.name,
        dosage: medicine.dosage,
        foodRelation: medicine.foodRelation,
        time,
        label: formatTimeLabel(time),
        scheduledFor: doseInstant(time, today).toISOString(),
        status: log?.status ?? 'pending',
        logId: log?.id,
      };
    })
  );

  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

/** Builds today's dose schedule for the signed-in user. */
export async function getTodaysDoses(): Promise<ScheduledDose[]> {
  return todaysDosesForScope({
    ownerId: await requireUserId(),
    memberId: null,
  });
}

/** Builds today's dose schedule for one family member. */
export async function getTodaysDosesForMember(
  scope: MedicineScope
): Promise<ScheduledDose[]> {
  return todaysDosesForScope(scope);
}

/** Records a dose as taken, missed or back to pending. */
export async function setDoseStatus(
  dose: ScheduledDose,
  status: DoseStatus
): Promise<void> {
  const userId = await requireUserId();
  const takenAt = status === 'taken' ? new Date().toISOString() : null;

  if (dose.logId) {
    const { error } = await supabase
      .from('dose_log')
      .update({ status, taken_at: takenAt })
      .eq('id', dose.logId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('dose_log').insert({
    medicine_id: dose.medicineId,
    owner_id: userId,
    scheduled_for: dose.scheduledFor,
    status,
    taken_at: takenAt,
  });
  if (error) throw error;
}

/** Returns the first dose still pending today, or null when the day is clear. */
export function nextPendingDose(doses: ScheduledDose[]): ScheduledDose | null {
  return doses.find((dose) => dose.status === 'pending') ?? null;
}

/** The all-zero summary, for a scope with no active medicines to score. */
function emptyAdherence(): AdherenceSummary {
  return {
    onTrackPercent: 0,
    medicineCount: 0,
    takenThisWeek: 0,
    missedThisWeek: 0,
    weeklyTrend: new Array<number>(7).fill(0),
  };
}

/** Summarises the last seven days of adherence for one scope. */
async function adherenceForScope(
  scope: MedicineScope
): Promise<AdherenceSummary> {
  // Today plus the six days before it — seven buckets in total.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() - 6);

  const owned = supabase
    .from('medicines')
    .select('id, times')
    .eq('owner_id', scope.ownerId)
    .eq('active', true);

  const { data: medicineRows, error } = await (scope.memberId
    ? owned.eq('member_id', scope.memberId)
    : owned.is('member_id', null));

  if (error) throw error;

  const medicines = medicineRows as { id: string; times: string[] | null }[];
  if (medicines.length === 0) return emptyAdherence();

  // Scoped by medicine, not owner: a managed member's doses carry the
  // caregiver's owner_id, so filtering on that would blend the two together.
  const { data: logRows, error: logError } = await supabase
    .from('dose_log')
    .select('scheduled_for, status')
    .in(
      'medicine_id',
      medicines.map((medicine) => medicine.id)
    )
    .gte('scheduled_for', windowStart.toISOString());

  if (logError) throw logError;

  const dailyDoses = medicines.reduce(
    (total, medicine) => total + (medicine.times?.length ?? 0),
    0
  );

  const logs = logRows as { scheduled_for: string; status: string }[];
  const weeklyTrend = new Array<number>(7).fill(0);
  let takenThisWeek = 0;
  let missedThisWeek = 0;

  for (const log of logs) {
    if (log.status === 'missed') {
      missedThisWeek += 1;
      continue;
    }
    if (log.status !== 'taken') continue;

    takenThisWeek += 1;
    const day = new Date(log.scheduled_for);
    day.setHours(0, 0, 0, 0);
    const bucket =
      6 - Math.round((todayStart.getTime() - day.getTime()) / 86400000);
    if (bucket >= 0 && bucket < 7) weeklyTrend[bucket] += 1;
  }

  const expected = dailyDoses * 7;

  return {
    onTrackPercent: expected
      ? Math.round(Math.min(takenThisWeek / expected, 1) * 100)
      : 0,
    medicineCount: medicines.length,
    takenThisWeek,
    missedThisWeek,
    weeklyTrend,
  };
}

/** Summarises the signed-in user's last seven days for the stat row. */
export async function getAdherenceSummary(): Promise<AdherenceSummary> {
  return adherenceForScope({ ownerId: await requireUserId(), memberId: null });
}

/** Summarises one family member's last seven days of adherence. */
export async function getMemberAdherence(
  scope: MedicineScope
): Promise<AdherenceSummary> {
  return adherenceForScope(scope);
}
