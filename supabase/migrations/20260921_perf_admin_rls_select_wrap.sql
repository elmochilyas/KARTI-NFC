-- Phase 15 perf (Track E): RLS select-wrap for admin policies (ADR-035).
--
-- Rewrites the admin allowlist policies from
--   using (private.is_admin())
-- to
--   using ((select private.is_admin()))
-- (and the same for WITH CHECK) so Postgres plans the stable helper call as an
-- InitPlan evaluated once per statement instead of once per row. Without the
-- scalar-subselect wrapper, `private.is_admin()` (STABLE, row-dependent
-- planning) is re-evaluated for every row scanned; with the wrapper it is
-- lifted out and executed a single time per query.
--
-- No behavior change: same allowlist (`private.admin_users`), same
-- `TO authenticated` targets, same anon default-deny (zero anon policies),
-- same bucket qualifier (`bucket_id = 'profile-assets'`) on storage writes.
-- RLS stays enabled on all tables; `private.admin_users` default-deny and
-- least-privilege EXECUTE grants are untouched.
--
-- Additive / reversible: drops and recreates the same-named policies only.
-- No other migrations are touched.
--
-- Rollback (restores pre-wrap form, only if ever needed):
--   drop policy "Admins manage clients" on public.clients;
--   create policy "Admins manage clients"
--     on public.clients for all to authenticated
--     using (private.is_admin()) with check (private.is_admin());
--   (same shape for profiles, profile_links, cards; storage write policies
--   with (bucket_id = 'profile-assets' and private.is_admin()) qualifiers.)

-- ---------------------------------------------------------------------------
-- App-table policies: identical semantics, initPlan-friendly form
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage clients" on public.clients;
create policy "Admins manage clients"
  on public.clients for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
  on public.profiles for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage profile links" on public.profile_links;
create policy "Admins manage profile links"
  on public.profile_links for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage cards" on public.cards;
create policy "Admins manage cards"
  on public.cards for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage policies: writes require admin; public read unchanged
-- ---------------------------------------------------------------------------

drop policy if exists "Admins upload profile assets" on storage.objects;
create policy "Admins upload profile assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-assets' and (select private.is_admin()));

drop policy if exists "Admins update profile assets" on storage.objects;
create policy "Admins update profile assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-assets' and (select private.is_admin()))
  with check (bucket_id = 'profile-assets' and (select private.is_admin()));

drop policy if exists "Admins delete profile assets" on storage.objects;
create policy "Admins delete profile assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-assets' and (select private.is_admin()));
