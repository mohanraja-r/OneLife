-- Family / caregiver mode. Run in Supabase SQL Editor.
--
-- `family_links` already existed but could not back either half of the feature:
--   * a managed member (a parent who will never hold an account) had nowhere to
--     store a name, because every link pointed at a real `profiles` row;
--   * a caregiver could read a member's `dose_log` but not their `profiles` row
--     or their `medicines`, so the list rendered nameless doses;
--   * there was no way to remove a link, and no invite mechanism at all.
--
-- This migration closes all four gaps.

-- ---------------------------------------------------------------------------
-- 1. family_links — carry managed members inline
-- ---------------------------------------------------------------------------

alter table family_links
  add column if not exists display_name  text,
  add column if not exists date_of_birth date,
  add column if not exists avatar_url    text,
  add column if not exists created_at    timestamptz not null default now();

-- Both were nullable only because nothing wrote the table yet.
alter table family_links alter column caregiver_id    set not null;
alter table family_links alter column connection_type set not null;

-- A managed member has no account, so it carries its own name and leaves
-- dependent_id null; an invited member is the other way round.
alter table family_links drop constraint if exists family_links_shape;
alter table family_links add constraint family_links_shape check (
  (connection_type = 'managed' and dependent_id is null     and display_name is not null)
  or
  (connection_type = 'invite'  and dependent_id is not null)
);

alter table family_links drop constraint if exists family_links_not_self;
alter table family_links add constraint family_links_not_self
  check (dependent_id is null or dependent_id <> caregiver_id);

-- One link per pair, so accepting the same invite twice is a no-op.
create unique index if not exists family_links_unique_pair
  on family_links (caregiver_id, dependent_id)
  where dependent_id is not null;

create index if not exists family_links_caregiver_idx on family_links (caregiver_id);
create index if not exists family_links_dependent_idx on family_links (dependent_id);

-- ---------------------------------------------------------------------------
-- 2. medicines — attribute a drug to a managed member
-- ---------------------------------------------------------------------------

-- A managed member's medicines are owned by the caregiver (there is no other
-- account to own them), so `owner_id` alone cannot say whose tablet it is.
alter table medicines
  add column if not exists member_id uuid references family_links(id) on delete cascade;

create index if not exists medicines_member_id_idx on medicines (member_id);

-- Replaced by member_id, which says *which* member rather than just "someone".
alter table medicines drop column if exists is_managed_profile;

-- ---------------------------------------------------------------------------
-- 3. family_invites — the "they have the app" path
-- ---------------------------------------------------------------------------

create table if not exists family_invites (
  id           uuid primary key default uuid_generate_v4(),
  caregiver_id uuid not null references profiles(id) on delete cascade,
  -- Short, human-readable, typed in by hand on the other phone.
  code         text not null unique,
  relationship text,
  invitee_name text,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'revoked')),
  accepted_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days'
);

create index if not exists family_invites_caregiver_idx on family_invites (caregiver_id);

alter table family_invites enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Policies
-- ---------------------------------------------------------------------------

-- A caregiver has to be able to read the name, photo and age of the people they
-- care for; `profiles` was previously readable only by its own owner.
drop policy if exists "Caregivers can view linked members' profiles" on profiles;
create policy "Caregivers can view linked members' profiles"
  on profiles for select
  using (exists (
    select 1 from family_links fl
    where fl.dependent_id = profiles.id and fl.caregiver_id = auth.uid()
  ));

-- And the member has to be able to see who they granted access to.
drop policy if exists "Members can view their caregivers' profiles" on profiles;
create policy "Members can view their caregivers' profiles"
  on profiles for select
  using (exists (
    select 1 from family_links fl
    where fl.caregiver_id = profiles.id and fl.dependent_id = auth.uid()
  ));

-- `dose_log` already had this policy; without the matching one on `medicines`
-- a caregiver could see that a dose was missed but not what the drug was.
drop policy if exists "Caregivers can view linked members' medicines" on medicines;
create policy "Caregivers can view linked members' medicines"
  on medicines for select
  using (exists (
    select 1 from family_links fl
    where fl.dependent_id = medicines.owner_id and fl.caregiver_id = auth.uid()
  ));

-- Links could be created but never edited or undone.
drop policy if exists "Caregivers update their family links" on family_links;
create policy "Caregivers update their family links"
  on family_links for update
  using (auth.uid() = caregiver_id)
  with check (auth.uid() = caregiver_id);

drop policy if exists "Caregivers remove their family links" on family_links;
create policy "Caregivers remove their family links"
  on family_links for delete
  using (auth.uid() = caregiver_id);

-- Consent has to be revocable from the other side too.
drop policy if exists "Members can disconnect themselves" on family_links;
create policy "Members can disconnect themselves"
  on family_links for delete
  using (auth.uid() = dependent_id);

drop policy if exists "Caregivers manage their invites" on family_invites;
create policy "Caregivers manage their invites"
  on family_invites for all
  using (auth.uid() = caregiver_id)
  with check (auth.uid() = caregiver_id);

-- ---------------------------------------------------------------------------
-- 5. Invite redemption
-- ---------------------------------------------------------------------------
--
-- The invitee is not the caregiver, so they can match neither the invite policy
-- above nor `family_links`' caregiver-only INSERT. Rather than widen either
-- policy — which would let anyone enumerate invites or link themselves to a
-- stranger — redemption goes through two security-definer functions that only
-- ever act on a code the caller already holds.

-- Resolves an invite code to who sent it, without exposing the invites table.
create or replace function lookup_family_invite(invite_code text)
returns table (
  invite_id        uuid,
  caregiver_name   text,
  caregiver_avatar text,
  relationship     text
)
language sql
security definer
set search_path = public
as $$
  select i.id, p.name, p.avatar_url, i.relationship
  from family_invites i
  join profiles p on p.id = i.caregiver_id
  where upper(i.code) = upper(trim(invite_code))
    and i.status = 'pending'
    and i.expires_at > now();
$$;

-- Accepts an invite on the caller's behalf and returns the resulting link id.
create or replace function accept_family_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv     family_invites;
  link_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to accept an invite.';
  end if;

  select * into inv
  from family_invites
  where upper(code) = upper(trim(invite_code))
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'That invite code is not valid any more.';
  end if;

  if inv.caregiver_id = auth.uid() then
    raise exception 'You cannot accept your own invite.';
  end if;

  insert into family_links (caregiver_id, dependent_id, relationship, connection_type)
  values (inv.caregiver_id, auth.uid(), inv.relationship, 'invite')
  on conflict (caregiver_id, dependent_id) where dependent_id is not null
  do update set relationship = excluded.relationship
  returning id into link_id;

  update family_invites
  set status = 'accepted', accepted_by = auth.uid()
  where id = inv.id;

  return link_id;
end;
$$;

revoke all on function lookup_family_invite(text) from public, anon;
revoke all on function accept_family_invite(text) from public, anon;
grant execute on function lookup_family_invite(text) to authenticated;
grant execute on function accept_family_invite(text) to authenticated;
