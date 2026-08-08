import { useEffect, useState } from 'react';

import { parseDateString } from './dates';
import { supabase } from './supabase';

/**
 * Profile data access — both the slice the whole app leans on and the full
 * record the Personal Information screen edits.
 *
 * The bottom nav renders on every screen and needs to know the signed-in
 * user's gender to decide whether the Women's Health tab belongs there, so the
 * read is cached at module level: one request per session, shared by every
 * subscriber, refreshed when the auth state changes.
 */

/** How a user described their gender during onboarding. */
export type Gender = 'woman' | 'man' | 'non_binary' | 'unspecified';

/** Unit a user reads their height in — stored alongside the metric value. */
export type HeightUnit = 'cm' | 'ft_in';

/** Unit a user reads their weight in — stored alongside the metric value. */
export type WeightUnit = 'kg' | 'lb';

/** Storage bucket holding profile photos, one folder per user id. */
const AVATAR_BUCKET = 'Profile';

/**
 * Lifetime of a signed avatar URL. The bucket is private, so every render needs
 * a fresh-enough signature; eight hours comfortably outlives an app session
 * without handing out a link that stays live for weeks.
 */
const AVATAR_URL_TTL_SECONDS = 60 * 60 * 8;

/** The slice of `profiles` shared widgets (nav, headers, greetings) need. */
export interface ProfileSummary {
  id: string;
  /** Display name, falling back to the local part of the email address. */
  name: string;
  /** Sign-in address — read-only everywhere in the app. */
  email: string;
  gender: Gender;
  /** Signed URL ready for `<Image source>`, not the stored object path. */
  avatarUrl: string | null;
}

/** Everything the Personal Information screen shows, editable or not. */
export interface PersonalDetails extends ProfileSummary {
  /** ISO `YYYY-MM-DD`, or null when the user skipped the onboarding step. */
  dateOfBirth: string | null;
  heightCm: number | null;
  heightUnit: HeightUnit;
  weightKg: number | null;
  weightUnit: WeightUnit;
}

/** The fields the Personal Information screen is allowed to write back. */
export type PersonalDetailsDraft = Pick<
  PersonalDetails,
  | 'name'
  | 'gender'
  | 'dateOfBirth'
  | 'heightCm'
  | 'heightUnit'
  | 'weightKg'
  | 'weightUnit'
>;

/** Columns every profile read in this file selects. */
interface ProfileRow {
  name: string | null;
  gender: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  height_unit: string | null;
  weight_kg: number | null;
  weight_unit: string | null;
}

const PROFILE_COLUMNS =
  'name, gender, avatar_url, date_of_birth, height_cm, height_unit, weight_kg, weight_unit';

const GENDERS: readonly string[] = ['woman', 'man', 'non_binary', 'unspecified'];

/** Narrows a stored gender string to the union, defaulting to unspecified. */
function toGender(value: string | null): Gender {
  return GENDERS.includes(value ?? '') ? (value as Gender) : 'unspecified';
}

/**
 * The greeting form of a profile name: the first word, so "Mohanraja R" says
 * "Good morning, Mohanraja".
 */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Returns whole years elapsed since a `YYYY-MM-DD` date of birth. */
export function calculateAge(dateOfBirth: string): number {
  const birth = parseDateString(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ---------------------------------------------------------------------------
// Avatar storage
// ---------------------------------------------------------------------------

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VALUES: Record<string, number> = {};
for (let i = 0; i < BASE64_ALPHABET.length; i++) {
  BASE64_VALUES[BASE64_ALPHABET[i]] = i;
}

/**
 * Decodes base64 into the raw bytes Supabase Storage uploads, hand-rolled
 * because the picker hands us base64 (reading the file instead would mean
 * expo-file-system's legacy API, which throws on SDK 54) and neither `atob`
 * nor a decoder package is a dependency here.
 */
function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  const sextet = (index: number) =>
    index < clean.length ? (BASE64_VALUES[clean[index]] ?? 0) : 0;

  let out = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (sextet(i) << 18) |
      (sextet(i + 1) << 12) |
      (sextet(i + 2) << 6) |
      sextet(i + 3);

    bytes[out++] = (chunk >> 16) & 0xff;
    if (out < byteLength) bytes[out++] = (chunk >> 8) & 0xff;
    if (out < byteLength) bytes[out++] = chunk & 0xff;
  }
  return bytes;
}

/** Maps an image mime type to the file extension the bucket should store. */
function extensionFor(mimeType: string): string {
  const known: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return known[mimeType.toLowerCase()] ?? 'jpg';
}

/**
 * Turns a stored avatar reference into a URL `<Image>` can load. The bucket is
 * private, so a path has to be signed; full URLs are passed through for rows
 * written before photos moved into storage.
 */
