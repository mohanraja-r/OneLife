import { useCallback, useEffect, useState } from 'react';

import type { AdherenceSummary, MedicineScope } from './medicine';
import { getAdherenceSummary, getMemberAdherence } from './medicine';
import { calculateAge, getProfileSummary } from './profile';
import { supabase } from './supabase';

/**
 * Family / caregiver data access.
 *
 * Two kinds of member share one `family_links` table, and the difference runs
 * through everything here:
 *
 *   invite   the member has their own account. `dependent_id` points at it, and
 *            their medicines are theirs — the caregiver can read them (RLS) but
 *            never write them.
 *   managed  the member has no account at all: a parent or grandparent who will
 *            not use a phone app. The row carries their name and date of birth
 *            inline, the caregiver owns their medicines, and `medicines.member_id`
 *            is what says whose tablet is whose.
 */

/** How a family member is connected to the caregiver. */
export type ConnectionType = 'invite' | 'managed';

/** State of an invite the caregiver has sent. */
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

/** One person in the signed-in user's family list. */
export interface FamilyMember {
  /** `family_links.id` — the handle every other call in this file takes. */
  id: string;
  connectionType: ConnectionType;
  /** Their own account id, or null for a managed member. */
  dependentId: string | null;
  name: string;
  /** Free text such as "Mother" or "Partner". */
  relationship: string | null;
  dateOfBirth: string | null;
  /** Whole years, or null when no date of birth is recorded. */
  age: number | null;
  /** Signed URL ready for `<Image source>`, not the stored object path. */
  avatarUrl: string | null;
  /** True when a missed dose should raise a notification for the caregiver. */
  alertOnMissed: boolean;
}

/** A family member with their last seven days of adherence attached. */
export interface FamilyMemberWithAdherence extends FamilyMember {
  adherence: AdherenceSummary;
}

/**
 * The signed-in user as they appear in their own family list — the "You" row at
 * the top, scored the same way as everybody else.
 */
export interface SelfSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  adherence: AdherenceSummary;
}

/**
 * The family's headline number, 0–100.
 *
 * This is an average of medicine adherence, not a wellness score: the app holds
 * no steps, sleep or vitals for anybody else, so doses taken is the only thing
 * it can honestly say about how a family is doing. People with no medicines are
 * left out rather than counted as a perfect score, and a family with no
 * medicines at all has no score — hence null rather than 0.
 */
export function familyScore(entries: AdherenceSummary[]): number | null {
  const scored = entries.filter((entry) => entry.medicineCount > 0);
  if (scored.length === 0) return null;

  const total = scored.reduce((sum, entry) => sum + entry.onTrackPercent, 0);
  return Math.round(total / scored.length);
}

/** An invite the caregiver has sent and nobody has accepted yet. */
export interface FamilyInvite {
  id: string;
  code: string;
  inviteeName: string | null;
  relationship: string | null;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
}

/** Who sent an invite, resolved from the code typed on the other phone. */
export interface InviteSender {
  inviteId: string;
  caregiverName: string;
  relationship: string | null;
}

/** The fields the Add family member screen collects for a managed member. */
export interface ManagedMemberDraft {
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
}

/** The fields the Add family member screen collects when sending an invite. */
export interface InviteDraft {
  inviteeName: string | null;
  relationship: string | null;
}

/** Storage bucket holding profile photos — shared with `profile.ts`. */
const AVATAR_BUCKET = 'Profile';

/** Matches `profile.ts`: long enough to outlive a session, short of a week. */
const AVATAR_URL_TTL_SECONDS = 60 * 60 * 8;

/** Characters an invite code is built from — no O/0 or I/1 to mistype. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** How the joined `profiles` row comes back on an invite-linked member. */
interface LinkedProfileRow {
  id: string;
  name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
}

interface FamilyLinkRow {
  id: string;
  caregiver_id: string;
  dependent_id: string | null;
  relationship: string | null;
  connection_type: ConnectionType;
  display_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  notify_on_missed: string[] | null;
  profiles: LinkedProfileRow | null;
}

