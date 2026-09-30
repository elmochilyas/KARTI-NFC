-- Karti Vitrine & Orders — durable public rate limiting (Phase 6).
--
-- Replaces the Phase 2 per-instance in-memory bucket (src/features/vitrine/
-- antispam.ts), which serverless instances bypass. This table + RPC work
-- across instances with atomic increment/check semantics.
--
-- Privacy: the abuse key is HMAC(rate-limit-secret, normalized-IP + action)
-- derived server-side (src/features/vitrine/rateLimitServer.ts). Only the
-- 64-hex key hash reaches this table — never raw IPs, user agents, emails,
-- phones, or analytics identity. Rows are transient abuse counters with a
-- bounded TTL; cleanup is opportunistic inside the RPC (no cron).
--
-- Access: RLS enabled with NO policies (closed to anon/authenticated).
-- Mutations happen only through the SECURITY DEFINER RPC, executable by
-- owner + service_role (the narrow order-writer client). Standing rule
-- honored: explicit REVOKE from PUBLIC, anon, authenticated.

create table if not exists public.rate_limits (
  key_hash text not null,
  action text not null,
  bucket_start timestamptz not null,
  count integer not null default 1 check (count >= 0),
  expires_at timestamptz not null,
  primary key (key_hash, action, bucket_start)
);

create index if not exists rate_limits_expires_at_idx
  on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_action text,
  p_window_secs integer,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_bucket timestamptz;
  v_expires timestamptz;
  v_count integer;
  v_allowed boolean;
begin
  -- Light server-side guards (the app only sends valid values).
  if p_key_hash is null or p_key_hash = '' or length(p_key_hash) > 128 then
    return jsonb_build_object('allowed', false, 'count', 0, 'retry_after_secs', 60);
  end if;
  if p_action is null or p_action not in ('order', 'inquiry') then
    return jsonb_build_object('allowed', false, 'count', 0, 'retry_after_secs', 60);
  end if;
  if p_window_secs is null or p_window_secs < 60 or p_window_secs > 3600 then
    return jsonb_build_object('allowed', false, 'count', 0, 'retry_after_secs', 60);
  end if;
  if p_max is null or p_max < 1 or p_max > 100 then
    return jsonb_build_object('allowed', false, 'count', 0, 'retry_after_secs', 60);
  end if;

  v_bucket := to_timestamp(
    floor(extract(epoch from v_now) / p_window_secs) * p_window_secs
  );
  v_expires := v_bucket + (p_window_secs || ' seconds')::interval;

  -- Opportunistic bounded cleanup of expired buckets (no cron needed).
  delete from public.rate_limits
  where ctid in (
    select ctid from public.rate_limits
    where expires_at < v_now
    limit 100
  );

  insert into public.rate_limits (key_hash, action, bucket_start, count, expires_at)
  values (p_key_hash, p_action, v_bucket, 1, v_expires)
  on conflict (key_hash, action, bucket_start)
  do update set count = public.rate_limits.count + 1
  returning public.rate_limits.count into v_count;

  v_allowed := v_count <= p_max;

  if v_allowed then
    return jsonb_build_object('allowed', true, 'count', v_count, 'retry_after_secs', 0);
  else
    return jsonb_build_object(
      'allowed', false,
      'count', v_count,
      'retry_after_secs', greatest(1, extract(epoch from (v_expires - v_now))::integer)
    );
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
