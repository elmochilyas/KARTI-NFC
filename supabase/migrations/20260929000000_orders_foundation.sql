-- Karti Vitrine & Orders — Phase 1 domain foundation (specs/specs-vitrin/03).
--
-- Additive only: new commercial tables (orders, order_items,
-- order_item_cards, order_events, inquiries) + order_number_seq.
-- Zero changes to clients / profiles / profile_links / cards.
--
-- Conventions (ADR-010 extended by ADR-070): domain values are TEXT + CHECK,
-- NOT native PostgreSQL enums — cheaper evolution, mirrored by TypeScript
-- unions in src/domain/orders/. Canonical values match
-- specs/specs-vitrin/03 §3 exactly.
--
-- Money: integer minor units only (bigint), currency TEXT default 'MAD'.
-- Human order numbers come from public.order_number_seq (atomic, never
-- SELECT MAX()+1); UUID remains the primary key. Gaps are acceptable.
--
-- RLS: enabled on all five tables. One admin-only policy each
-- ((select private.is_admin())); anonymous gets zero policies (default
-- deny). Public order creation arrives in Phase 2 via controlled
-- server-side logic — never direct anon INSERT.
-- See specs/DECISIONS.md ADR-070.

-- ---------------------------------------------------------------------------
-- Sequence: concurrency-safe human order numbers (KARTI-000001, …)
-- ---------------------------------------------------------------------------

create sequence if not exists public.order_number_seq as integer start with 1 increment by 1;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),

  order_number text not null unique default (
    'KARTI-' || lpad(nextval('public.order_number_seq')::text, 6, '0')
  ),
  idempotency_key uuid null unique,

  channel text not null default 'WEBSITE' check (
    channel in ('WEBSITE', 'DASHBOARD', 'OTHER')
  ),

  customer_name text not null check (char_length(customer_name) > 0),

  phone text not null check (char_length(phone) > 0),
  phone_normalized text not null check (char_length(phone_normalized) > 0),

  whatsapp text null,
  whatsapp_normalized text null,

  email text null,
  email_normalized text null,

  preferred_contact text not null check (
    preferred_contact in ('WHATSAPP', 'PHONE', 'EMAIL')
  ),

  city text not null check (char_length(city) > 0),
  delivery_address text not null check (char_length(delivery_address) > 0),
  delivery_notes text null,

  status text not null default 'NEW' check (
    status in ('NEW', 'CONTACTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
  ),
  payment_status text not null default 'PENDING' check (
    payment_status in ('NOT_REQUIRED', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED')
  ),
  fulfillment_status text not null default 'NOT_STARTED' check (
    fulfillment_status in (
      'NOT_STARTED', 'AWAITING_CUSTOMER_INFO', 'DESIGN', 'AWAITING_APPROVAL',
      'CHANGES_REQUESTED', 'APPROVED', 'PRODUCTION', 'NFC_CONFIGURATION',
      'READY', 'SHIPPED', 'DELIVERED'
    )
  ),

  pricing_status text not null check (
    pricing_status in ('PRICED', 'QUOTE_REQUIRED')
  ),

  subtotal_minor bigint null,
  delivery_fee_minor bigint null,
  discount_minor bigint not null default 0,
  total_minor bigint null,
  currency text not null default 'MAD',

  client_id uuid null references public.clients (id) on delete set null,

  customer_notes text null,
  internal_notes text null,

  locale text not null check (char_length(locale) > 0),

  first_touch_source text null check (
    first_touch_source is null or first_touch_source in (
      'DIRECT', 'ORGANIC_SEARCH', 'PAID_SEARCH', 'ORGANIC_SOCIAL',
      'PAID_SOCIAL', 'REFERRAL', 'OTHER', 'UNKNOWN'
    )
  ),
  first_landing_path text null,
  first_referrer text null,
  first_utm_source text null,
  first_utm_medium text null,
  first_utm_campaign text null,
  first_utm_content text null,
  first_utm_term text null,

  last_touch_source text null check (
    last_touch_source is null or last_touch_source in (
      'DIRECT', 'ORGANIC_SEARCH', 'PAID_SEARCH', 'ORGANIC_SOCIAL',
      'PAID_SOCIAL', 'REFERRAL', 'OTHER', 'UNKNOWN'
    )
  ),
  conversion_path text null,
  last_referrer text null,
  last_utm_source text null,
  last_utm_medium text null,
  last_utm_campaign text null,
  last_utm_content text null,
  last_utm_term text null,

  receipt_token_hash text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_money_non_negative check (
    discount_minor >= 0
    and (subtotal_minor is null or subtotal_minor >= 0)
    and (delivery_fee_minor is null or delivery_fee_minor >= 0)
    and (total_minor is null or total_minor >= 0)
  ),
  constraint orders_currency_shape check (char_length(currency) = 3),
  -- Quote-required orders may carry null totals; priced orders must not.
  constraint orders_priced_totals_present check (
    pricing_status = 'QUOTE_REQUIRED'
    or (subtotal_minor is not null and total_minor is not null)
  )
);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- order_items (multi-item capable; V1 creates one per order)
-- ---------------------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders (id) on delete cascade,

  product_type text not null check (
    product_type in (
      'PERSONAL_CARD', 'CAREER_CARD', 'BUSINESS_CARD', 'GOOGLE_REVIEW_CARD',
      'WHATSAPP_CARD', 'INSTAGRAM_CARD', 'CONTACT_CARD', 'CUSTOM_LINK_CARD'
    )
  ),

  quantity integer not null check (quantity > 0),

  unit_price_minor bigint null,
  line_total_minor bigint null,

  configuration jsonb not null default '{}',

  profile_id uuid null references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint order_items_prices_non_negative check (
    (unit_price_minor is null or unit_price_minor >= 0)
    and (line_total_minor is null or line_total_minor >= 0)
  ),
  constraint order_items_configuration_is_object check (
    jsonb_typeof(configuration) = 'object'
  )
);

