-- Phase 31 personal documents (specs: TASKS Phase 31, ADR-057).
--
-- Private bucket for CV PDFs. Unlike profile-assets (public, ADR-012),
-- documents are NEVER publicly readable: no SELECT policy exists for any
-- API role, so objects are reachable only via the service-role download
-- inside GET /api/cv/[slug] (ACTIVE profiles only, sanitized settings).
-- Writes stay admin-only via the explicit allowlist (ADR-031).
-- Additive only: new bucket + write policies, zero changes elsewhere.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-documents',
  'profile-documents',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately NO public/anon SELECT policy: default deny for reads.

drop policy if exists "Admins upload profile documents" on storage.objects;
create policy "Admins upload profile documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-documents' and (select private.is_admin()));

drop policy if exists "Admins update profile documents" on storage.objects;
create policy "Admins update profile documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-documents' and (select private.is_admin()))
  with check (bucket_id = 'profile-documents' and (select private.is_admin()));

drop policy if exists "Admins delete profile documents" on storage.objects;
create policy "Admins delete profile documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-documents' and (select private.is_admin()));
