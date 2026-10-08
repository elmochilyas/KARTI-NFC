-- Karti Google Sheets delivery integration (delivery-company operational mirror).
--
-- Transport: Karti sends signed HTTPS envelopes to a bound Apps Script Web
-- App, which writes the Sheet (no Google service account, no Sheets API
-- key in Karti). Supabase/Karti remains the authoritative source of truth;
-- the Sheet is a mirror.
--
-- This migration is additive only (and has never been applied, so it is the
-- single canonical delivery migration — no corrective follow-up exists):
--
-- 1. Fulfillment vocabulary gains the delivery-company states PICKED_UP,
--    OUT_FOR_DELIVERY, FAILED, RETURNED. SHIPPED is kept as compatibility
--    (existing rows/code keep working; new delivery flows never require it).
--    Canonical Sheet-driven flow:
--      NOT_STARTED → READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
--    Exception flow:
--      READY / PICKED_UP / OUT_FOR_DELIVERY → FAILED → RETURNED
-- 2. order_delivery_sheet_sync: idempotency/state table keyed by order_id.
--    Karti never touches the Sheets API directly, so no spreadsheet/row
--    coordinates are stored — Order ID (Sheet column B) is the identity and
--    Apps Script resolves it on every write.
-- 3. delivery_sheet_webhook_nonces: durable replay protection for the
--    Sheet → Karti webhook (PostgreSQL, not in-memory — Vercel runs many
--    serverless instances). Unique nonce per request; expired rows are
--    cleaned opportunistically on insert (see claim path) — a bounded
--    `delete ... where expires_at < now() limit 100` keeps the table small
--    with no cron dependency.
-- 4. fulfillment_transition_allowed(): single SQL source of truth for the
--    fulfillment map, used by both the operator RPC and the Sheet RPCs.
-- 5. sheets_apply_* RPCs: narrow machine-to-machine mutation path for the
--    authenticated Sheet webhook. EXECUTE is granted to service_role ONLY
--    (revoked from public/anon/authenticated); the Next.js route performs
--    HMAC authentication before calling. All writes carry SYSTEM actor +
--    source:"GOOGLE_SHEETS" audit metadata via the existing order_events
--    table. No direct order-table writes from webhook input.
--
-- Authorization model (ADR-031 unchanged): RLS stays enabled everywhere;
-- anon keeps default-deny; dashboard access still goes through the
-- is_admin() policies + admin_* RPCs. Service-role bypass is intentional
-- and confined to server-only integration code.

-- ---------------------------------------------------------------------------
-- 1. Widen the fulfillment_status CHECK (drop the old auto-named CHECK first).
-- ---------------------------------------------------------------------------

do $$
declare
  cname text;
begin
  for cname in
    select conname
      from pg_constraint
     where conrelid = 'public.orders'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%fulfillment_status%'
  loop
    execute format('alter table public.orders drop constraint %I', cname);
  end loop;
end;
$$;

