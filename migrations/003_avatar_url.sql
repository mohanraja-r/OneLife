-- Adds avatar_url for the header's profile picture. Run in Supabase SQL Editor.
alter table profiles add column if not exists avatar_url text;
