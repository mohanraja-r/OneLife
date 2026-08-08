import { useEffect, useState } from 'react';

import { supabase } from './supabase';

/**
 * Profile data access for the bits of `profiles` the whole app leans on.
 *
 * The bottom nav renders on every screen and needs to know the signed-in
 * user's gender to decide whether the Women's Health tab belongs there, so the
 * read is cached at module level: one request per session, shared by every
 * subscriber, refreshed when the auth state changes.
 */

/** How a user described their gender during onboarding. */
export type Gender = 'woman' | 'man' | 'non_binary' | 'unspecified';

/** The slice of `profiles` shared widgets (nav, headers, greetings) need. */
export interface ProfileSummary {
  id: string;
  /** Display name, falling back to the local part of the email address. */
  name: string;
  gender: Gender;
  avatarUrl: string | null;
}

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
      .maybeSingle();

    const fallbackName = user.email?.split('@')[0] ?? 'there';
    return publish({
      id: user.id,
      name: data?.name ?? fallbackName,
      gender: (data?.gender as Gender | null) ?? 'unspecified',
      avatarUrl: data?.avatar_url ?? null,
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