alter table public.orders
  add constraint orders_fulfillment_status_check check (
    fulfillment_status in (
      'NOT_STARTED', 'AWAITING_CUSTOMER_INFO', 'DESIGN', 'AWAITING_APPROVAL',
      'CHANGES_REQUESTED', 'APPROVED', 'PRODUCTION', 'NFC_CONFIGURATION',
      'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'SHIPPED', 'DELIVERED',
      'FAILED', 'RETURNED'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Single SQL source of truth for fulfillment transitions.
--
-- Mirrors src/domain/orders/lifecycle.ts FULFILLMENT_TRANSITIONS (TS stays
-- authoritative for UX; this is the enforcement backstop). SHIPPED edges
-- are compatibility only: no new flow requires SHIPPED.
-- ---------------------------------------------------------------------------

create or replace function public.fulfillment_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_from
    when 'NOT_STARTED' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'DESIGN', 'AWAITING_APPROVAL', 'APPROVED',
      'PRODUCTION', 'NFC_CONFIGURATION', 'READY')
    when 'AWAITING_CUSTOMER_INFO' then p_to in (
      'DESIGN', 'AWAITING_APPROVAL', 'APPROVED', 'PRODUCTION',
      'NFC_CONFIGURATION', 'READY')
    when 'DESIGN' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'AWAITING_APPROVAL', 'APPROVED', 'PRODUCTION',
      'NFC_CONFIGURATION', 'READY')
    when 'AWAITING_APPROVAL' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'APPROVED', 'CHANGES_REQUESTED', 'DESIGN')
    when 'CHANGES_REQUESTED' then p_to in ('DESIGN', 'AWAITING_APPROVAL')
    when 'APPROVED' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'PRODUCTION', 'NFC_CONFIGURATION', 'READY')
    when 'PRODUCTION' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'NFC_CONFIGURATION', 'READY', 'SHIPPED')
    when 'NFC_CONFIGURATION' then p_to in (
      'AWAITING_CUSTOMER_INFO', 'READY', 'SHIPPED', 'DELIVERED')
    -- Delivery flow: READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED.
    -- Direct READY → DELIVERED (hand-delivered) stays legitimate;
    -- SHIPPED edges are compatibility only, never required.
    when 'READY' then p_to in (
      'PICKED_UP', 'OUT_FOR_DELIVERY', 'SHIPPED', 'DELIVERED', 'FAILED')
    when 'PICKED_UP' then p_to in (
      'OUT_FOR_DELIVERY', 'SHIPPED', 'DELIVERED', 'FAILED')
    when 'OUT_FOR_DELIVERY' then p_to in ('DELIVERED', 'SHIPPED', 'FAILED')
    when 'SHIPPED' then p_to in ('OUT_FOR_DELIVERY', 'DELIVERED')
    when 'FAILED' then p_to = 'RETURNED'
    else false
  end;
$$;

revoke all on function public.fulfillment_transition_allowed(text, text) from public, anon;

-- ---------------------------------------------------------------------------
-- 3. Operator fulfillment RPC re-pointed at the shared map.
--    Behavior for pre-existing states is unchanged; new states are enforced
--    by the same helper. Events + auto-sync semantics untouched.
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_fulfillment_status(
  p_order_id uuid,
  p_expected_fulfillment text,
  p_target_fulfillment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
  v_status text;
  v_fulfillment text;
  v_synced text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select true, o.status, o.fulfillment_status into v_found, v_status, v_fulfillment
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_status in ('COMPLETED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;
  if v_fulfillment <> p_expected_fulfillment then
    return jsonb_build_object(
      'ok', false, 'code', 'CONFLICT', 'fulfillment_status', v_fulfillment
    );
  end if;

  if public.fulfillment_transition_allowed(v_fulfillment, p_target_fulfillment) is not true then
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION', 'fulfillment_status', v_fulfillment
    );
  end if;

  -- Auto-sync mirror of syncOrderStatusOnFulfillmentChange().
  v_synced := v_status;
  if p_target_fulfillment = 'DELIVERED' then
    v_synced := 'COMPLETED';
  elsif v_status = 'CONFIRMED' and p_target_fulfillment <> 'NOT_STARTED' then
    v_synced := 'IN_PROGRESS';
  end if;

  update public.orders o
     set fulfillment_status = p_target_fulfillment,
         status = v_synced
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
  values (p_order_id, 'FULFILLMENT_STATUS_CHANGED', 'ADMIN', auth.uid(), v_fulfillment, p_target_fulfillment);

  if v_synced = 'COMPLETED' and v_status <> 'COMPLETED' then
    insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
    values (p_order_id, 'ORDER_COMPLETED', 'ADMIN', auth.uid(), v_status, 'COMPLETED');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_synced,
    'fulfillment_status', p_target_fulfillment
  );
end;
$$;

revoke all on function public.admin_update_fulfillment_status(uuid, text, text) from public, anon;
grant execute on function public.admin_update_fulfillment_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. order_delivery_sheet_sync — idempotency/state table.
--
-- Karti talks to the Apps Script Web App, never to the Sheets API, so no
-- spreadsheet coordinates are stored: Order ID (Sheet column B) is the
-- identity and Apps Script resolves it under LockService on every write.
-- ---------------------------------------------------------------------------

