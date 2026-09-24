-- Phase 25 profile sections foundation (specs: TASKS Phase 25, ADR-051).
--
-- New table public.profile_sections: data-driven public-profile composition.
-- Foundation types only: hero | actions | links. Future types (maps, menus,
-- cv, gallery, …) extend the CHECK deliberately — no per-platform types yet.
--
-- Conventions (ADR-010): UUID PK, TEXT + CHECK, updated_at trigger, additive.
-- RLS (ADR-031): admin-only CRUD via (select private.is_admin()); anon
-- default-deny (no policies). Public reads go through the server-only
-- service-role loader with an explicit projection (ADR-032) — never anon.
-- Delete behavior: sections cascade with their profile (like profile_links);
-- physical cards are untouched.

-- ---------------------------------------------------------------------------
-- table
-- ---------------------------------------------------------------------------

create table public.profile_sections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  type text not null check (type in ('hero', 'actions', 'links')),
  position integer not null check (position >= 0),
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exactly one row per type per profile in the foundation (one hero, one
  -- actions block, one links block). Future repeatable sections (e.g.
  -- gallery items) must revisit this constraint deliberately.
  constraint profile_sections_profile_type_unique unique (profile_id, type),
  -- Unambiguous render order.
  constraint profile_sections_profile_position_unique unique (profile_id, position)
);

create index profile_sections_profile_order_idx
  on public.profile_sections (profile_id, position);

create trigger trg_profile_sections_updated_at
  before update on public.profile_sections
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profile_sections enable row level security;

-- Admin-only CRUD (select-wrapped helper: one InitPlan per statement, ADR-035).
-- Anonymous gets no policy (default deny).
drop policy if exists "Admins manage profile sections" on public.profile_sections;
create policy "Admins manage profile sections"
  on public.profile_sections for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Backfill: every existing profile receives hero(1) → actions(2) → links(3)
-- ---------------------------------------------------------------------------
-- Idempotent: INSERT … SELECT … WHERE NOT EXISTS, so re-apply is a no-op.
-- Positions 1/2/3 match the Phase 25 requirement (not 0-based).

insert into public.profile_sections (profile_id, type, position, enabled, settings)
select p.id, 'hero', 1, true, '{}'::jsonb
from public.profiles p
where not exists (
  select 1 from public.profile_sections s
  where s.profile_id = p.id and s.type = 'hero'
);

insert into public.profile_sections (profile_id, type, position, enabled, settings)
select p.id, 'actions', 2, true, '{}'::jsonb
from public.profiles p
where not exists (
  select 1 from public.profile_sections s
  where s.profile_id = p.id and s.type = 'actions'
);

insert into public.profile_sections (profile_id, type, position, enabled, settings)
select p.id, 'links', 3, true, '{}'::jsonb
from public.profiles p
where not exists (
  select 1 from public.profile_sections s
  where s.profile_id = p.id and s.type = 'links'
);
