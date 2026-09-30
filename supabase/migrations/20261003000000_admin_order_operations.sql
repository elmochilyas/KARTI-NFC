-- Karti Vitrine & Orders — Phase 3 operator mutations (specs/specs-vitrin/03
-- §§19-20, 04 §§19-24).
--
-- Every state mutation that also writes history is ONE atomic Postgres
-- function: guarded UPDATE + event INSERT(s) in a single transaction.
-- Sequential UPDATE-then-INSERT from the app is forbidden here because a
-- crash between the two would leave state without history (or vice versa).
--
-- Concurrency: each function locks its order row (SELECT ... FOR UPDATE)
-- and checks an expected-current-state guard (status/payment/fulfillment
-- or updated_at for quote/notes). A stale dashboard session gets a typed
-- {"ok": false, "code": "CONFLICT"} instead of silently overwriting.
--
-- Authorization: SECURITY DEFINER + SET search_path = '' + explicit
-- private.is_admin() check first (same allowlist as RLS, ADR-031).
-- EXECUTE is granted to `authenticated` only (revoked from PUBLIC and
-- anon — see the Phase 2 ACL incident in tasks.md); non-admin callers
-- get UNAUTHORIZED with no data. Transition maps mirror
-- src/domain/orders/lifecycle.ts (TS stays authoritative for UX; SQL is
-- the enforcement backstop).
--
-- Additive: no table, column, or policy changes.

