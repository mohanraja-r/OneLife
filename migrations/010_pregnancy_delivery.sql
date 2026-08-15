-- Records the end of a pregnancy, so a finished record stops being reported as
-- an ongoing one. Run in Supabase SQL Editor after 009_pregnancy.sql.

-- Nothing previously closed a pregnancy out. Without this the week count runs
-- on past the due date forever, and the only way to stop it was to delete the
-- whole record — which also threw away the memories.
alter table pregnancy_data
  add column if not exists delivered_on date,
  add column if not exists baby_outcome text
    check (baby_outcome is null or baby_outcome in ('girl', 'boy', 'twins'));
