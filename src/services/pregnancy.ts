import {
  TEST_SCHEDULE,
  TestKind,
  TestTemplate,
} from '../constants/pregnancyTests';

import {
  addDays,
  daysBetween,
  parseDateString,
  startOfToday,
  toDateString,
} from './dates';
import { supabase } from './supabase';
import type { PregnancyLog, PregnancyRecord } from './women';

/**
 * The pregnancy module's second layer: weight analysis, the derived test
 * schedule, kick-counting sessions and the memories timeline.
 *
 * `women.ts` owns the `pregnancy_data` row itself. This file owns everything
 * built on top of it, so that file does not grow past being readable.
 *
 * Nothing here is medical advice. The weight bands are the Institute of
 * Medicine ranges, which are population guidance and assume a single baby; the
 * kick guidance is the standard count-to-ten method. Both are shown with a
 * disclaimer and neither replaces what her doctor tells her.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Where a logged weight sits against the recommended band. */
export type WeightStatus = 'below' | 'on-track' | 'above' | 'unknown';

/** One weight reading on the chart. */
export interface WeightPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Gestational week the reading was taken at. */
  week: number;
  weightKg: number;
  /** Gain over the pre-pregnancy baseline. */
  gainKg: number;
}

/** The recommended gain band for one gestational week. */
export interface GainBand {
  week: number;
  minKg: number;
  maxKg: number;
}

/** Everything the weight screen renders. */
export interface WeightSummary {
  /** Null until she records a pre-pregnancy weight. */
  prePregnancyKg: number | null;
  currentKg: number | null;
  /** Current minus baseline; null without both. */
  gainKg: number | null;
  /** Pre-pregnancy BMI, when height is known. */
  bmi: number | null;
  /** The IOM total-gain range for that BMI. */
  recommendedMinKg: number;
  recommendedMaxKg: number;
  /** Midpoint of the recommended final weight, for the goal figure. */
  goalKg: number | null;
  /** Progress towards the midpoint of the recommended gain, 0–1. */
  progress: number;
  status: WeightStatus;
  /** One line describing where she is, worded softly. */
  statusLabel: string;
  points: WeightPoint[];
  /** The shaded band, one entry per plotted week. */
  band: GainBand[];
}

/** How a scheduled test stands right now. */
export type TestStatus = 'done' | 'overdue' | 'due' | 'upcoming';

/** One test resolved against the due date and what she has recorded. */
export interface ScheduledTest {
  template: TestTemplate;
  key: string;
  title: string;
  kind: TestKind;
  description: string;
  /** `YYYY-MM-DD` at the middle of the window — the date the card shows. */
  date: string;
  /** `YYYY-MM-DD` the window opens. */
  windowStart: string;
  /** `YYYY-MM-DD` the window closes. */
  windowEnd: string;
  /** e.g. `Between 18w – 22w`. */
  windowLabel: string;
  status: TestStatus;
  /** Days until `date`; negative once past. */
  daysAway: number;
  /** Set when she has marked it done. */
  doneDate?: string;
  note?: string;
}

/** One kick-counting session. */
export interface KickSession {
  id: string;
  /** `YYYY-MM-DD` the session is filed under. */
  date: string;
  startedAt: string;
  /** Null while the session is still running. */
  endedAt: string | null;
  kickCount: number;
  kickTimes: string[];
}

/** The figures under the kick counter. */
export interface KickSummary {
  sessions: number;
  totalKicks: number;
  /** Total counted time across the day, in minutes. */
  totalMinutes: number;
  /** Minutes to reach ten kicks in the most recent session that got there. */
  lastTimeToTenMinutes: number | null;
}

