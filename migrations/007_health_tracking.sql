-- Adds the Health tab's daily step count and water intake, plus the per-user
-- goals both are measured against. Run in Supabase SQL Editor.

-- One row per user per calendar day. `date` is a plain `date` rather than a
-- timestamp because "today's steps" is a calendar question, not an instant.
create table if not exists health_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  steps integer not null default 0 check (steps >= 0),
  water_ml integer not null default 0 check (water_ml >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The upsert the app writes with keys on this pair.
  unique (user_id, date)
);

-- The only read the app makes is "this user's recent days, newest first".
create index if not exists health_entries_user_date_idx
  on health_entries (user_id, date desc);

alter table health_entries enable row level security;

-- One policy per command so a user reaches only their own rows. Dropped first
-- so the migration can be re-run — Postgres has no `create policy if not exists`.
drop policy if exists health_entries_select_own on health_entries;
create policy health_entries_select_own on health_entries
  for select using (auth.uid() = user_id);

drop policy if exists health_entries_insert_own on health_entries;
create policy health_entries_insert_own on health_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists health_entries_update_own on health_entries;
create policy health_entries_update_own on health_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists health_entries_delete_own on health_entries;
create policy health_entries_delete_own on health_entries
  for delete using (auth.uid() = user_id);

-- Goals belong to the person, not the day, so they sit on the profile rather
-- than being copied onto every daily row. Changing a goal re-scores history
-- against the new target, which is what someone raising a goal expects.
alter table profiles
  add column if not exists step_goal integer not null default 10000
    check (step_goal > 0),
  add column if not exists water_goal_ml integer not null default 2000
    check (water_goal_ml > 0);
