-- Adds the pregnancy module: the weight baseline, the hospital-bag and
-- tests checklists, the diet-chart region preference, kick-counting sessions
-- and the memories timeline. Run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- pregnancy_data — new columns on the existing per-user row
-- ---------------------------------------------------------------------------

-- Pre-pregnancy weight is stored here rather than read from `profiles` on every
-- render: the profile weight is the *current* weight and moves through the
-- pregnancy, so using it as the baseline would make the gain chart flatten
-- itself as she gains. This is a snapshot, taken once, deliberately frozen.
alter table pregnancy_data
  add column if not exists pre_pregnancy_weight_kg numeric
    check (pre_pregnancy_weight_kg is null or pre_pregnancy_weight_kg > 0);

-- Both checklists are user state over a catalogue that lives in app code, so
-- they are a set of ticked ids rather than rows: `{"packed": ["mom-nightie"],
-- "custom": [{...}]}` and `{"tiffa": {"doneDate": "2026-08-01"}}`.
alter table pregnancy_data
  add column if not exists bag jsonb not null default '{}'::jsonb,
  add column if not exists tests jsonb not null default '{}'::jsonb;

-- Which regional diet chart she reads. Nullable — the screen falls back to
-- north until she picks, and the pick is remembered from then on.
alter table pregnancy_data
  add column if not exists diet_region text
    check (diet_region is null or diet_region in ('north', 'south'));

-- ---------------------------------------------------------------------------
-- pregnancy_kick_sessions
-- ---------------------------------------------------------------------------

-- One row per counting session, not per day: the clinically meaningful figure
-- is how long ten kicks took, which only exists at session granularity. A day
-- can hold several sessions and they are compared against each other.
create table if not exists pregnancy_kick_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The calendar day the session is filed under, taken from `started_at` in the
  -- user's local zone by the client — a session begun at 11pm belongs to that
  -- evening even if it ends after midnight UTC.
  date date not null,
  started_at timestamptz not null,
  -- Null while a session is still running.
  ended_at timestamptz,
  kick_count integer not null default 0 check (kick_count >= 0),
  -- Every individual tap, so a session can be re-derived or audited later.
  kick_times timestamptz[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists pregnancy_kick_sessions_user_date_idx
  on pregnancy_kick_sessions (user_id, date desc, started_at desc);

alter table pregnancy_kick_sessions enable row level security;

drop policy if exists pregnancy_kick_sessions_select_own on pregnancy_kick_sessions;
create policy pregnancy_kick_sessions_select_own on pregnancy_kick_sessions
  for select using (auth.uid() = user_id);

drop policy if exists pregnancy_kick_sessions_insert_own on pregnancy_kick_sessions;
create policy pregnancy_kick_sessions_insert_own on pregnancy_kick_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists pregnancy_kick_sessions_update_own on pregnancy_kick_sessions;
create policy pregnancy_kick_sessions_update_own on pregnancy_kick_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pregnancy_kick_sessions_delete_own on pregnancy_kick_sessions;
create policy pregnancy_kick_sessions_delete_own on pregnancy_kick_sessions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- pregnancy_memories
-- ---------------------------------------------------------------------------

-- Its own table rather than another jsonb array on `pregnancy_data`: this grows
-- for forty weeks and carries photo references, and every write to a jsonb
-- array is a read-modify-write of the whole thing.
create table if not exists pregnancy_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- Gestational week at the time, stored rather than derived so the entry still
  -- reads correctly if the due date is later corrected.
  week integer check (week is null or (week >= 0 and week <= 45)),
  day_of_week integer check (day_of_week is null or (day_of_week between 0 and 6)),
  caption text,
  -- Storage object paths inside the `pregnancy-memories` bucket, not URLs —
  -- the bucket is private, so the client signs each path when it renders.
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists pregnancy_memories_user_date_idx
  on pregnancy_memories (user_id, date desc);

alter table pregnancy_memories enable row level security;

drop policy if exists pregnancy_memories_select_own on pregnancy_memories;
create policy pregnancy_memories_select_own on pregnancy_memories
  for select using (auth.uid() = user_id);

drop policy if exists pregnancy_memories_insert_own on pregnancy_memories;
create policy pregnancy_memories_insert_own on pregnancy_memories
  for insert with check (auth.uid() = user_id);

drop policy if exists pregnancy_memories_update_own on pregnancy_memories;
create policy pregnancy_memories_update_own on pregnancy_memories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pregnancy_memories_delete_own on pregnancy_memories;
create policy pregnancy_memories_delete_own on pregnancy_memories
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage — the memories bucket
-- ---------------------------------------------------------------------------

-- Private, unlike `avatars`: these are personal photographs and nothing outside
-- the owner's session should be able to read them.
insert into storage.buckets (id, name, public)
values ('pregnancy-memories', 'pregnancy-memories', false)
on conflict (id) do nothing;

-- Objects are keyed `<user_id>/<uuid>.jpg`, so ownership is the first path
-- segment and every policy checks it against the caller.
drop policy if exists pregnancy_memories_objects_select on storage.objects;
create policy pregnancy_memories_objects_select on storage.objects
  for select using (
    bucket_id = 'pregnancy-memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists pregnancy_memories_objects_insert on storage.objects;
create policy pregnancy_memories_objects_insert on storage.objects
  for insert with check (
    bucket_id = 'pregnancy-memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists pregnancy_memories_objects_delete on storage.objects;
create policy pregnancy_memories_objects_delete on storage.objects
  for delete using (
    bucket_id = 'pregnancy-memories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