async function resolveAvatarUrl(reference: string | null): Promise<string | null> {
  if (!reference) return null;
  if (reference.startsWith('http')) return reference;

  const { data } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(reference, AVATAR_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}

/**
 * Uploads a picked photo as the signed-in user's avatar and points `profiles`
 * at it, returning a signed URL for the new image.
 */
export async function uploadAvatar(
  base64: string,
  mimeType: string
): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('You need to be signed in to change your photo.');

  const { data: existing } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<{ avatar_url: string | null }>();

  // The filename carries a timestamp so the old object can be dropped only
  // after the new one is safely in place.
  const path = `${user.id}/avatar-${Date.now()}.${extensionFor(mimeType)}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, base64ToBytes(base64).buffer as ArrayBuffer, {
      contentType: mimeType,
    });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', user.id);
  if (updateError) throw updateError;

  await removeStoredAvatar(existing?.avatar_url ?? null);
  invalidateProfileSummary();
  return resolveAvatarUrl(path);
}

/** Clears the signed-in user's avatar and deletes the stored image. */
export async function removeAvatar(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('You need to be signed in to change your photo.');

  const { data: existing } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<{ avatar_url: string | null }>();

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);
  if (error) throw error;

  await removeStoredAvatar(existing?.avatar_url ?? null);
  invalidateProfileSummary();
}

/**
 * Deletes a superseded avatar object, ignoring failures — the profile row is
 * already correct by this point, so a leftover file is not worth an error.
 */
async function removeStoredAvatar(reference: string | null): Promise<void> {
  if (!reference || reference.startsWith('http')) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([reference]);
}

// ---------------------------------------------------------------------------
// Personal details
// ---------------------------------------------------------------------------

/** Reads the full profile record behind the Personal Information screen. */
export async function getPersonalDetails(): Promise<PersonalDetails | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()
    .overrideTypes<ProfileRow>();
  if (error) throw error;

  return {
    id: user.id,
    name: data?.name ?? user.email?.split('@')[0] ?? '',
    email: user.email ?? '',
    gender: toGender(data?.gender ?? null),
    avatarUrl: await resolveAvatarUrl(data?.avatar_url ?? null),
    dateOfBirth: data?.date_of_birth ?? null,
    heightCm: data?.height_cm ?? null,
    heightUnit: data?.height_unit === 'ft_in' ? 'ft_in' : 'cm',
    weightKg: data?.weight_kg ?? null,
    weightUnit: data?.weight_unit === 'lb' ? 'lb' : 'kg',
  };
}

/**
 * Writes the edited profile back. `age` is derived rather than edited, so it is
 * recomputed here to stay consistent with the date of birth.
 */
export async function savePersonalDetails(
  draft: PersonalDetailsDraft
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('You need to be signed in to save your profile.');

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    name: draft.name.trim(),
    gender: draft.gender,
    date_of_birth: draft.dateOfBirth,
    age: draft.dateOfBirth ? calculateAge(draft.dateOfBirth) : null,
    height_cm: draft.heightCm,
    height_unit: draft.heightUnit,
    weight_kg: draft.weightKg,
    weight_unit: draft.weightUnit,
  });
  if (error) throw error;

  invalidateProfileSummary();
}

// ---------------------------------------------------------------------------
// Cached summary
// ---------------------------------------------------------------------------

/** Last successful read, so the nav on every screen does not refetch it. */
let cached: ProfileSummary | null = null;
/** The in-flight read, so simultaneous callers share a single request. */
let pending: Promise<ProfileSummary | null> | null = null;
/** Mounted `useProfileSummary` setters, re-run whenever the cache changes. */
const listeners = new Set<(profile: ProfileSummary | null) => void>();

/** Stores a profile as the current one and pushes it to every subscriber. */
function publish(profile: ProfileSummary | null): ProfileSummary | null {
  cached = profile;
  listeners.forEach((listener) => listener(profile));
  return profile;
}

/** Reads the signed-in user's profile summary, from cache unless forced. */
export async function getProfileSummary(
  force = false
): Promise<ProfileSummary | null> {
  if (!force) {
    if (cached) return cached;
    if (pending) return pending;
  }

  pending = (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return publish(null);

    const { data } = await supabase
      .from('profiles')
      .select('name, gender, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .overrideTypes<Pick<ProfileRow, 'name' | 'gender' | 'avatar_url'>>();

    const fallbackName = user.email?.split('@')[0] ?? 'there';
    return publish({
      id: user.id,
      name: data?.name ?? fallbackName,
      email: user.email ?? '',
      gender: toGender(data?.gender ?? null),
      avatarUrl: await resolveAvatarUrl(data?.avatar_url ?? null),
    });
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

/** Forces the next read to hit the network — call after editing the profile. */
export function invalidateProfileSummary(): void {
  cached = null;
  void getProfileSummary(true);
}

// A different session means a different person, so the cache cannot survive an
// auth change. The refresh is deferred because supabase-js serialises calls
// made from inside this callback against the client's own auth lock.
supabase.auth.onAuthStateChange((event) => {
  if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
    return;
  }
  cached = null;
  pending = null;
  setTimeout(() => void getProfileSummary(true), 0);
});

/** Subscribes a component to the cached profile summary, fetching on mount. */
export function useProfileSummary(): ProfileSummary | null {
  const [profile, setProfile] = useState<ProfileSummary | null>(cached);

  useEffect(() => {
    listeners.add(setProfile);
    void getProfileSummary();
    return () => {
      listeners.delete(setProfile);
    };
  }, []);

  return profile;
}

/** True when the signed-in user should see the Women's Health destination. */
export function useWomensHealthEnabled(): boolean {
  return useProfileSummary()?.gender === 'woman';
}