create table if not exists public.order_delivery_sheet_sync (
  order_id uuid primary key references public.orders (id) on delete cascade,

  last_payload_hash text null,
  sync_status text not null check (sync_status in ('PENDING', 'SYNCED', 'FAILED')),

  retry_count integer not null default 0 check (retry_count >= 0),
  next_retry_at timestamptz null,
  -- Safe truncated technical message only; never secrets/credentials.
  last_error text null,

  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_delivery_sheet_sync_updated_at
  before update on public.order_delivery_sheet_sync
  for each row execute function public.handle_updated_at();

create index if not exists delivery_sheet_sync_status_retry_idx
  on public.order_delivery_sheet_sync (sync_status, next_retry_at);

alter table public.order_delivery_sheet_sync enable row level security;

drop policy if exists "Admins manage delivery sheet sync" on public.order_delivery_sheet_sync;
create policy "Admins manage delivery sheet sync"
  on public.order_delivery_sheet_sync for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on table public.order_delivery_sheet_sync from public, anon, authenticated;
grant all on table public.order_delivery_sheet_sync to service_role;

-- ---------------------------------------------------------------------------
-- 5. delivery_sheet_webhook_nonces — durable replay protection.
-- ---------------------------------------------------------------------------

create table if not exists public.delivery_sheet_webhook_nonces (
  nonce text primary key check (char_length(nonce) between 8 and 128),
  received_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists delivery_sheet_webhook_nonces_expires_idx
  on public.delivery_sheet_webhook_nonces (expires_at);

alter table public.delivery_sheet_webhook_nonces enable row level security;

-- Closed to API roles entirely (no policies): only the service-role
-- integration path touches this table.
revoke all on table public.delivery_sheet_webhook_nonces from public, anon, authenticated;
grant all on table public.delivery_sheet_webhook_nonces to service_role;

-- ---------------------------------------------------------------------------
-- 5. sheets_apply_* — narrow machine-to-machine mutation path.
--
-- Called ONLY by the HMAC-authenticated webhook route via the service-role
-- integration client. EXECUTE is granted to service_role and revoked from
-- every API role, so dashboard/anon callers cannot reach these functions.
-- Scope is deliberately smaller than the operator RPCs:
--   order:       CONFIRMED | CANCELLED   (CONTACTED/IN_PROGRESS/COMPLETED
--                can never be written from the Sheet)
--   payment:     PAID | REFUNDED         (within existing domain rules)
--   fulfillment: READY | PICKED_UP | OUT_FOR_DELIVERY | DELIVERED |
--                FAILED | RETURNED       (within the shared transition map)
-- All writes are guarded (SELECT ... FOR UPDATE + expected-state) and emit
-- order_events rows with actor SYSTEM + source GOOGLE_SHEETS metadata.
-- ---------------------------------------------------------------------------

-- 5a. Order status from the Sheet (CONFIRMED | CANCELLED only).
create or replace function public.sheets_apply_order_status(
  p_order_id uuid,
  p_expected_status text,
  p_target_status text,
  p_changed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_metadata jsonb;
begin
  if p_target_status not in ('CONFIRMED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_FIELD');
  end if;

  select o.status into v_status
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_status <> p_expected_status then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT', 'status', v_status);
  end if;

  if p_target_status = 'CONFIRMED' then
    if v_status <> 'CONTACTED' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
    end if;
    update public.orders o set status = 'CONFIRMED' where o.id = p_order_id;
    insert into public.order_events
      (order_id, event_type, actor_type, from_value, to_value, metadata)
    values (
      p_order_id, 'ORDER_CONFIRMED', 'SYSTEM', 'CONTACTED', 'CONFIRMED',
      jsonb_build_object('source', 'GOOGLE_SHEETS', 'changed_at', p_changed_at)
    );
    return jsonb_build_object('ok', true, 'status', 'CONFIRMED');
  end if;

  -- CANCELLED (reason OTHER: the Sheet carries no structured reason).
  if v_status not in ('NEW', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;
  update public.orders o set status = 'CANCELLED' where o.id = p_order_id;
  v_metadata := jsonb_build_object(
    'reason', 'OTHER',
    'note', 'Cancelled from delivery sheet',
    'source', 'GOOGLE_SHEETS',
    'changed_at', p_changed_at
  );
  insert into public.order_events
    (order_id, event_type, actor_type, from_value, to_value, metadata)
  values (p_order_id, 'ORDER_CANCELLED', 'SYSTEM', v_status, 'CANCELLED', v_metadata);
  return jsonb_build_object('ok', true, 'status', 'CANCELLED');
end;
$$;

-- 5b. Payment status from the Sheet (PAID | REFUNDED only, domain rules apply).
create or replace function public.sheets_apply_payment_status(
  p_order_id uuid,
  p_expected_payment text,
  p_target_payment text,
  p_changed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment text;
  v_allowed boolean;
begin
  if p_target_payment not in ('PAID', 'REFUNDED') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_FIELD');
  end if;

  select o.payment_status into v_payment
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_payment <> p_expected_payment then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT', 'payment_status', v_payment);
  end if;

  v_allowed := case v_payment
    when 'PENDING' then p_target_payment = 'PAID'
    when 'PARTIALLY_PAID' then p_target_payment = 'PAID'
    when 'PAID' then p_target_payment = 'REFUNDED'
    else false
  end;
  if v_allowed is not true then
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION', 'payment_status', v_payment
    );
  end if;

  update public.orders o
     set payment_status = p_target_payment
   where o.id = p_order_id;

  insert into public.order_events
    (order_id, event_type, actor_type, from_value, to_value, metadata)
  values (
    p_order_id, 'PAYMENT_STATUS_CHANGED', 'SYSTEM', v_payment, p_target_payment,
    jsonb_build_object('source', 'GOOGLE_SHEETS', 'changed_at', p_changed_at)
  );
  return jsonb_build_object('ok', true, 'payment_status', p_target_payment);
end;
$$;

-- 5c. Fulfillment status from the Sheet (delivery vocabulary only).
create or replace function public.sheets_apply_fulfillment_status(
  p_order_id uuid,
  p_expected_fulfillment text,
  p_target_fulfillment text,
  p_changed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_fulfillment text;
  v_synced text;
begin
  if p_target_fulfillment not in (
    'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_FIELD');
  end if;

  select o.status, o.fulfillment_status into v_status, v_fulfillment
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_status in ('COMPLETED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;
  if v_fulfillment <> p_expected_fulfillment then
    return jsonb_build_object(
      'ok', false, 'code', 'CONFLICT', 'fulfillment_status', v_fulfillment
    );
  end if;

  if public.fulfillment_transition_allowed(v_fulfillment, p_target_fulfillment) is not true then
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION', 'fulfillment_status', v_fulfillment
    );
  end if;

  -- Auto-sync mirror of syncOrderStatusOnFulfillmentChange().
  v_synced := v_status;
  if p_target_fulfillment = 'DELIVERED' then
    v_synced := 'COMPLETED';
  elsif v_status = 'CONFIRMED' and p_target_fulfillment <> 'NOT_STARTED' then
    v_synced := 'IN_PROGRESS';
  end if;

  update public.orders o
     set fulfillment_status = p_target_fulfillment,
         status = v_synced
   where o.id = p_order_id;

  insert into public.order_events
    (order_id, event_type, actor_type, from_value, to_value, metadata)
  values (
    p_order_id, 'FULFILLMENT_STATUS_CHANGED', 'SYSTEM', v_fulfillment, p_target_fulfillment,
    jsonb_build_object('source', 'GOOGLE_SHEETS', 'changed_at', p_changed_at)
  );

  if v_synced = 'COMPLETED' and v_status <> 'COMPLETED' then
    insert into public.order_events
      (order_id, event_type, actor_type, from_value, to_value, metadata)
    values (
      p_order_id, 'ORDER_COMPLETED', 'SYSTEM', v_status, 'COMPLETED',
      jsonb_build_object('source', 'GOOGLE_SHEETS', 'changed_at', p_changed_at)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_synced,
    'fulfillment_status', p_target_fulfillment
  );
end;
$$;

revoke all on function public.sheets_apply_order_status(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sheets_apply_order_status(uuid, text, text, timestamptz) to service_role;

revoke all on function public.sheets_apply_payment_status(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sheets_apply_payment_status(uuid, text, text, timestamptz) to service_role;

revoke all on function public.sheets_apply_fulfillment_status(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sheets_apply_fulfillment_status(uuid, text, text, timestamptz) to service_role;
