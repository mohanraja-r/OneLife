-- Adds the daily vitals behind Home's "Health Overview" card: resting heart
-- rate, sleep, stress and energy. Run in Supabase SQL Editor.
--
-- These are typed in by hand, like steps were before the pedometer landed.
-- Nothing on the phone can measure them in Expo Go — HealthKit and Google Fit
-- both need a dev build — so the app asks rather than guesses.

-- One row per user per calendar day, mirroring `health_entries`. Every metric
-- is nullable because logging only your sleep is a normal day; the card shows a
-- dash for the rest rather than a zero, which would read as a measurement.
create table if not exists vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- Resting bpm. The bounds are the survivable range rather than the healthy
  -- one — the check exists to catch a stray digit, not to judge a reading.
  heart_rate integer check (heart_rate between 20 and 260),
  -- Minutes, so "7h 32m" survives a round trip. Hours as a float would not.
  sleep_minutes integer check (sleep_minutes between 0 and 1440),
  stress text check (stress in ('low', 'moderate', 'high')),
  energy text check (energy in ('low', 'ok', 'good', 'great')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The upsert the app writes with keys on this pair.
  unique (user_id, date)
);

-- The only read the app makes is "this user's recent days, newest first".
create index if not exists vitals_user_date_idx on vitals (user_id, date desc);

alter table vitals enable row level security;

-- One policy per command so a user reaches only their own rows. Dropped first
-- so the migration can be re-run — Postgres has no `create policy if not exists`.
drop policy if exists vitals_select_own on vitals;
create policy vitals_select_own on vitals
  for select using (auth.uid() = user_id);

drop policy if exists vitals_insert_own on vitals;
create policy vitals_insert_own on vitals
  for insert with check (auth.uid() = user_id);

drop policy if exists vitals_update_own on vitals;
create policy vitals_update_own on vitals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vitals_delete_own on vitals;
create policy vitals_delete_own on vitals
  for delete using (auth.uid() = user_id);
