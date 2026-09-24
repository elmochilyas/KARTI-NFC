-- Phase 30 profile templates (specs: TASKS Phase 30, ADR-056).
--
-- Stores the chosen template id on the profile row (metadata only).
-- Sections are NEVER derived from this column automatically — seeding
-- happens once in application code at profile creation, and changing the
-- template later updates only this column (existing sections untouched).
-- Additive only: new nullable-by-default column, CHECK, backfill.

alter table public.profiles
  add column if not exists template text not null default 'personal';

alter table public.profiles drop constraint if exists profiles_template_check;

alter table public.profiles
  add constraint profiles_template_check check (
    template in ('personal', 'business', 'restaurant', 'store')
  );

-- Backfill from the existing profile type (sections untouched).
update public.profiles
  set template = 'business'
  where profile_type = 'BUSINESS' and template = 'personal';
