-- Medical information. Applied to the OneLife project on 2026-08-09; kept here
-- as the record of the change, and safe to re-run (every statement guards
-- itself with `if not exists` or a preceding `drop … if exists`).
--
-- The Medical Information screen needs the facts an ambulance crew or a
-- pharmacist would ask for, and nothing in the schema held any of them:
-- blood type, allergies, chronic conditions, past procedures, who to call, and
-- who the treating doctor is. Medicines already have a home (`medicines`), so
-- that section reads from there rather than being duplicated here.
--
-- Every table follows the shape `medicines` settled on for caregiver mode:
--
--   owner_id   the account the row belongs to.
--   member_id  null for your own record; a `family_links` id when the row is a
--              managed member's — one who has no account, so their caregiver
--              owns their data on their behalf.
--
-- An invited member (one with their own account) owns their records themselves;
-- their caregiver can read them but not write them, matching how `medicines`
-- already works. Nothing here is editable by anyone but its owner.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- The at-a-glance facts. One row per person rather than columns on `profiles`,
-- because a managed member needs one too and has no profile row.
create table if not exists medical_profiles (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  member_id   uuid references family_links(id) on delete cascade,
  blood_type  text check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  organ_donor boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One record per person. Two partial indexes rather than one composite unique:
-- `member_id` is null for your own record, and null is never equal to null.
create unique index if not exists medical_profiles_self_idx
  on medical_profiles (owner_id) where member_id is null;
create unique index if not exists medical_profiles_member_idx
  on medical_profiles (owner_id, member_id) where member_id is not null;

create table if not exists allergies (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references profiles(id) on delete cascade,
  member_id         uuid references family_links(id) on delete cascade,
  name              text not null,
  allergy_type      text not null default 'medicine'
                      check (allergy_type in ('medicine','food','environmental','other')),
  -- Drives how loudly the row is rendered, and eventually what a caregiver is
  -- alerted about — hence a fixed vocabulary rather than free text.
  severity          text not null default 'moderate'
                      check (severity in ('mild','moderate','severe')),
  reaction          text,
  treatment         text,
  doctor_confirmed  boolean not null default false,
  last_verified     date,
  created_at        timestamptz not null default now()
);

create table if not exists health_conditions (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references profiles(id) on delete cascade,
  member_id      uuid references family_links(id) on delete cascade,
  name           text not null,
  -- A year, not a date: people remember "since 2019", not the appointment.
  diagnosed_year integer check (diagnosed_year between 1900 and 2200),
  status         text not null default 'managed'
                   check (status in ('active','managed','controlled','resolved')),
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists medical_procedures (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references profiles(id) on delete cascade,
  member_id      uuid references family_links(id) on delete cascade,
  name           text not null,
  performed_year integer check (performed_year between 1900 and 2200),
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists emergency_contacts (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references profiles(id) on delete cascade,
  member_id    uuid references family_links(id) on delete cascade,
  name         text not null,
  relationship text,
  phone        text not null,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists care_providers (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  member_id  uuid references family_links(id) on delete cascade,
  name       text not null,
  specialty  text,
  facility   text,
  phone      text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every read is "everything for one person", so every table indexes the pair.
create index if not exists medical_profiles_owner_idx    on medical_profiles (owner_id, member_id);
create index if not exists allergies_owner_idx           on allergies (owner_id, member_id);
create index if not exists health_conditions_owner_idx   on health_conditions (owner_id, member_id);
create index if not exists medical_procedures_owner_idx  on medical_procedures (owner_id, member_id);
create index if not exists emergency_contacts_owner_idx  on emergency_contacts (owner_id, member_id);
create index if not exists care_providers_owner_idx      on care_providers (owner_id, member_id);

-- ---------------------------------------------------------------------------
-- 2. Policies
-- ---------------------------------------------------------------------------
--
-- Two rules per table, and they are the same six times over:
--   * the owner does anything with their own rows (which covers a managed
--     member's rows, because the caregiver *is* the owner of those);
--   * a caregiver reads an invited member's own rows — `member_id is null`, so
--     one member's caregiver never sees another member's records through them.

alter table medical_profiles    enable row level security;
alter table allergies           enable row level security;
alter table health_conditions   enable row level security;
alter table medical_procedures  enable row level security;
alter table emergency_contacts  enable row level security;
alter table care_providers      enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'medical_profiles', 'allergies', 'health_conditions',
    'medical_procedures', 'emergency_contacts', 'care_providers'
  ] loop
    execute format(
      'drop policy if exists "Owners manage their %1$s" on %1$s', target);
    execute format($p$
      create policy "Owners manage their %1$s" on %1$s for all
        using (auth.uid() = owner_id)
        with check (auth.uid() = owner_id)
    $p$, target);

    execute format(
      'drop policy if exists "Caregivers view linked members %1$s" on %1$s', target);
    execute format($p$
      create policy "Caregivers view linked members %1$s" on %1$s for select
        using (
          member_id is null
          and exists (
            select 1 from family_links fl
            where fl.dependent_id = %1$s.owner_id
              and fl.caregiver_id = auth.uid()
          )
        )
    $p$, target);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. updated_at
-- ---------------------------------------------------------------------------
--
-- The shared view leads with "last updated", so the timestamp has to move on
-- every write rather than only when the app remembers to send it.
--
-- `set search_path` is not decoration: without it the function resolves names
-- against whatever the caller's path happens to be, which the database linter
-- flags on every function that omits it.

create or replace function touch_medical_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medical_profiles_touch on medical_profiles;
create trigger medical_profiles_touch
  before update on medical_profiles
  for each row execute function touch_medical_profile();
