-- Karti Catalog CMS — commercial overlay for the 8 canonical products
-- (specs: Catalog CMS phase; ADR-068).
--
-- Additive only: three new tables + one storage bucket. Zero changes to
-- clients / profiles / profile_links / cards / orders / order_items.
--
-- Conventions (ADR-010): domain values are TEXT + CHECK, NOT native enums.
-- Money: integer minor units only (bigint), currency TEXT default 'MAD'.
-- CMS controls commercial presentation ONLY — ProductType,
-- requiresProfile, profileType, destination type, provisioning and
-- normalization rules stay in application/domain code and are NOT
-- represented as editable DB fields.
--
-- Pricing truth: initial seed preserves current reality — every product is
-- QUOTE with NULL price. No prices are invented here; the operator enters
-- real prices through /dashboard/catalog after deploy.
--
-- RLS: enabled on all three tables. One admin-only policy each
-- ((select private.is_admin())); anonymous gets zero policies (default
-- deny). Public product rendering reads published rows through the
-- server-only service-role client (ADR-018/032 pattern), never via anon
-- policies — unpublished content is never exposed.

-- ---------------------------------------------------------------------------
-- catalog_products
-- ---------------------------------------------------------------------------

create table public.catalog_products (
  product_type text primary key check (product_type in (
    'PERSONAL_CARD', 'CAREER_CARD', 'BUSINESS_CARD', 'GOOGLE_REVIEW_CARD',
    'WHATSAPP_CARD', 'INSTAGRAM_CARD', 'CONTACT_CARD', 'CUSTOM_LINK_CARD'
  )),
  published boolean not null default true,
  pricing_mode text not null default 'QUOTE' check (
    pricing_mode in ('FIXED', 'FROM', 'QUOTE')
  ),
  price_minor bigint null check (price_minor is null or price_minor > 0),
  currency text not null default 'MAD' check (currency = 'MAD'),
  availability text null check (
    availability is null or availability in ('IN_STOCK', 'OUT_OF_STOCK', 'PREORDER')
  ),
  primary_image_path text null check (
    primary_image_path is null or char_length(primary_image_path) <= 512
  ),
  og_image_path text null check (
    og_image_path is null or char_length(og_image_path) <= 512
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- FIXED/FROM require a positive price; QUOTE forbids one.
  check (
    ((pricing_mode = 'FIXED' or pricing_mode = 'FROM') and price_minor is not null)
    or (pricing_mode = 'QUOTE' and price_minor is null)
  )
);

-- ---------------------------------------------------------------------------
-- catalog_product_localizations (fr/en/ar per product)
-- ---------------------------------------------------------------------------

create table public.catalog_product_localizations (
  product_type text not null references public.catalog_products (product_type) on delete cascade,
  locale text not null check (locale in ('fr', 'en', 'ar')),
  display_name text null check (display_name is null or char_length(display_name) between 1 and 120),
  short_name text null check (short_name is null or char_length(short_name) between 1 and 40),
  hero_title text null check (hero_title is null or char_length(hero_title) between 1 and 160),
  hero_description text null check (hero_description is null or char_length(hero_description) between 1 and 500),
  short_description text null check (short_description is null or char_length(short_description) between 1 and 300),
  outcome_text text null check (outcome_text is null or char_length(outcome_text) between 1 and 500),
  pricing_note text null check (pricing_note is null or char_length(pricing_note) between 1 and 300),
  seo_title text null check (seo_title is null or char_length(seo_title) between 1 and 160),
  seo_description text null check (seo_description is null or char_length(seo_description) between 1 and 300),
  -- Structured section content: arrays of strings, or FAQs as [{q,a}].
  -- Item shapes and length bounds are validated in the app Zod schemas;
  -- the DB enforces array-ness so a scalar/object can never land here.
  audiences jsonb not null default '[]' check (jsonb_typeof(audiences) = 'array'),
  benefits jsonb not null default '[]' check (jsonb_typeof(benefits) = 'array'),
  use_cases jsonb not null default '[]' check (jsonb_typeof(use_cases) = 'array'),
  included jsonb not null default '[]' check (jsonb_typeof(included) = 'array'),
  faqs jsonb not null default '[]' check (jsonb_typeof(faqs) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (product_type, locale)
);

-- ---------------------------------------------------------------------------
-- catalog_product_media
-- ---------------------------------------------------------------------------

create table public.catalog_product_media (
  id uuid primary key default gen_random_uuid(),
  product_type text not null references public.catalog_products (product_type) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 512),
  media_role text not null check (media_role in ('PRIMARY', 'GALLERY', 'CARD_PREVIEW', 'OG')),
  sort_order integer not null default 0 check (sort_order >= 0),
  alt_fr text null check (alt_fr is null or char_length(alt_fr) between 1 and 160),
  alt_en text null check (alt_en is null or char_length(alt_en) between 1 and 160),
  alt_ar text null check (alt_ar is null or char_length(alt_ar) between 1 and 160),
  created_at timestamptz not null default now()
);

create index catalog_product_media_product_idx
  on public.catalog_product_media (product_type, media_role, sort_order);

-- ---------------------------------------------------------------------------
-- updated_at triggers (shared handler)
-- ---------------------------------------------------------------------------

drop trigger if exists trg_catalog_products_updated_at on public.catalog_products;
create trigger trg_catalog_products_updated_at
  before update on public.catalog_products
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_catalog_product_localizations_updated_at on public.catalog_product_localizations;
create trigger trg_catalog_product_localizations_updated_at
  before update on public.catalog_product_localizations
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admin-only, anon default-deny (ADR-031 pattern)
-- ---------------------------------------------------------------------------

alter table public.catalog_products enable row level security;
alter table public.catalog_product_localizations enable row level security;
alter table public.catalog_product_media enable row level security;

create policy "Admins manage catalog products"
  on public.catalog_products for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins manage catalog localizations"
  on public.catalog_product_localizations for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins manage catalog media"
  on public.catalog_product_media for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage bucket: catalog-assets (public read, admin-only writes)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-assets',
  'catalog-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read of catalog assets"
  on storage.objects for select
  to public
  using (bucket_id = 'catalog-assets');

create policy "Admins upload catalog assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'catalog-assets' and (select private.is_admin()));

create policy "Admins update catalog assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'catalog-assets' and (select private.is_admin()))
  with check (bucket_id = 'catalog-assets' and (select private.is_admin()));

create policy "Admins delete catalog assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'catalog-assets' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Seed: one QUOTE row per canonical product + empty localization skeletons.
-- No prices, no copy — static dicts remain the fallback until the operator
-- enters real values through the dashboard.
-- ---------------------------------------------------------------------------

insert into public.catalog_products (product_type, published, pricing_mode, price_minor, currency)
values
  ('PERSONAL_CARD', true, 'QUOTE', null, 'MAD'),
  ('CAREER_CARD', true, 'QUOTE', null, 'MAD'),
  ('BUSINESS_CARD', true, 'QUOTE', null, 'MAD'),
  ('GOOGLE_REVIEW_CARD', true, 'QUOTE', null, 'MAD'),
  ('WHATSAPP_CARD', true, 'QUOTE', null, 'MAD'),
  ('INSTAGRAM_CARD', true, 'QUOTE', null, 'MAD'),
  ('CONTACT_CARD', true, 'QUOTE', null, 'MAD'),
  ('CUSTOM_LINK_CARD', true, 'QUOTE', null, 'MAD')
on conflict (product_type) do nothing;

insert into public.catalog_product_localizations (product_type, locale)
select p.product_type, l.locale
  from (values
    ('PERSONAL_CARD'), ('CAREER_CARD'), ('BUSINESS_CARD'),
    ('GOOGLE_REVIEW_CARD'), ('WHATSAPP_CARD'), ('INSTAGRAM_CARD'),
    ('CONTACT_CARD'), ('CUSTOM_LINK_CARD')
  ) as p (product_type)
  cross join (values ('fr'), ('en'), ('ar')) as l (locale)
on conflict (product_type, locale) do nothing;
