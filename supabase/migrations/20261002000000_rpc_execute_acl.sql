-- Karti Vitrine & Orders — tighten public RPC execute grants.
--
-- Finding (live verification 2026-09-28): Supabase default privileges
-- grant EXECUTE on newly created functions to `anon`/`authenticated`
-- automatically, so `REVOKE ... FROM PUBLIC` alone left direct
-- PostgREST /rpc execution open to anonymous callers (proven live:
-- anon created order KARTI-000013, since cleaned up). Reads stayed
-- denied, but spam rows bypassed all server validation/rate limits.
--
-- Fix: explicit REVOKE from both API roles on both functions. Execution
-- stays available to the table owner and service_role (the narrow
-- order-writer client, ADR-071). Table RLS is untouched.
--
-- Standing rule for future function migrations: Supabase default
-- privileges re-grant EXECUTE to anon/authenticated on every CREATE, so
-- every function migration MUST end with explicit REVOKEs — revoking
-- from PUBLIC alone is not sufficient.

revoke all on function public.create_public_order(
  text, text, text, text, text, text, text, text, text, text,
  text, text, integer, jsonb, bigint, bigint, bigint, bigint,
  bigint, bigint, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text,
  text, text, uuid, text
) from anon, authenticated;

revoke all on function public.create_public_inquiry(
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text
) from anon, authenticated;