create trigger trg_order_items_updated_at
  before update on public.order_items
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- order_item_cards (one item may provision several physical cards)
-- ---------------------------------------------------------------------------

create table public.order_item_cards (
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  created_at timestamptz not null default now(),

  primary key (order_item_id, card_id)
);

-- ---------------------------------------------------------------------------
-- order_events (append-only history; current state lives on orders)
-- ---------------------------------------------------------------------------

create table public.order_events (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null references public.orders (id) on delete cascade,

  event_type text not null check (char_length(event_type) > 0),

  actor_type text not null check (
    actor_type in ('SYSTEM', 'CUSTOMER', 'ADMIN')
  ),

  actor_user_id uuid null,

  from_value text null,
  to_value text null,

  metadata jsonb not null default '{}',

  created_at timestamptz not null default now(),

  constraint order_events_metadata_is_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

-- ---------------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------------

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),

  name text not null check (char_length(name) > 0),
  phone text null,
  phone_normalized text null,
  email text null,
  email_normalized text null,
  company text null,

  inquiry_type text null,
  message text not null check (char_length(message) > 0),

  status text not null default 'NEW' check (
    status in ('NEW', 'CONTACTED', 'CLOSED', 'SPAM')
  ),

  locale text null,

  source text null check (
    source is null or source in (
      'DIRECT', 'ORGANIC_SEARCH', 'PAID_SEARCH', 'ORGANIC_SOCIAL',
      'PAID_SOCIAL', 'REFERRAL', 'OTHER', 'UNKNOWN'
    )
  ),
  landing_path text null,
  referrer text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  utm_term text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes (spec 03 §12; no heavyweight search infrastructure)
-- ---------------------------------------------------------------------------

create index orders_status_created_idx
  on public.orders (status, created_at desc);
create index orders_fulfillment_created_idx
  on public.orders (fulfillment_status, created_at desc);
create index orders_payment_created_idx
  on public.orders (payment_status, created_at desc);
create index orders_client_id_idx
  on public.orders (client_id);
create index orders_phone_normalized_idx
  on public.orders (phone_normalized);
create index orders_email_normalized_idx
  on public.orders (email_normalized);
create index orders_created_at_idx
  on public.orders (created_at desc);

create index order_items_order_id_idx
  on public.order_items (order_id);
create index order_items_product_type_idx
  on public.order_items (product_type);

create index order_events_order_created_idx
  on public.order_events (order_id, created_at);

create index order_item_cards_card_id_idx
  on public.order_item_cards (card_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: admin-only CRUD, anonymous default-deny (no policies)
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_cards enable row level security;
alter table public.order_events enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
  on public.orders for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
  on public.order_items for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage order item cards" on public.order_item_cards;
create policy "Admins manage order item cards"
  on public.order_item_cards for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage order events" on public.order_events;
create policy "Admins manage order events"
  on public.order_events for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Admins manage inquiries" on public.inquiries;
create policy "Admins manage inquiries"
  on public.inquiries for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