/** One entry on the memories timeline. */
export interface Memory {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  week: number | null;
  dayOfWeek: number | null;
  caption: string | null;
  /** Storage object paths, not URLs — the bucket is private. */
  photoPaths: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A full term from the last menstrual period. */
const GESTATION_DAYS = 280;
/** The bucket personal photographs are stored in. Private. */
const MEMORY_BUCKET = 'pregnancy-memories';
/** Ten movements is the standard count; two hours is the standard window. */
export const KICK_TARGET = 10;
export const KICK_WINDOW_MINUTES = 120;

/**
 * Institute of Medicine total-gain ranges by pre-pregnancy BMI, for a single
 * baby. A twin pregnancy has quite different ranges, which is why the screen
 * says "in case of a single baby" beside the goal figure.
 */
const GAIN_RANGES: { maxBmi: number; minKg: number; maxKg: number }[] = [
  { maxBmi: 18.5, minKg: 12.5, maxKg: 18 },
  { maxBmi: 25, minKg: 11.5, maxKg: 16 },
  { maxBmi: 30, minKg: 7, maxKg: 11.5 },
  { maxBmi: Infinity, minKg: 5, maxKg: 9 },
];

/**
 * Gain expected by the end of the first trimester, before the steady weekly
 * rate begins. Small and much the same whatever the starting BMI — most of the
 * first trimester's change is fluid and appetite, not accumulation.
 */
const FIRST_TRIMESTER_GAIN = { minKg: 0.5, maxKg: 2 };
/** Where the steady second-and-third trimester rate starts. */
const STEADY_FROM_WEEK = 13;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to track a pregnancy.');
  return userId;
}

/** Constrains a value to a range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The gestational week a date falls in, given the due date. */
export function weekOn(dueDate: string, date: string): number {
  const start = addDays(parseDateString(dueDate), -GESTATION_DAYS);
  const days = clamp(
    daysBetween(start, parseDateString(date)),
    0,
    GESTATION_DAYS
  );
  return Math.floor(days / 7);
}

/** Gestational week and day for a date, e.g. `{ week: 22, day: 4 }`. */
export function weekAndDayOn(
  dueDate: string,
  date: string
): { week: number; day: number } {
  const start = addDays(parseDateString(dueDate), -GESTATION_DAYS);
  const days = clamp(
    daysBetween(start, parseDateString(date)),
    0,
    GESTATION_DAYS
  );
  return { week: Math.floor(days / 7), day: days % 7 };
}

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

/** Body mass index from weight in kilograms and height in centimetres. */
export function bmiFor(weightKg: number, heightCm: number): number {
  const metres = heightCm / 100;
  return weightKg / (metres * metres);
}

/** The recommended total gain range for a pre-pregnancy BMI. */
export function gainRangeFor(bmi: number | null): {
  minKg: number;
  maxKg: number;
} {
  // Without a height we cannot compute BMI, so the normal-BMI range stands in.
  // It is the most common case and it errs towards the middle rather than
  // towards either extreme.
  if (bmi === null) return { minKg: 11.5, maxKg: 16 };
  const match = GAIN_RANGES.find((range) => bmi < range.maxBmi);
  return match ?? GAIN_RANGES[GAIN_RANGES.length - 1];
}

/**
 * The recommended gain band at a given week.
 *
 * Gain is not linear across a pregnancy: little accrues in the first trimester,
 * then it settles into a steady weekly rate. Modelling it as a straight line
 * from zero would put every normal early reading below the band.
 */
function bandAtWeek(
  week: number,
  total: { minKg: number; maxKg: number }
): GainBand {
  if (week <= 0) return { week, minKg: 0, maxKg: 0 };

  if (week < STEADY_FROM_WEEK) {
    const share = week / STEADY_FROM_WEEK;
    return {
      week,
      minKg: Number((FIRST_TRIMESTER_GAIN.minKg * share).toFixed(2)),
      maxKg: Number((FIRST_TRIMESTER_GAIN.maxKg * share).toFixed(2)),
    };
  }

  // Remaining gain spread evenly over the weeks left to term.
  const steadyWeeks = 40 - STEADY_FROM_WEEK;
  const elapsed = Math.min(week, 40) - STEADY_FROM_WEEK;
  const share = elapsed / steadyWeeks;

  return {
    week,
    minKg: Number(
      (
        FIRST_TRIMESTER_GAIN.minKg +
        (total.minKg - FIRST_TRIMESTER_GAIN.minKg) * share
      ).toFixed(2)
    ),
    maxKg: Number(
      (
        FIRST_TRIMESTER_GAIN.maxKg +
        (total.maxKg - FIRST_TRIMESTER_GAIN.maxKg) * share
      ).toFixed(2)
    ),
  };
}

