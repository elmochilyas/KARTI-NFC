-- Karti Vitrine & Orders — Phase 4 conversion & provisioning
-- (specs/specs-vitrin/05, user prompt §§8-10, 20-24, 32-35).
--
-- Why RPCs instead of reusing the TS orchestration: supabase-js cannot
-- span a transaction, yet conversion (client + profile + links + events)
-- and provisioning (N cards + relations + events) must be all-or-nothing
-- with SELECT FOR UPDATE serialization. The application-layer
-- configureCardForClient() is single-card and stays authoritative for the
-- client NFC flow; these functions reuse the same DB-level invariants
-- (card_number_seq, CHECKs, trg_cards_integrity, UNIQUE guards) and the
-- same generation algorithms (slug/short-code inputs are generated in TS
-- via the existing helpers and passed in — this file validates, never
-- invents). Mirrors of src/domain/orders/catalog.ts mapping are marked
-- MIRROR below; TS stays authoritative for UX, SQL enforces.
--
-- Deliberate deviation (documented): provisioned cards go ACTIVE with a
-- DRAFT profile destination allowed. The orchestration's ACTIVE-profile
-- gate would deadlock the order flow (conversion creates DRAFT); the
-- resolver fail-closes until activation, and the trigger still enforces
-- same-client existence. No fulfillment auto-moves happen here.
--
-- Additive: no table, column, or policy changes.

-- ---------------------------------------------------------------------------
-- Shared product mapping (MIRROR of MARKETING_PRODUCT_CATALOG requires /
-- profileType / destination). Returns requires_profile + profile_type.
-- ---------------------------------------------------------------------------
create or replace function private.order_product_profile_need(p_product text)
returns table (requires_profile boolean, profile_type text)
language sql
stable
set search_path = ''
as $function$
  select
    case p_product
      when 'PERSONAL_CARD' then true
      when 'CAREER_CARD' then true
      when 'BUSINESS_CARD' then true
      when 'CONTACT_CARD' then true
      when 'GOOGLE_REVIEW_CARD' then false
      when 'WHATSAPP_CARD' then false
      when 'INSTAGRAM_CARD' then false
      when 'CUSTOM_LINK_CARD' then false
      else null
    end,
    case p_product
      when 'PERSONAL_CARD' then 'PERSON'
      when 'CAREER_CARD' then 'PERSON'
      when 'BUSINESS_CARD' then 'BUSINESS'
      when 'CONTACT_CARD' then 'PERSON'
      else null
    end;
$function$;