-- ---------------------------------------------------------------------------
-- 1. NEW → CONTACTED + CUSTOMER_CONTACTED
-- ---------------------------------------------------------------------------
create or replace function public.admin_mark_order_contacted(
  p_order_id uuid,
  p_expected_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
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
  if v_status <> 'NEW' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  update public.orders o
     set status = 'CONTACTED'
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
  values (p_order_id, 'CUSTOMER_CONTACTED', 'ADMIN', auth.uid(), 'NEW', 'CONTACTED');

  return jsonb_build_object('ok', true, 'status', 'CONTACTED');
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. CONTACTED → CONFIRMED + ORDER_CONFIRMED (commercial confirmation only)
-- ---------------------------------------------------------------------------
create or replace function public.admin_confirm_order(
  p_order_id uuid,
  p_expected_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
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
  if v_status <> 'CONTACTED' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  update public.orders o
     set status = 'CONFIRMED'
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
  values (p_order_id, 'ORDER_CONFIRMED', 'ADMIN', auth.uid(), 'CONTACTED', 'CONFIRMED');

  return jsonb_build_object('ok', true, 'status', 'CONFIRMED');
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. IN_PROGRESS → COMPLETED + ORDER_COMPLETED (direct completion path;
--    DELIVERED auto-sync is handled by admin_update_fulfillment_status)
-- ---------------------------------------------------------------------------
create or replace function public.admin_complete_order(
  p_order_id uuid,
  p_expected_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
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
  if v_status <> 'IN_PROGRESS' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  update public.orders o
     set status = 'COMPLETED'
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
  values (p_order_id, 'ORDER_COMPLETED', 'ADMIN', auth.uid(), 'IN_PROGRESS', 'COMPLETED');

  return jsonb_build_object('ok', true, 'status', 'COMPLETED');
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Cancellation from NEW/CONTACTED/CONFIRMED/IN_PROGRESS + ORDER_CANCELLED.
--    Never deletes the order or linked domain records.
-- ---------------------------------------------------------------------------
create or replace function public.admin_cancel_order(
  p_order_id uuid,
  p_expected_status text,
  p_reason text,
  p_note text
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
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  if p_reason not in (
    'CUSTOMER_CHANGED_MIND', 'UNREACHABLE', 'DUPLICATE',
    'INVALID_SUBMISSION', 'PRICE', 'OTHER'
  ) then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
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
  if v_status not in ('NEW', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  update public.orders o
     set status = 'CANCELLED'
   where o.id = p_order_id;

  v_metadata := jsonb_build_object('reason', p_reason);
  if p_note is not null and btrim(p_note) <> '' then
    v_metadata := v_metadata || jsonb_build_object('note', btrim(p_note));
  end if;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value, metadata)
  values (p_order_id, 'ORDER_CANCELLED', 'ADMIN', auth.uid(), v_status, 'CANCELLED', v_metadata);

  return jsonb_build_object('ok', true, 'status', 'CANCELLED');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Quote pricing: total = subtotal + delivery − discount (minor units).
--    Re-quote overwrites; every save appends PRICE_SET with the amounts.
--    Stale guard is expected updated_at (optimistic locking).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_order_price(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_subtotal_minor bigint,
  p_delivery_fee_minor bigint,
  p_discount_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_updated timestamptz;
  v_total bigint;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  if p_subtotal_minor is null or p_subtotal_minor < 0
    or p_delivery_fee_minor is null or p_delivery_fee_minor < 0
    or p_discount_minor is null or p_discount_minor < 0 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;
  v_total := p_subtotal_minor + p_delivery_fee_minor - p_discount_minor;
  if v_total < 0 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select o.status, o.updated_at into v_status, v_updated
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_updated <> p_expected_updated_at then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT');
  end if;
  if v_status in ('COMPLETED', 'CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  update public.orders o
     set pricing_status = 'PRICED',
         subtotal_minor = p_subtotal_minor,
         delivery_fee_minor = p_delivery_fee_minor,
         discount_minor = p_discount_minor,
         total_minor = v_total
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
  values (
    p_order_id, 'PRICE_SET', 'ADMIN', auth.uid(),
    jsonb_build_object(
      'subtotal_minor', p_subtotal_minor,
      'delivery_fee_minor', p_delivery_fee_minor,
      'discount_minor', p_discount_minor,
      'total_minor', v_total,
      'currency', 'MAD'
    )
  );

  return jsonb_build_object('ok', true, 'pricing_status', 'PRICED', 'total_minor', v_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Payment transitions (PENDING → PARTIALLY_PAID → PAID, PENDING → PAID,
--    PAID → REFUNDED) + PAYMENT_STATUS_CHANGED with from/to.
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_payment_status(
  p_order_id uuid,
  p_expected_payment text,
  p_target_payment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
  v_payment text;
  v_allowed boolean;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  select true, o.payment_status into v_found, v_payment
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
    when 'PENDING' then p_target_payment in ('PARTIALLY_PAID', 'PAID')
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

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, from_value, to_value)
  values (p_order_id, 'PAYMENT_STATUS_CHANGED', 'ADMIN', auth.uid(), v_payment, p_target_payment);

  return jsonb_build_object('ok', true, 'payment_status', p_target_payment);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Fulfillment transitions on the explicit map (mirrors
--    FULFILLMENT_TRANSITIONS in src/domain/orders/lifecycle.ts) +
--    FULFILLMENT_STATUS_CHANGED, with overall-status auto-sync:
--    CONFIRMED + fulfillment begins → IN_PROGRESS; DELIVERED → COMPLETED
--    (+ ORDER_COMPLETED in the same transaction, exactly once — DELIVERED
--    is terminal so the sync can fire only one way).
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
  v_allowed boolean;
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

  v_allowed := case v_fulfillment
    when 'NOT_STARTED' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'DESIGN', 'AWAITING_APPROVAL', 'APPROVED',
      'PRODUCTION', 'NFC_CONFIGURATION', 'READY')
    when 'AWAITING_CUSTOMER_INFO' then p_target_fulfillment in (
      'DESIGN', 'AWAITING_APPROVAL', 'APPROVED', 'PRODUCTION',
      'NFC_CONFIGURATION', 'READY')
    when 'DESIGN' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'AWAITING_APPROVAL', 'APPROVED', 'PRODUCTION',
      'NFC_CONFIGURATION', 'READY')
    when 'AWAITING_APPROVAL' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'APPROVED', 'CHANGES_REQUESTED', 'DESIGN')
    when 'CHANGES_REQUESTED' then p_target_fulfillment in ('DESIGN', 'AWAITING_APPROVAL')
    when 'APPROVED' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'PRODUCTION', 'NFC_CONFIGURATION', 'READY')
    when 'PRODUCTION' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'NFC_CONFIGURATION', 'READY', 'SHIPPED')
    when 'NFC_CONFIGURATION' then p_target_fulfillment in (
      'AWAITING_CUSTOMER_INFO', 'READY', 'SHIPPED', 'DELIVERED')
    when 'READY' then p_target_fulfillment in ('SHIPPED', 'DELIVERED')
    when 'SHIPPED' then p_target_fulfillment = 'DELIVERED'
    else false
  end;
  if v_allowed is not true then
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

-- ---------------------------------------------------------------------------
-- 8/9. Operator notes. Event records {updated: true} only — private note
-- content is never duplicated into event metadata.
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_internal_note(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated timestamptz;
  v_note text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  v_note := btrim(coalesce(p_note, ''));
  if char_length(v_note) > 2000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select o.updated_at into v_updated
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_updated <> p_expected_updated_at then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT');
  end if;

  update public.orders o
     set internal_notes = nullif(v_note, '')
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
  values (p_order_id, 'INTERNAL_NOTE_UPDATED', 'ADMIN', auth.uid(), '{"updated": true}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_update_customer_note(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated timestamptz;
  v_note text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  v_note := btrim(coalesce(p_note, ''));
  if char_length(v_note) > 1000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select o.updated_at into v_updated
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_updated <> p_expected_updated_at then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT');
  end if;

  update public.orders o
     set customer_notes = nullif(v_note, '')
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
  values (p_order_id, 'CUSTOMER_NOTE_UPDATED', 'ADMIN', auth.uid(), '{"updated": true}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- EXECUTE ACL: owner + authenticated only. Revoked from PUBLIC and anon
-- explicitly (default privileges re-grant on CREATE — Phase 2 lesson).
-- Non-admin authenticated callers are rejected inside by is_admin().
-- ---------------------------------------------------------------------------
revoke all on function public.admin_mark_order_contacted(uuid, text) from public, anon;
grant execute on function public.admin_mark_order_contacted(uuid, text) to authenticated;

revoke all on function public.admin_confirm_order(uuid, text) from public, anon;
grant execute on function public.admin_confirm_order(uuid, text) to authenticated;

revoke all on function public.admin_complete_order(uuid, text) from public, anon;
grant execute on function public.admin_complete_order(uuid, text) to authenticated;

revoke all on function public.admin_cancel_order(uuid, text, text, text) from public, anon;
grant execute on function public.admin_cancel_order(uuid, text, text, text) to authenticated;

revoke all on function public.admin_set_order_price(uuid, timestamptz, bigint, bigint, bigint) from public, anon;
grant execute on function public.admin_set_order_price(uuid, timestamptz, bigint, bigint, bigint) to authenticated;

revoke all on function public.admin_update_payment_status(uuid, text, text) from public, anon;
grant execute on function public.admin_update_payment_status(uuid, text, text) to authenticated;

revoke all on function public.admin_update_fulfillment_status(uuid, text, text) from public, anon;
grant execute on function public.admin_update_fulfillment_status(uuid, text, text) to authenticated;

revoke all on function public.admin_update_internal_note(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_update_internal_note(uuid, timestamptz, text) to authenticated;

revoke all on function public.admin_update_customer_note(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_update_customer_note(uuid, timestamptz, text) to authenticated;
