/**
 * Calendar-day helpers shared by the domain services.
 *
 * Everything here works in the device's local timezone and speaks `YYYY-MM-DD`,
 * which is what Postgres `date` columns store. Deliberately not `Date`
 * arithmetic on timestamps: a cycle day or a pregnancy week is a count of
 * calendar days, and DST would make a millisecond diff drift by one.
 */

const MS_PER_DAY = 86_400_000;

/** Left-pads a date component to two digits. */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Renders a Date as the `YYYY-MM-DD` string Postgres `date` columns expect. */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` string as local midnight, avoiding UTC drift. */
export function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** Today's calendar date at local midnight. */
export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Returns a new date `days` after the given one; negative values go back. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Same as `addDays` but taking and returning `YYYY-MM-DD` strings. */
export function shiftDateString(value: string, days: number): string {
  return toDateString(addDays(parseDateString(value), days));
}

/** Whole calendar days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** Formats a `YYYY-MM-DD` string as a short label such as `Jul 2`. */
export function formatShortDate(value: string): string {
  return parseDateString(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Formats a `YYYY-MM-DD` string as a full label such as `Nov 14, 2025`. */
export function formatLongDate(value: string): string {
  return parseDateString(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