/** The full recommended band across the pregnancy, one entry per week. */
export function gainBand(bmi: number | null): GainBand[] {
  const total = gainRangeFor(bmi);
  return Array.from({ length: 41 }, (_, week) => bandAtWeek(week, total));
}

/** How a gain compares with the band at that week, worded gently. */
function describeStatus(
  gainKg: number | null,
  week: number,
  total: { minKg: number; maxKg: number }
): { status: WeightStatus; label: string } {
  if (gainKg === null) {
    return { status: 'unknown', label: 'Log a weight to start tracking' };
  }

  const band = bandAtWeek(week, total);
  // A small margin either side — a single reading a few hundred grams outside
  // the band is noise, and flagging it would be both wrong and unkind.
  const margin = 1;

  if (gainKg < band.minKg - margin) {
    return { status: 'below', label: 'Tracking a little below the guide' };
  }
  if (gainKg > band.maxKg + margin) {
    return { status: 'above', label: 'Tracking a little above the guide' };
  }
  return { status: 'on-track', label: 'On track' };
}

/**
 * Turns the logged weights into everything the weight screen shows.
 *
 * Height comes from the profile; without it BMI is unknown and the normal-BMI
 * band stands in, which is why `heightCm` is nullable rather than required.
 */
export function summariseWeight(
  record: PregnancyRecord,
  heightCm: number | null,
  asOf?: Date
): WeightSummary {
  const baseline = record.prePregnancyWeightKg;
  const bmi =
    baseline !== null && heightCm ? bmiFor(baseline, heightCm) : null;
  const total = gainRangeFor(bmi);

  const points: WeightPoint[] = record.logs
    .filter((log): log is PregnancyLog & { weightKg: number } =>
      typeof log.weightKg === 'number'
    )
    .map((log) => ({
      date: log.date,
      week: weekOn(record.dueDate, log.date),
      weightKg: log.weightKg,
      gainKg:
        baseline === null
          ? 0
          : Number((log.weightKg - baseline).toFixed(1)),
    }));

  const latest = points[points.length - 1] ?? null;
  const currentKg = latest?.weightKg ?? baseline;
  const gainKg =
    baseline === null || currentKg === null
      ? null
      : Number((currentKg - baseline).toFixed(1));

  const week = weekOn(record.dueDate, toDateString(asOf ?? startOfToday()));
  const { status, label } = describeStatus(gainKg, week, total);

  // The goal is the midpoint of the recommended range rather than either end —
  // a single number has to be shown somewhere, and the middle is the least
  // misleading choice.
  const midpointGain = (total.minKg + total.maxKg) / 2;

  return {
    prePregnancyKg: baseline,
    currentKg,
    gainKg,
    bmi,
    recommendedMinKg: total.minKg,
    recommendedMaxKg: total.maxKg,
    goalKg:
      baseline === null ? null : Number((baseline + midpointGain).toFixed(1)),
    progress: gainKg === null ? 0 : clamp(gainKg / midpointGain, 0, 1),
    status,
    statusLabel: label,
    points,
    band: gainBand(bmi),
  };
}

// ---------------------------------------------------------------------------
// Tests and scans
// ---------------------------------------------------------------------------

/** `Between 18w – 22w`, the window line on a test card. */
function windowLabel(template: TestTemplate): string {
  return `Between ${template.fromWeek}w – ${template.toWeek}w`;
}

