-- Adds the ovulation-test result the Women's Health "Log today" row records.
-- Run in Supabase SQL Editor.
alter table cycle_entries
  add column if not exists ovulation_test text
  check (ovulation_test in ('positive', 'negative'));
