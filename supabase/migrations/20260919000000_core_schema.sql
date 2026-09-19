-- Karti core schema — Phase 2 (specs/DATA_MODEL.md, specs/DOMAIN_RULES.md).
--
-- Tables: clients, profiles, profile_links, cards.
-- Conventions (see specs/DECISIONS.md ADR-010):
--   * UUID primary keys via gen_random_uuid() (builtin, no extension needed).
--   * Domain values as TEXT + CHECK constraints (simpler evolution than enums).
--   * updated_at maintained by a shared trigger.
--   * Delete behavior is deliberate: links cascade with their profile; nothing
--     ever cascade-deletes physical cards or silently drops client history.
--   * RLS enabled on all app tables. MVP: any authenticated Supabase user is
--     treated as a Karti admin (only operator accounts are provisioned —
--     documented tradeoff, ADR-011). No anonymous policies; public reads go
--     through server-side application code in Phase 5.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),

  name text not null check (char_length(name) > 0),
  company text null,
  phone text null,
  email text null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phone/email are intentionally NOT unique: a company switchboard or shared
-- inbox may legitimately appear on several client records.

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,

  profile_type text not null check (profile_type in ('PERSON', 'BUSINESS')),
  slug text not null check (char_length(slug) > 0),

  display_name text not null check (char_length(display_name) > 0),
  job_title text null,
  company_name text null,
  bio text null,

  avatar_path text null,
  cover_path text null,

  phone text null,
  whatsapp text null,
  email text null,
  website text null,

  address text null,
  maps_url text null,

  accent_color text null,
  theme text not null default 'light' check (theme in ('light', 'dark')),

  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'INACTIVE')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_slug_unique unique (slug)
);

-- Slug normalization + reserved-route validation live in the application
-- domain (src/domain/slugs.ts); the database is the final uniqueness guard.

create index profiles_client_id_idx on public.profiles (client_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- profile_links
-- ---------------------------------------------------------------------------

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  type text not null check (char_length(type) > 0),
  label text not null check (char_length(label) > 0),
  url text not null check (char_length(url) > 0),
  icon text null,

  sort_order integer not null default 0,
  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Links belong to exactly one profile; deleting the profile removes its links.

create index profile_links_profile_id_idx on public.profile_links (profile_id);
create index profile_links_profile_order_idx on public.profile_links (profile_id, sort_order);

create trigger trg_profile_links_updated_at
  before update on public.profile_links
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------

create table public.cards (
  id uuid primary key default gen_random_uuid(),

  card_number text not null check (char_length(card_number) > 0),
  short_code text not null check (char_length(short_code) > 0),

  client_id uuid null references public.clients (id) on delete set null,

  destination_type text null check (
    destination_type is null or destination_type in ('PROFILE', 'EXTERNAL_URL')
  ),
  destination_profile_id uuid null references public.profiles (id) on delete restrict,
  destination_url text null,

  status text not null default 'UNASSIGNED' check (
    status in ('UNASSIGNED', 'ASSIGNED', 'ACTIVE', 'DISABLED', 'LOST', 'REPLACED')
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cards_card_number_unique unique (card_number),
  constraint cards_short_code_unique unique (short_code),

  -- Destination consistency: a card points to a profile OR an external URL,
  -- never both, never a half-configured mix. Unassigned cards have no
  -- destination at all.
  constraint cards_destination_consistent check (
    (
      destination_type = 'PROFILE'
      and destination_profile_id is not null
      and destination_url is null
    )
    or (
      destination_type = 'EXTERNAL_URL'
      and destination_profile_id is null
      and destination_url is not null
    )
    or (
      destination_type is null
      and destination_profile_id is null
      and destination_url is null
    )
  )
);

-- Short codes are random + unique; the database is the final collision guard
-- (application retries on unique violation, Phase 7).
-- Delete behavior: removing a client unassigns its cards (SET NULL) instead
-- of destroying physical-card history; removing a referenced profile is
-- blocked (RESTRICT) so a card can never dangle.

create trigger trg_cards_updated_at
  before update on public.cards
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.cards enable row level security;

-- MVP single-admin model: only operator accounts are provisioned in this
-- Supabase project, so any authenticated user may perform admin CRUD.
-- Anonymous users get no policies at all (default deny).
-- Revisit with an admin allowlist when non-admin accounts arrive (ADR-011).

create policy "Authenticated admins manage clients"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admins manage profiles"
  on public.profiles for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admins manage profile links"
  on public.profile_links for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated admins manage cards"
  on public.cards for all
  to authenticated
  using (true)
  with check (true);