/**
 * Resolves the schedule against the due date and what has been recorded.
 *
 * Sorted by the date each test actually lands on, with anything overdue pinned
 * above what is merely upcoming — the next thing to do should always be the top
 * thing on the screen, which sorting by template order would not achieve.
 */
export function scheduleTests(
  record: PregnancyRecord,
  asOf?: Date
): ScheduledTest[] {
  const today = asOf ?? startOfToday();
  const start = addDays(parseDateString(record.dueDate), -GESTATION_DAYS);

  const resolved = TEST_SCHEDULE.map((template): ScheduledTest => {
    const done = record.tests[template.key];

    // Most entries hang off the due date. The tetanus booster instead hangs off
    // when the first dose was actually given, so it moves if that slipped.
    let windowStartDate = addDays(start, template.fromWeek * 7);
    let windowEndDate = addDays(start, template.toWeek * 7);

    if (template.afterKey && template.afterWeeks) {
      const previous = record.tests[template.afterKey];
      if (previous) {
        const from = parseDateString(previous.doneDate);
        windowStartDate = addDays(from, template.afterWeeks * 7);
        windowEndDate = addDays(from, (template.afterWeeks + 4) * 7);
      }
    }

    // The card shows one date, so it shows the middle of the window rather than
    // its opening — that is when most people are actually booked in.
    const midDate = addDays(
      windowStartDate,
      Math.round(daysBetween(windowStartDate, windowEndDate) / 2)
    );
    const daysAway = daysBetween(today, midDate);

    let status: TestStatus;
    if (done) {
      status = 'done';
    } else if (daysBetween(today, windowEndDate) < 0) {
      status = 'overdue';
    } else if (daysBetween(today, windowStartDate) <= 0) {
      status = 'due';
    } else {
      status = 'upcoming';
    }

    return {
      template,
      key: template.key,
      title: template.title,
      kind: template.kind,
      description: template.description,
      date: toDateString(midDate),
      windowStart: toDateString(windowStartDate),
      windowEnd: toDateString(windowEndDate),
      windowLabel: windowLabel(template),
      status,
      daysAway,
      ...(done ? { doneDate: done.doneDate, note: done.note } : {}),
    };
  });

  const rank: Record<TestStatus, number> = {
    overdue: 0,
    due: 1,
    upcoming: 2,
    done: 3,
  };

  return resolved.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) {
      return rank[a.status] - rank[b.status];
    }
    return a.date.localeCompare(b.date);
  });
}

// ---------------------------------------------------------------------------
// Kick sessions
// ---------------------------------------------------------------------------

interface KickSessionRow {
  id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  kick_count: number;
  kick_times: string[] | null;
}

/** Maps a `pregnancy_kick_sessions` row onto the shape the screens consume. */
function toKickSession(row: KickSessionRow): KickSession {
  return {
    id: row.id,
    date: row.date,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    kickCount: row.kick_count,
    kickTimes: row.kick_times ?? [],
  };
}

/** Fetches kick sessions from the last `days`, newest first. */
export async function getKickSessions(days = 30): Promise<KickSession[]> {
  const userId = await requireUserId();
  const since = toDateString(addDays(startOfToday(), -days));

  const { data, error } = await supabase
    .from('pregnancy_kick_sessions')
    .select('id, date, started_at, ended_at, kick_count, kick_times')
    .eq('user_id', userId)
    .gte('date', since)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data as KickSessionRow[]).map(toKickSession);
}

/** Opens a new counting session and returns it. */
export async function startKickSession(): Promise<KickSession> {
  const userId = await requireUserId();
  const now = new Date();

  const { data, error } = await supabase
    .from('pregnancy_kick_sessions')
    .insert({
      user_id: userId,
      // Filed under the local calendar day, so a session begun late at night
      // belongs to that evening rather than to the next UTC date.
      date: toDateString(now),
      started_at: now.toISOString(),
      kick_count: 0,
      kick_times: [],
    })
    .select('id, date, started_at, ended_at, kick_count, kick_times')
    .single();

  if (error) throw error;
  return toKickSession(data);
}

