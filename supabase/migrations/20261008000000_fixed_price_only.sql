-- Karti fixed-price-only simplification (see ADR: "Karti Product Pricing —
-- Fixed Price Only").
--
-- Every Karti product has exactly one fixed base price configured by the
-- operator in /dashboard/catalog/[productType]. QUOTE / FROM / FIXED modes,
-- orders.pricing_status, and the quote-price RPC are removed.
--
-- Safety: at deploy time the database holds 0 orders, 0 order_items and
-- 0 order_events, and all 8 catalog rows are (published, price NULL). No
-- commercial history exists to preserve, so columns are dropped rather
-- than deprecated. Historical applied migrations are left untouched.
--
-- Transitional step: catalog_products.price_minor stays NULLABLE so the
-- migration never invents prices. NULL means "Price not configured" (an
-- admin readiness state, not a pricing mode): the product cannot be
-- ordered and emits no Product JSON-LD until the operator enters the real
-- price. A later hardening migration will SET NOT NULL once all 8 real
-- prices are configured.

-- ---------------------------------------------------------------------------
-- 1. Catalog: drop pricing_mode + its cross-check.
-- ---------------------------------------------------------------------------

do $$
declare
  cname text;
begin
  for cname in
    select conname
      from pg_constraint
     where conrelid = 'public.catalog_products'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%pricing_mode%'
  loop
    execute format('alter table public.catalog_products drop constraint %I', cname);
  end loop;
end;
$$;

alter table public.catalog_products
  drop column if exists pricing_mode;

-- Transitional: NULL = "Price not configured". Positive-only gate stays.
-- (The column-level CHECK (null or > 0) from the CMS migration is kept.)

-- ---------------------------------------------------------------------------
-- 2. Orders: pricing_status is redundant — every order snapshots a known
--    fixed price at submission, so no order pricing state is needed.
--    Money columns become always-present.
-- ---------------------------------------------------------------------------

alter table public.orders
  drop constraint if exists orders_priced_totals_present;

alter table public.orders
  drop column if exists pricing_status;

alter table public.orders
  alter column subtotal_minor set not null,
  alter column subtotal_minor set default 0,
  alter column delivery_fee_minor set not null,
  alter column delivery_fee_minor set default 0,
  alter column total_minor set not null,
  alter column total_minor set default 0;

-- ---------------------------------------------------------------------------
-- 3. Order items: the unit/line snapshot is immutable history — always set.
-- ---------------------------------------------------------------------------

alter table public.order_items
  alter column unit_price_minor set not null,
  alter column line_total_minor set not null;

-- ---------------------------------------------------------------------------
-- 4. Public order RPC: drop p_pricing_status, harden money gates.
--    Base price arrives snapshotted from the server-loaded catalog; the
--    browser never supplies amounts.
-- ---------------------------------------------------------------------------

drop function if exists public.create_public_order;

create function public.create_public_order(
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
  v_delivery bigint;
  v_discount bigint;
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
  -- Fixed-price snapshot must be fully known at submission.
  if p_unit_price_minor is null or p_unit_price_minor <= 0 then
    raise exception 'invalid unit price snapshot';
  end if;
  if p_line_total_minor is null or p_line_total_minor <= 0 then
    raise exception 'invalid line total snapshot';
  end if;
  if p_subtotal_minor is null or p_subtotal_minor <= 0 then
    raise exception 'invalid subtotal snapshot';
  end if;
  v_delivery := coalesce(p_delivery_fee_minor, 0);
  v_discount := coalesce(p_discount_minor, 0);
  if v_delivery < 0 or v_discount < 0 then
    raise exception 'invalid adjustments';
  end if;
  if p_total_minor is null
    or p_total_minor <> p_subtotal_minor + v_delivery - v_discount
    or p_total_minor < 0 then
    raise exception 'invalid total snapshot';
  end if;

  insert into public.orders (
    channel,
    customer_name, phone, phone_normalized,
    whatsapp, whatsapp_normalized, email, email_normalized,
    preferred_contact, city, delivery_address, delivery_notes,
    subtotal_minor, delivery_fee_minor,
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
    p_subtotal_minor, v_delivery,
    v_discount, p_total_minor, 'MAD',
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
  text, uuid, text
) from public;

-- ---------------------------------------------------------------------------
-- 5. Admin adjustments: the snapshotted base subtotal is IMMUTABLE.
--    The operator may edit delivery fee and discount only; the server
--    recomputes total = subtotal + delivery − discount. Replaces the old
--    quote-based admin_set_order_price (removed).
-- ---------------------------------------------------------------------------

drop function if exists public.admin_set_order_price(uuid, timestamptz, bigint, bigint, bigint);

create function public.admin_update_order_adjustments(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
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
  v_subtotal bigint;
  v_total bigint;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  if p_delivery_fee_minor is null or p_delivery_fee_minor < 0
    or p_discount_minor is null or p_discount_minor < 0 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select o.status, o.updated_at, o.subtotal_minor into v_status, v_updated, v_subtotal
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
  if v_subtotal is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  -- Base subtotal is never supplied by the operator: it stays exactly as
  -- snapshotted at order creation.
  v_total := v_subtotal + p_delivery_fee_minor - p_discount_minor;
  if v_total < 0 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  update public.orders o
     set delivery_fee_minor = p_delivery_fee_minor,
         discount_minor = p_discount_minor,
         total_minor = v_total
   where o.id = p_order_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
  values (
    p_order_id, 'PRICE_ADJUSTED', 'ADMIN', auth.uid(),
    jsonb_build_object(
      'subtotal_minor', v_subtotal,
      'delivery_fee_minor', p_delivery_fee_minor,
      'discount_minor', p_discount_minor,
      'total_minor', v_total,
      'currency', 'MAD'
    )
  );

  return jsonb_build_object('ok', true, 'total_minor', v_total);
end;
$$;

revoke all on function public.admin_update_order_adjustments(uuid, timestamptz, bigint, bigint) from public, anon;
grant execute on function public.admin_update_order_adjustments(uuid, timestamptz, bigint, bigint) to authenticated;
