-- Karti Vitrine & Orders — race-safe idempotent order RPC (follow-up to
-- 20260930000000_public_order_rpc.sql, ADR-071).
--
-- Problem: SELECT-then-INSERT lets two concurrent same-key submissions
-- both pass the existence check; the loser then surfaces a 23505 unique
-- violation instead of the existing receipt.
--
-- Fix: single-statement INSERT ... ON CONFLICT (idempotency_key) DO
-- NOTHING collapses the race onto the unique index. On conflict the
-- stored receipt hash is deliberately left untouched — receipt tokens
-- are HMAC-derived per key (receipt.ts), so the retry credential is
-- identical and always resolves.
--
-- Additive and signature-identical: no type regeneration needed.
-- Grants unchanged (owner-only; REVOKE re-issued for re-runnability).

create or replace function public.create_public_order(
  p_customer_name text,
  p_phone text,
  p_phone_normalized text,
  p_whatsapp text,
  p_whatsapp_normalized text,
  p_email text,
  p_email_normalized text,
  p_preferred_contact text,
  p_city text,
  p_delivery_address text,
  p_delivery_notes text,
  p_product_type text,
  p_quantity integer,
  p_configuration jsonb,
  p_unit_price_minor bigint,
  p_line_total_minor bigint,
  p_subtotal_minor bigint,
  p_delivery_fee_minor bigint,
  p_discount_minor bigint,
  p_total_minor bigint,
  p_pricing_status text,
  p_locale text,
  p_customer_notes text,
  p_first_touch_source text,
  p_first_landing_path text,
  p_first_referrer text,
  p_first_utm_source text,
  p_first_utm_medium text,
  p_first_utm_campaign text,
  p_first_utm_content text,
  p_first_utm_term text,
  p_last_touch_source text,
  p_conversion_path text,
  p_last_referrer text,
  p_last_utm_source text,
  p_last_utm_medium text,
  p_last_utm_campaign text,
  p_last_utm_content text,
  p_last_utm_term text,
  p_idempotency_key uuid,
  p_receipt_token_hash text
)
returns table (order_number text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item_id uuid;
begin
  -- Defense-in-depth gates (server action validates first).
  if p_quantity is null or p_quantity < 1 then
    raise exception 'invalid quantity';
  end if;
  if jsonb_typeof(p_configuration) <> 'object' then
    raise exception 'invalid configuration';
  end if;
  if p_receipt_token_hash is null or char_length(p_receipt_token_hash) <> 64 then
    raise exception 'invalid receipt token hash';
  end if;
  if p_idempotency_key is null then
    raise exception 'invalid idempotency key';
  end if;

  -- Idempotent insert: the unique index arbitrates concurrent same-key
  -- races, so no caller ever sees 23505 from this path.
  insert into public.orders (
    channel,
    customer_name, phone, phone_normalized,
    whatsapp, whatsapp_normalized, email, email_normalized,
    preferred_contact, city, delivery_address, delivery_notes,
    pricing_status, subtotal_minor, delivery_fee_minor,
    discount_minor, total_minor, currency,
    customer_notes, locale,
    first_touch_source, first_landing_path, first_referrer,
    first_utm_source, first_utm_medium, first_utm_campaign,
    first_utm_content, first_utm_term,
    last_touch_source, conversion_path, last_referrer,
    last_utm_source, last_utm_medium, last_utm_campaign,
    last_utm_content, last_utm_term,
    idempotency_key, receipt_token_hash
  ) values (
    'WEBSITE',
    p_customer_name, p_phone, p_phone_normalized,
    nullif(p_whatsapp, ''), nullif(p_whatsapp_normalized, ''),
    nullif(p_email, ''), nullif(p_email_normalized, ''),
    p_preferred_contact, p_city, p_delivery_address,
    nullif(p_delivery_notes, ''),
    p_pricing_status, p_subtotal_minor, p_delivery_fee_minor,
    coalesce(p_discount_minor, 0), p_total_minor, 'MAD',
    nullif(p_customer_notes, ''), p_locale,
    p_first_touch_source, p_first_landing_path, p_first_referrer,
    p_first_utm_source, p_first_utm_medium, p_first_utm_campaign,
    p_first_utm_content, p_first_utm_term,
    p_last_touch_source, p_conversion_path, p_last_referrer,
    p_last_utm_source, p_last_utm_medium, p_last_utm_campaign,
    p_last_utm_content, p_last_utm_term,
    p_idempotency_key, p_receipt_token_hash
  )
  on conflict (idempotency_key) do nothing
  returning public.orders.id, public.orders.order_number
    into v_order_id, v_order_number;

  if not found then
    -- Idempotency hit (sequential retry or race loser): return the
    -- original receipt. The stored hash is untouched — the derived
    -- retry token matches it by construction.
    select o.id, o.order_number into v_order_id, v_order_number
      from public.orders o
     where o.idempotency_key = p_idempotency_key;
    return query select v_order_number, false;
    return;
  end if;

  insert into public.order_items (
    order_id, product_type, quantity,
    unit_price_minor, line_total_minor, configuration
  ) values (
    v_order_id, p_product_type, p_quantity,
    p_unit_price_minor, p_line_total_minor, p_configuration
  )
  returning id into v_item_id;

  insert into public.order_events (
    order_id, event_type, actor_type, metadata
  ) values (
    v_order_id, 'ORDER_CREATED', 'CUSTOMER', '{}'::jsonb
  );

  return query select v_order_number, true;
end;
$$;

revoke all on function public.create_public_order(
  text, text, text, text, text, text, text, text, text, text,
  text, text, integer, jsonb, bigint, bigint, bigint, bigint,
  bigint, bigint, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text,
  text, text, uuid, text
) from public;
