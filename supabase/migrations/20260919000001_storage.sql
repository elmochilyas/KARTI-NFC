-- Karti profile-asset storage — Phase 2 (specs/SUPABASE.md, specs/SECURITY.md).
--
-- Strategy (ADR-012): public bucket with authenticated-only writes.
-- Profile images must render on public pages without signed-URL plumbing;
-- uploads are admin-only and constrained by type + size.
-- SVG is excluded (MVP supports safe raster formats only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read: anyone may fetch published profile assets.
create policy "Public read of profile assets"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-assets');

-- Admin write: only authenticated admins may upload, update, or delete.
-- Application code generates safe paths (profiles/{profileId}/avatar|cover/…)
-- and validates type/size again at the trusted boundary (Phase 4).

create policy "Authenticated admins upload profile assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-assets');

create policy "Authenticated admins update profile assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-assets')
  with check (bucket_id = 'profile-assets');

create policy "Authenticated admins delete profile assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-assets');