interface FamilyInviteRow {
  id: string;
  code: string;
  invitee_name: string | null;
  relationship: string | null;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}

/**
 * `family_links` has two foreign keys into `profiles`, so an embedded read has
 * to name the constraint it means — an unqualified `profiles(...)` is ambiguous
 * and PostgREST rejects it.
 */
const LINK_COLUMNS =
  'id, caregiver_id, dependent_id, relationship, connection_type, display_name, date_of_birth, avatar_url, notify_on_missed, profiles!family_links_dependent_id_fkey (id, name, avatar_url, date_of_birth)';

/** The same read from the member's side, following the caregiver key instead. */
const CAREGIVER_COLUMNS =
  'id, caregiver_id, dependent_id, relationship, connection_type, display_name, date_of_birth, avatar_url, notify_on_missed, profiles!family_links_caregiver_id_fkey (id, name, avatar_url, date_of_birth)';

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to manage your family.');
  return userId;
}

/**
 * Turns a stored avatar reference into a URL `<Image>` can load. The bucket is
 * private, so a path has to be signed; full URLs are passed through unchanged.
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
 * Maps a `family_links` row onto a member, taking the name and photo from the
 * joined profile for an invited member and from the row itself for a managed
 * one — the two store the same facts in different places by necessity.
 */
async function toMember(row: FamilyLinkRow): Promise<FamilyMember> {
  const linked = row.profiles;
  const name = (linked?.name ?? row.display_name ?? '').trim() || 'Family member';
  const dateOfBirth = linked?.date_of_birth ?? row.date_of_birth ?? null;

  return {
    id: row.id,
    connectionType: row.connection_type,
    dependentId: row.dependent_id,
    name,
    relationship: row.relationship,
    dateOfBirth,
    age: dateOfBirth ? calculateAge(dateOfBirth) : null,
    avatarUrl: await resolveAvatarUrl(linked?.avatar_url ?? row.avatar_url),
    // The column is a uuid[] of members to alert on, so a link that lists its
    // own id is one the caregiver wants to hear about.
    alertOnMissed: (row.notify_on_missed ?? []).includes(row.id),
  };
}

/** Builds the medicine scope that finds one member's medicines and doses. */
export function memberScope(
  member: FamilyMember,
  caregiverId: string
): MedicineScope {
  return member.connectionType === 'managed'
    ? { ownerId: caregiverId, memberId: member.id }
    : { ownerId: member.dependentId ?? '', memberId: null };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/** Fetches everyone the signed-in user cares for, newest link last. */
export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('family_links')
    .select(LINK_COLUMNS)
    .eq('caregiver_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return Promise.all((data as unknown as FamilyLinkRow[]).map(toMember));
}

/**
 * Fetches the family list with each member's seven-day adherence attached —
 * the single read behind the Family screen.
 */
export async function getFamilyOverview(): Promise<FamilyMemberWithAdherence[]> {
  const userId = await requireUserId();
  const members = await getFamilyMembers();

  return Promise.all(
    members.map(async (member) => ({
      ...member,
      adherence: await getMemberAdherence(memberScope(member, userId)),
    }))
  );
}

/** Fetches one family member by link id, or null when the link is gone. */
export async function getFamilyMember(
  linkId: string
): Promise<FamilyMember | null> {
  const { data, error } = await supabase
    .from('family_links')
    .select(LINK_COLUMNS)
    .eq('id', linkId)
    .maybeSingle();

  if (error) throw error;
  return data ? toMember(data as unknown as FamilyLinkRow) : null;
}

/** Creates a family member who will never hold an account of their own. */
export async function addManagedMember(
  draft: ManagedMemberDraft
): Promise<FamilyMember> {
  const userId = await requireUserId();

  const name = draft.name.trim();
  if (!name) throw new Error('Please enter their name.');

  const { data, error } = await supabase
    .from('family_links')
    .insert({
      caregiver_id: userId,
      dependent_id: null,
      connection_type: 'managed',
      display_name: name,
      relationship: draft.relationship,
      date_of_birth: draft.dateOfBirth,
    })
    .select(LINK_COLUMNS)
    .single();

  if (error) throw error;

  invalidateFamily();
  return toMember(data as unknown as FamilyLinkRow);
}

/**
 * Edits a managed member's details. An invited member's name and date of birth
 * live on their own profile, so only the relationship is writable for them.
 */
export async function updateFamilyMember(
  linkId: string,
  changes: Partial<ManagedMemberDraft>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.name !== undefined) row.display_name = changes.name.trim();
  if (changes.relationship !== undefined) row.relationship = changes.relationship;
  if (changes.dateOfBirth !== undefined) row.date_of_birth = changes.dateOfBirth;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from('family_links')
    .update(row)
    .eq('id', linkId);
  if (error) throw error;

  invalidateFamily();
}

