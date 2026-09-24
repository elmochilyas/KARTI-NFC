-- Phase 26 advanced profile builder (specs: TASKS Phase 26, ADR-052).
--
-- Widens the section type CHECK from the Phase 25 foundation trio to the
-- full section catalog. Additive only: no backfill (new types are added
-- explicitly via the dashboard), existing rows already satisfy the new
-- CHECK, RLS/policies/indexes/triggers untouched.
--
-- Singleton rule preserved: UNIQUE(profile_id, type) still holds — one row
-- per type per profile. Gallery-style repeatable sections must revisit
-- that constraint deliberately when they ship (see ADR-052).

alter table public.profile_sections
  drop constraint if exists profile_sections_type_check;

alter table public.profile_sections
  add constraint profile_sections_type_check check (
    type in (
      'hero',
      'actions',
      'links',
      'location',
      'opening_hours',
      'menu',
      'catalog',
      'about',
      'cv',
      'experience',
      'gallery'
    )
  );