/**
 * Records one kick against an open session.
 *
 * The full tap list is written each time rather than incremented server-side,
 * so the stored times always agree with the count even if a write is retried.
 */
export async function recordKick(
  session: KickSession,
  at: Date = new Date()
): Promise<KickSession> {
  const userId = await requireUserId();
  const kickTimes = [...session.kickTimes, at.toISOString()];

  const { data, error } = await supabase
    .from('pregnancy_kick_sessions')
    .update({ kick_count: kickTimes.length, kick_times: kickTimes })
    .eq('id', session.id)
    .eq('user_id', userId)
    .select('id, date, started_at, ended_at, kick_count, kick_times')
    .single();

  if (error) throw error;
  return toKickSession(data);
}

/** Closes a session, stamping when it ended. */
export async function endKickSession(
  sessionId: string,
  at: Date = new Date()
): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_kick_sessions')
    .update({ ended_at: at.toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Discards a session — used when one is abandoned without a single kick. */
export async function deleteKickSession(sessionId: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('pregnancy_kick_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Minutes from the start of a session to its tenth kick, when it got there. */
export function timeToTenMinutes(session: KickSession): number | null {
  if (session.kickTimes.length < KICK_TARGET) return null;

  const start = new Date(session.startedAt).getTime();
  const tenth = new Date(session.kickTimes[KICK_TARGET - 1]).getTime();
  return Math.round((tenth - start) / 60000);
}

/** The day's totals under the counter. */
export function summariseKicks(
  sessions: KickSession[],
  date: string
): KickSummary {
  const today = sessions.filter((session) => session.date === date);

  const totalMinutes = today.reduce((total, session) => {
    const end = session.endedAt ? new Date(session.endedAt).getTime() : null;
    if (end === null) return total;
    const start = new Date(session.startedAt).getTime();
    return total + Math.max(0, Math.round((end - start) / 60000));
  }, 0);

  const withTen = today
    .map(timeToTenMinutes)
    .filter((minutes): minutes is number => minutes !== null);

  return {
    sessions: today.length,
    totalKicks: today.reduce((total, session) => total + session.kickCount, 0),
    totalMinutes,
    lastTimeToTenMinutes: withTen[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

interface MemoryRow {
  id: string;
  date: string;
  week: number | null;
  day_of_week: number | null;
  caption: string | null;
  photo_paths: string[] | null;
}

/** Maps a `pregnancy_memories` row onto the shape the timeline consumes. */
function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    date: row.date,
    week: row.week,
    dayOfWeek: row.day_of_week,
    caption: row.caption,
    photoPaths: row.photo_paths ?? [],
  };
}

/** Fetches the memories timeline, newest first. */
export async function getMemories(): Promise<Memory[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('pregnancy_memories')
    .select('id, date, week, day_of_week, caption, photo_paths')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data as MemoryRow[]).map(toMemory);
}

/**
 * Uploads one photo and returns its storage path.
 *
 * Paths are `<user_id>/<name>` because the storage policies check the first
 * folder segment against the caller — the layout is what enforces privacy.
 */
export async function uploadMemoryPhoto(uri: string): Promise<string> {
  const userId = await requireUserId();

  const response = await fetch(uri);
  const blob = await response.arrayBuffer();

  const extension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExtension = /^(jpg|jpeg|png|heic|webp)$/.test(extension)
    ? extension
    : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${safeExtension}`;

  const { error } = await supabase.storage
    .from(MEMORY_BUCKET)
    .upload(path, blob, {
      contentType: `image/${safeExtension === 'jpg' ? 'jpeg' : safeExtension}`,
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/**
 * Signs a stored path for display.
 *
 * The bucket is private, so there is no permanent public URL — each render asks
 * for a short-lived signed link instead.
 */
export async function signMemoryPhoto(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MEMORY_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}

/** Signs several paths at once, dropping any that fail. */
export async function signMemoryPhotos(
  paths: string[]
): Promise<Record<string, string>> {
  const signed = await Promise.all(
    paths.map(async (path) => [path, await signMemoryPhoto(path)] as const)
  );

  return Object.fromEntries(
    signed.filter((entry): entry is [string, string] => entry[1] !== null)
  );
}

/** Saves one timeline entry against a date, with its already-uploaded photos. */
export async function addMemory(input: {
  date: string;
  week: number;
  dayOfWeek: number;
  caption: string | null;
  photoPaths: string[];
}): Promise<Memory> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('pregnancy_memories')
    .insert({
      user_id: userId,
      date: input.date,
      week: input.week,
      day_of_week: input.dayOfWeek,
      caption: input.caption,
      photo_paths: input.photoPaths,
    })
    .select('id, date, week, day_of_week, caption, photo_paths')
    .single();

  if (error) throw error;
  return toMemory(data);
}

/**
 * Deletes everything belonging to the pregnancy: the record, every kick
 * session, and every memory including the stored photographs.
 *
 * `clearPregnancy` only removes the `pregnancy_data` row. Kick sessions and
 * memories live in their own tables keyed on the user rather than on that row,
 * so without this they would survive and reattach themselves to the next
 * pregnancy — and the photographs would stay in the bucket indefinitely.
 *
 * Irreversible, which is why the screen calling it confirms twice.
 */
export async function deleteAllPregnancyData(): Promise<void> {
  const userId = await requireUserId();

  // Photos first: an orphaned object is invisible but permanent, whereas an
  // orphaned row is at least visible enough to clean up later.
  const memories = await getMemories();
  const paths = memories.flatMap((memory) => memory.photoPaths);
  if (paths.length > 0) {
    await supabase.storage.from(MEMORY_BUCKET).remove(paths);
  }

  const { error: memoryError } = await supabase
    .from('pregnancy_memories')
    .delete()
    .eq('user_id', userId);
  if (memoryError) throw memoryError;

  const { error: kickError } = await supabase
    .from('pregnancy_kick_sessions')
    .delete()
    .eq('user_id', userId);
  if (kickError) throw kickError;

  const { error: recordError } = await supabase
    .from('pregnancy_data')
    .delete()
    .eq('user_id', userId);
  if (recordError) throw recordError;
}

/** How much would be lost by deleting, so the confirmation can name it. */
export async function pregnancyDataFootprint(): Promise<{
  memories: number;
  photos: number;
  kickSessions: number;
  weightLogs: number;
}> {
  const [memories, sessions, record] = await Promise.all([
    getMemories().catch(() => [] as Memory[]),
    getKickSessions(400).catch(() => [] as KickSession[]),
    // Imported lazily to keep this file from depending on the record reader at
    // module scope, which would make the two services circular.
    import('./women').then((module) => module.getPregnancy()),
  ]);

  return {
    memories: memories.length,
    photos: memories.reduce(
      (total, memory) => total + memory.photoPaths.length,
      0
    ),
    kickSessions: sessions.length,
    weightLogs:
      record?.logs.filter((log) => typeof log.weightKg === 'number').length ?? 0,
  };
}

/** Removes a memory and the photographs stored with it. */
export async function deleteMemory(memory: Memory): Promise<void> {
  const userId = await requireUserId();

  // The row goes first: an orphaned object is invisible and harmless, whereas a
  // row pointing at deleted objects renders as broken images.
  const { error } = await supabase
    .from('pregnancy_memories')
    .delete()
    .eq('id', memory.id)
    .eq('user_id', userId);

  if (error) throw error;

  if (memory.photoPaths.length > 0) {
    await supabase.storage.from(MEMORY_BUCKET).remove(memory.photoPaths);
  }
}