/**
 * Removes a family member. A managed member's medicines are deleted with them —
 * `medicines.member_id` cascades — but their dose history has to go first,
 * because `dose_log` references the medicines rather than the link.
 */
export async function removeFamilyMember(linkId: string): Promise<void> {
  const { data: owned, error: readError } = await supabase
    .from('medicines')
    .select('id')
    .eq('member_id', linkId);
  if (readError) throw readError;

  const medicineIds = (owned as { id: string }[]).map((row) => row.id);
  if (medicineIds.length > 0) {
    const { error: logError } = await supabase
      .from('dose_log')
      .delete()
      .in('medicine_id', medicineIds);
    if (logError) throw logError;
  }

  const { error } = await supabase
    .from('family_links')
    .delete()
    .eq('id', linkId);
  if (error) throw error;

  invalidateFamily();
}

/**
 * Turns missed-dose alerts on or off for one member.
 *
 * `notify_on_missed` is a uuid[] on the link, so the toggle adds or removes the
 * link's own id rather than writing a boolean.
 */
export async function setMissedDoseAlerts(
  linkId: string,
  enabled: boolean
): Promise<void> {
  const { data, error: readError } = await supabase
    .from('family_links')
    .select('notify_on_missed')
    .eq('id', linkId)
    .maybeSingle()
    .overrideTypes<{ notify_on_missed: string[] | null }>();
  if (readError) throw readError;

  const current = new Set(data?.notify_on_missed ?? []);
  if (enabled) current.add(linkId);
  else current.delete(linkId);

  const { error } = await supabase
    .from('family_links')
    .update({ notify_on_missed: [...current] })
    .eq('id', linkId);
  if (error) throw error;

  invalidateFamily();
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

/** Generates a six-character invite code from the unambiguous alphabet. */
function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Maps a `family_invites` row onto the shape the screens consume. */
function toInvite(row: FamilyInviteRow): FamilyInvite {
  return {
    id: row.id,
    code: row.code,
    inviteeName: row.invitee_name,
    relationship: row.relationship,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Mints a shareable invite for someone who has the app. The code is what the
 * other person types in; delivering it is the caller's job, via the share sheet.
 */
export async function createInvite(draft: InviteDraft): Promise<FamilyInvite> {
  const userId = await requireUserId();

  // The code is unique-indexed, so a collision is a retry rather than an error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('family_invites')
      .insert({
        caregiver_id: userId,
        code: generateCode(),
        invitee_name: draft.inviteeName?.trim() || null,
        relationship: draft.relationship,
      })
      .select('id, code, invitee_name, relationship, status, created_at, expires_at')
      .single()
      .overrideTypes<FamilyInviteRow>();

    if (!error) return toInvite(data);
    // 23505 is unique_violation — anything else is a real failure.
    if ((error as { code?: string }).code !== '23505') throw error;
  }

  throw new Error('Could not create an invite code. Please try again.');
}

/** Fetches the invites the caregiver has sent that nobody has accepted yet. */
export async function getPendingInvites(): Promise<FamilyInvite[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('family_invites')
    .select('id, code, invitee_name, relationship, status, created_at, expires_at')
    .eq('caregiver_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as FamilyInviteRow[]).map(toInvite);
}

/** Cancels an invite so the code stops working. */
export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('family_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId);
  if (error) throw error;

  invalidateFamily();
}

/** One row of `lookup_family_invite`'s result set. */
interface LookupInviteRow {
  invite_id: string;
  caregiver_name: string | null;
  relationship: string | null;
}

/**
 * Resolves an invite code to who sent it, so the invitee can see who they are
 * about to share with before deciding. Returns null for an unknown, expired or
 * already-used code.
 */
export async function lookupInvite(code: string): Promise<InviteSender | null> {
  // The untyped client types every rpc() result as `any`, so the row shape is
  // declared here instead.
  const response = await supabase.rpc('lookup_family_invite', {
    invite_code: code.trim(),
  });
  if (response.error) throw response.error;

  const [row] = (response.data ?? []) as LookupInviteRow[];
  if (!row) return null;

  return {
    inviteId: row.invite_id,
    caregiverName: row.caregiver_name?.trim() || 'Someone',
    relationship: row.relationship,
  };
}

/**
 * Accepts an invite on the signed-in user's behalf and returns the new link id.
 *
 * This goes through a security-definer function rather than a plain insert: the
 * invitee is not the caregiver, so they match neither the invites policy nor
 * `family_links`' caregiver-only insert rule.
 */
export async function acceptInvite(code: string): Promise<string> {
  const response = await supabase.rpc('accept_family_invite', {
    invite_code: code.trim(),
  });
  if (response.error) throw response.error;

  invalidateFamily();
  return response.data as string;
}

/** Fetches the people who can see the signed-in user's medicine adherence. */
export async function getCaregivers(): Promise<FamilyMember[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('family_links')
    .select(CAREGIVER_COLUMNS)
    .eq('dependent_id', userId);

  if (error) throw error;
  return Promise.all((data as unknown as FamilyLinkRow[]).map(toMember));
}

// ---------------------------------------------------------------------------
// Cached list
// ---------------------------------------------------------------------------

/** Bumped on every write, so mounted lists know to read again. */
let revision = 0;
const listeners = new Set<(value: number) => void>();

/** Tells every mounted family list that the data underneath it has changed. */
export function invalidateFamily(): void {
  revision += 1;
  listeners.forEach((listener) => listener(revision));
}

/** What `useFamilyOverview` hands back to a screen. */
export interface FamilyOverviewState {
  /** The signed-in user, for the "You" row above everybody else. */
  self: SelfSummary | null;
  members: FamilyMemberWithAdherence[];
  invites: FamilyInvite[];
  /** Average adherence across everyone with medicines, or null when nobody has. */
  score: number | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Reads the signed-in user as a family row, scored like everybody else. */
async function getSelfSummary(): Promise<SelfSummary | null> {
  const profile = await getProfileSummary();
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    adherence: await getAdherenceSummary(),
  };
}

/**
 * Subscribes a screen to the family list and its pending invites, refetching
 * whenever anything in this file writes.
 */
export function useFamilyOverview(): FamilyOverviewState {
  const [self, setSelf] = useState<SelfSummary | null>(null);
  const [members, setMembers] = useState<FamilyMemberWithAdherence[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(revision);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    listeners.add(setTick);
    return () => {
      listeners.delete(setTick);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [nextSelf, nextMembers, nextInvites] = await Promise.all([
          getSelfSummary(),
          getFamilyOverview(),
          getPendingInvites(),
        ]);
        if (cancelled) return;
        setSelf(nextSelf);
        setMembers(nextMembers);
        setInvites(nextInvites);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Could not load your family.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const score = familyScore([
    ...(self ? [self.adherence] : []),
    ...members.map((member) => member.adherence),
  ]);

  return { self, members, invites, score, loading, error, reload };
}