-- ---------------------------------------------------------------------------
-- 1. Atomic order → client (+ profile) conversion.
-- ---------------------------------------------------------------------------
-- Either/or slots default to NULL so typed callers can OMIT unused keys
-- (the generator marks defaulted args optional; explicit JSON nulls would
-- not typecheck). Omitted keys arrive as NULL, which the body handles.
create or replace function public.admin_convert_order(
  p_order_id uuid,
  p_expected_status text,
  p_mode text,
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_client_email text default null,
  p_client_company text default null,
  p_profile_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_customer_name text;
  v_client_id uuid;
  v_item record;
  v_need record;
  v_req_type text := null;
  v_req_any boolean := false;
  v_config jsonb;
  v_display text;
  v_job text;
  v_contact_phone text;
  v_contact_email text;
  v_profile_id uuid;
  v_profile_type text;
  v_profile_created boolean := false;
  v_name text;
  v_phone text;
  v_email text;
  v_company text;
  v_slug text;
  v_constraint text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;
  if p_mode not in ('existing', 'new') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  -- Lock + existence + staleness.
  select o.status, o.customer_name, o.client_id
    into v_status, v_customer_name, v_client_id
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_status <> p_expected_status then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT', 'status', v_status);
  end if;

  -- Idempotent retry: already linked → return the relation, no events.
  if v_client_id is not null then
    return jsonb_build_object('ok', true, 'converted', false, 'client_id', v_client_id);
  end if;

  -- Eligibility: CONFIRMED, or IN_PROGRESS before conversion.
  if v_status not in ('CONFIRMED', 'IN_PROGRESS') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;

  -- Resolve required profile type across items (V1: single product;
  -- mixed required types rejected conservatively).
  for v_item in
    select i.id, i.product_type, i.configuration
      from public.order_items i
     where i.order_id = p_order_id
     order by i.created_at
  loop
    select r.requires_profile, r.profile_type into v_need
      from private.order_product_profile_need(v_item.product_type) r;
    if v_need.requires_profile is null then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
    if v_need.requires_profile then
      v_req_any := true;
      if v_req_type is null then
        v_req_type := v_need.profile_type;
        v_config := v_item.configuration;
      elsif v_req_type <> v_need.profile_type then
        return jsonb_build_object('ok', false, 'code', 'VALIDATION');
      end if;
    end if;
  end loop;

  if p_mode = 'existing' then
    if p_client_id is null then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
    select c.id into v_client_id
      from public.clients c
     where c.id = p_client_id;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    end if;
  else
    -- New client from trusted order data (validated, never JSON dump).
    v_name := btrim(coalesce(p_client_name, ''));
    v_phone := nullif(btrim(coalesce(p_client_phone, '')), '');
    v_email := nullif(lower(btrim(coalesce(p_client_email, ''))), '');
    v_company := nullif(btrim(coalesce(p_client_company, '')), '');
    if char_length(v_name) < 1 or char_length(v_name) > 120 then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
    if v_phone is not null and (char_length(v_phone) < 4 or char_length(v_phone) > 32) then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
    if v_email is not null
       and (char_length(v_email) > 320
            or position('@' in v_email) < 2
            or position('.' in substring(v_email from position('@' in v_email))) < 2) then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
    if v_company is not null and char_length(v_company) > 120 then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;

    insert into public.clients (name, phone, email, company)
    values (v_name, v_phone, v_email, v_company)
    returning id into v_client_id;
  end if;

  -- Profile resolution when the product requires one.
  if v_req_any then
    select p.id, p.profile_type into v_profile_id, v_profile_type
      from public.profiles p
     where p.client_id = v_client_id;
    if found and v_profile_type <> v_req_type then
      -- Incompatible: no writes performed so far except possibly the new
      -- client row — which the transaction rolls back with this error.
      -- (Raised as an exception carrying a typed code; the action maps it.)
      raise exception 'PROFILE_CONFLICT:%', v_profile_type
        using errcode = 'P0001';
    end if;

    if not found then
      -- Create from order-safe data (DRAFT, never exposed publicly).
      v_slug := btrim(coalesce(p_profile_slug, ''));
      if v_slug !~ '^[a-z0-9-]{1,120}$'
         or v_slug in ('admin','api','auth','cards','clients','dashboard',
           'login','logout','new','profiles','settings','t','u','fr','ar',
           'en','products','solutions','pricing','examples','resources',
           'guides','faq','contact','order','orders','about','delivery',
           'returns','privacy','terms','how-it-works') then
        return jsonb_build_object('ok', false, 'code', 'VALIDATION');
      end if;
      v_display := coalesce(
        nullif(btrim(coalesce(v_config ->> 'businessName', '')), ''),
        nullif(btrim(coalesce(v_config ->> 'fullName', '')), ''),
        btrim(v_customer_name));
      if char_length(v_display) < 1 or char_length(v_display) > 120 then
        return jsonb_build_object('ok', false, 'code', 'VALIDATION');
      end if;
      v_job := nullif(btrim(coalesce(v_config ->> 'professionalTitle', '')), '');
      if v_job is not null and char_length(v_job) > 120 then
        v_job := left(v_job, 120);
      end if;
      v_contact_phone := nullif(btrim(coalesce(v_config ->> 'phone', '')), '');
      v_contact_email := nullif(lower(btrim(coalesce(v_config ->> 'email', ''))), '');

      begin
        insert into public.profiles (
          client_id, profile_type, slug, display_name,
          job_title, phone, email,
          template
        ) values (
          v_client_id, v_req_type, v_slug, v_display,
          v_job, v_contact_phone, v_contact_email,
          case v_req_type when 'BUSINESS' then 'business' else 'personal' end
        )
        returning id into v_profile_id;
        v_profile_created := true;

        -- Foundation sections, best-effort (never fails conversion —
        -- mirrors createProfileInternal semantics; missing rows render
        -- defaults and restore on first edit).
        begin
          insert into public.profile_sections (profile_id, type, position, enabled) values
            (v_profile_id, 'hero', 1, true),
            (v_profile_id, 'actions', 2, true),
            (v_profile_id, 'links', 3, true);
        exception when others then
          null;
        end;
      exception when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint = 'profiles_slug_unique' then
          return jsonb_build_object('ok', false, 'code', 'SLUG_TAKEN');
        elsif v_constraint = 'profiles_client_id_unique' then
          -- Concurrent conversion won the race: reuse if compatible.
          select p.id, p.profile_type into v_profile_id, v_profile_type
            from public.profiles p
           where p.client_id = v_client_id;
          if not found or v_profile_type <> v_req_type then
            raise exception 'PROFILE_CONFLICT:%', coalesce(v_profile_type, 'unknown')
              using errcode = 'P0001';
          end if;
        else
          raise;
        end if;
      end;
    end if;
  end if;

  -- Links.
  update public.orders o
     set client_id = v_client_id
   where o.id = p_order_id;

  if v_req_any and v_profile_id is not null then
    update public.order_items i
       set profile_id = v_profile_id
     where i.order_id = p_order_id;
  end if;

  -- Events (identifiers only, no PII duplication).
  if p_mode = 'new' then
    insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
    values (p_order_id, 'CLIENT_CREATED', 'ADMIN', auth.uid(),
            jsonb_build_object('client_id', v_client_id));
  end if;
  insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
  values (p_order_id, 'CLIENT_LINKED', 'ADMIN', auth.uid(),
          jsonb_build_object('client_id', v_client_id, 'mode', p_mode));
  if v_req_any and v_profile_id is not null then
    if v_profile_created then
      insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
      values (p_order_id, 'PROFILE_CREATED', 'ADMIN', auth.uid(),
              jsonb_build_object('profile_id', v_profile_id, 'profile_type', v_req_type));
    end if;
    insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
    values (p_order_id, 'PROFILE_LINKED', 'ADMIN', auth.uid(),
            jsonb_build_object('profile_id', v_profile_id,
                               'created', v_profile_created));
  end if;

  return jsonb_build_object(
    'ok', true,
    'converted', true,
    'client_id', v_client_id,
    'profile_id', v_profile_id,
    'profile_created', v_profile_created
  );
exception when raise_exception then
  if sqlerrm like 'PROFILE_CONFLICT:%' then
    return jsonb_build_object(
      'ok', false, 'code', 'PROFILE_CONFLICT',
      'existing_profile_type', substring(sqlerrm from 'PROFILE_CONFLICT:(.*)')
    );
  end if;
  raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Idempotent multi-card provisioning for one order item.
-- ---------------------------------------------------------------------------
create or replace function public.admin_provision_order_cards(
  p_order_id uuid,
  p_order_item_id uuid,
  p_expected_fulfillment text,
  p_profile_id uuid default null,
  p_destination_url text default null,
  p_short_codes text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_fulfillment text;
  v_client_id uuid;
  v_quantity integer;
  v_product text;
  v_item_profile uuid;
  v_need record;
  v_linked integer;
  v_remaining integer;
  v_code text;
  v_card_id uuid;
  v_card_ids uuid[] := '{}';
  v_url text;
  v_constraint text;
  i integer;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  -- Lock order + item (item must belong to the order).
  select o.status, o.fulfillment_status, o.client_id
    into v_status, v_fulfillment, v_client_id
    from public.orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  select i.quantity, i.product_type, i.profile_id
    into v_quantity, v_product, v_item_profile
    from public.order_items i
   where i.id = p_order_item_id and i.order_id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  if v_client_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION');
  end if;
  if v_status in ('CANCELLED', 'COMPLETED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'status', v_status);
  end if;
  if v_fulfillment <> p_expected_fulfillment then
    return jsonb_build_object(
      'ok', false, 'code', 'CONFLICT', 'fulfillment_status', v_fulfillment
    );
  end if;

  select r.requires_profile, r.profile_type into v_need
    from private.order_product_profile_need(v_product) r;
  if v_need.requires_profile is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select count(*) into v_linked
    from public.order_item_cards c
   where c.order_item_id = p_order_item_id;
  v_remaining := greatest(v_quantity - v_linked, 0);

  -- Eligibility mirror of canProvisionAtFulfillment(): NFC_CONFIGURATION
  -- always; later states only as resume when cards are already linked.
  if v_fulfillment = 'NFC_CONFIGURATION' then
    null;
  elsif v_linked > 0 and v_fulfillment in ('READY', 'SHIPPED', 'DELIVERED') then
    null;
  else
    return jsonb_build_object(
      'ok', false, 'code', 'INVALID_TRANSITION', 'fulfillment_status', v_fulfillment
    );
  end if;

  -- Idempotent no-op: everything already provisioned.
  if v_remaining <= 0 then
    return jsonb_build_object('ok', true, 'provisioned', 0, 'card_ids', '{}');
  end if;
  if p_short_codes is null or coalesce(array_length(p_short_codes, 1), 0) < v_remaining then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  -- Destination readiness (re-validated, never trusted raw).
  if v_need.requires_profile then
    if p_profile_id is null
       or p_profile_id <> v_item_profile
       or not exists (select 1 from public.profiles p
                       where p.id = p_profile_id and p.client_id = v_client_id) then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;
  else
    v_url := btrim(coalesce(p_destination_url, ''));
    -- Shape backstop mirroring validateSafeExternalUrl() (domain/urls.ts):
    -- scheme + length + control chars, plus userinfo rejection
    -- (credentials before the first path slash are a phishing vector;
    -- a bare '@' inside the path stays legal). Full parsing +
    -- normalization stay in the TS layer, which always resolves the URL
    -- before calling; the DB trigger enforces the same shape on write.
    if char_length(v_url) < 1 or char_length(v_url) > 2048
       or v_url !~ '^https?://'
       or v_url ~ '[[:cntrl:]]'
       or substring(v_url from '^https?://([^/]*)') like '%@%' then
      return jsonb_build_object('ok', false, 'code', 'DESTINATION_REQUIRED');
    end if;
  end if;

  for i in 1 .. v_remaining loop
    v_code := upper(btrim(coalesce(p_short_codes[i], '')));
    if v_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$' then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION');
    end if;

    begin
      if v_need.requires_profile then
        insert into public.cards (
          short_code, client_id, destination_type,
          destination_profile_id, status
        ) values (
          v_code, v_client_id, 'PROFILE', p_profile_id, 'ACTIVE'
        )
        returning id into v_card_id;
      else
        insert into public.cards (
          short_code, client_id, destination_type,
          destination_url, status
        ) values (
          v_code, v_client_id, 'EXTERNAL_URL', v_url, 'ACTIVE'
        )
        returning id into v_card_id;
      end if;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'cards_short_code_unique' then
        -- Nothing persisted (statement + function txn abort to this
        -- point); the caller regenerates codes and retries.
        return jsonb_build_object('ok', false, 'code', 'SHORT_CODE_COLLISION');
      end if;
      raise;
    end;

    insert into public.order_item_cards (order_item_id, card_id)
    values (p_order_item_id, v_card_id);

    insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
    values (p_order_id, 'CARD_LINKED', 'ADMIN', auth.uid(),
            jsonb_build_object('card_id', v_card_id, 'order_item_id', p_order_item_id));
    insert into public.order_events (order_id, event_type, actor_type, actor_user_id, metadata)
    values (p_order_id, 'CARD_CONFIGURED', 'ADMIN', auth.uid(),
            jsonb_build_object('card_id', v_card_id,
                               'destination_type',
                               case when v_need.requires_profile then 'PROFILE'
                                    else 'EXTERNAL_URL' end));
    v_card_ids := v_card_ids || v_card_id;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'provisioned', v_remaining,
    'card_ids', v_card_ids
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Google review destination resolution (operator-supplied URL into the
--    item configuration + auditable event). Only GOOGLE_REVIEW_CARD items.
-- ---------------------------------------------------------------------------
create or replace function public.admin_resolve_order_destination(
  p_order_item_id uuid,
  p_expected_item_updated_at timestamptz,
  p_review_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_product text;
  v_config jsonb;
  v_updated timestamptz;
  v_url text;
  v_old text;
begin
  if (select private.is_admin()) is not true then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  end if;

  v_url := btrim(coalesce(p_review_url, ''));
  if char_length(v_url) < 1 or char_length(v_url) > 2048
     or v_url !~ '^https://'
     or v_url ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION');
  end if;

  select i.order_id, i.product_type, i.configuration, i.updated_at
    into v_order_id, v_product, v_config, v_updated
    from public.order_items i
   where i.id = p_order_item_id
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if v_product <> 'GOOGLE_REVIEW_CARD' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION');
  end if;
  if v_updated <> p_expected_item_updated_at then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT');
  end if;
  if exists (select 1 from public.orders o
              where o.id = v_order_id and o.status in ('CANCELLED', 'COMPLETED')) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION');
  end if;

  v_old := v_config ->> 'reviewUrl';

  update public.order_items i
     set configuration = coalesce(v_config, '{}'::jsonb)
                         || jsonb_build_object('reviewUrl', v_url,
                                               'needsUrlHelp', false)
   where i.id = p_order_item_id;

  insert into public.order_events (order_id, event_type, actor_type, actor_user_id,
                                  from_value, to_value)
  values (v_order_id, 'DESTINATION_RESOLVED', 'ADMIN', auth.uid(), v_old, v_url);

  return jsonb_build_object('ok', true, 'url', v_url);
end;
$$;

-- ---------------------------------------------------------------------------
-- EXECUTE ACL: owner + authenticated only (Phase 2 lesson: explicit REVOKE
-- from PUBLIC and anon; non-admin callers rejected inside by is_admin()).
-- ---------------------------------------------------------------------------
revoke all on function public.admin_convert_order(uuid, text, text, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_convert_order(uuid, text, text, uuid, text, text, text, text, text) to authenticated;

revoke all on function public.admin_provision_order_cards(uuid, uuid, text, uuid, text, text[]) from public, anon;
grant execute on function public.admin_provision_order_cards(uuid, uuid, text, uuid, text, text[]) to authenticated;

revoke all on function public.admin_resolve_order_destination(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_resolve_order_destination(uuid, timestamptz, text) to authenticated;
