-- Phase 12 security hardening: explicit admin authorization (ADR-031).
--
-- Replaces the `TO authenticated USING (true)` model (any authenticated user
-- was effectively admin) with an explicit allowlist. Any future self-signed-up
-- or non-operator account is denied by default.
--
-- Safety order: this migration CREATES the allowlist + helper and bootstraps
-- the existing operator BEFORE tightening policies, so no login can be lost.
-- Rollback (re-permissive, only if ever needed):
--   drop policy "Admins manage clients" on public.clients;
--   create policy "Authenticated admins manage clients"
--     on public.clients for all to authenticated using (true) with check (true);
--   (same shape for profiles, profile_links, cards; storage write policies
--   with (bucket_id = 'profile-assets') qualifiers.)

-- ---------------------------------------------------------------------------
-- Allowlist + helper
-- ---------------------------------------------------------------------------

create schema if not exists private;

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on, zero policies: default deny for every API role. Only the DEFINER
-- helper below (and the table owner / service role) can read membership.
alter table private.admin_users enable row level security;

-- Allow API roles to resolve the helper; membership rows stay invisible.
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users where user_id = auth.uid()
  );
$$;

-- Least execution: RLS evaluation runs as the querying role, so only
-- `authenticated` needs EXECUTE. `anon` gets nothing.
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Bootstrap the existing operator (single auth user, verified 2026-09-20).
-- Additional admins are added with an explicit INSERT of their auth user id.
insert into private.admin_users (user_id)
values ('295eb77d-7c7e-40d9-bed3-3219eb2864ff')
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- App-table policies: admin-only CRUD, anon still default-deny (no policies)
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated admins manage clients" on public.clients;
drop policy if exists "Admins manage clients" on public.clients;
create policy "Admins manage clients"
  on public.clients for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Authenticated admins manage profiles" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
  on public.profiles for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Authenticated admins manage profile links" on public.profile_links;
drop policy if exists "Admins manage profile links" on public.profile_links;
create policy "Admins manage profile links"
  on public.profile_links for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "Authenticated admins manage cards" on public.cards;
drop policy if exists "Admins manage cards" on public.cards;
create policy "Admins manage cards"
  on public.cards for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- Storage policies: writes require admin; public read unchanged
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated admins upload profile assets" on storage.objects;
drop policy if exists "Admins upload profile assets" on storage.objects;
create policy "Admins upload profile assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-assets' and private.is_admin());

drop policy if exists "Authenticated admins update profile assets" on storage.objects;
drop policy if exists "Admins update profile assets" on storage.objects;
create policy "Admins update profile assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-assets' and private.is_admin())
  with check (bucket_id = 'profile-assets' and private.is_admin());

drop policy if exists "Authenticated admins delete profile assets" on storage.objects;
drop policy if exists "Admins delete profile assets" on storage.objects;
create policy "Admins delete profile assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-assets' and private.is_admin());

-- ---------------------------------------------------------------------------
-- Advisor hygiene (same migration: zero-risk, single deploy)
-- ---------------------------------------------------------------------------

-- WARN function_search_path_mutable: body references no tables, pin anyway.
alter function public.handle_updated_at() set search_path = '';
-- Trigger functions need no direct EXECUTE for API roles.
revoke all on function public.handle_updated_at() from public;

-- INFO unindexed_foreign_keys on cards.
create index if not exists cards_client_id_idx
  on public.cards (client_id);
create index if not exists cards_destination_profile_id_idx
  on public.cards (destination_profile_id)
  where destination_profile_id is not null;
