-- Karti public-read performance indexes (tap path).
--
-- No behavior change: additive indexes only, supporting the single-RTT
-- embed queries in resolveCardDestination (cards → profiles) and
-- getPublicProfileBySlug (profiles → profile_links).
--
-- * profiles(slug, status): ACTIVE-only slug lookups (embed + legacy).
-- * profile_links(profile_id, enabled, sort_order, created_at): enabled
--   links in display order for one profile (embed + legacy fallback).
-- * cards(short_code, status): resolver card lookup with ACTIVE gate.
--
-- Unique constraints on slug/short_code already index the leading column;
-- these composites keep the hot filters index-covered instead of heap-checked.

create index if not exists profiles_slug_status_idx
  on public.profiles (slug, status);

create index if not exists profile_links_profile_enabled_order_idx
  on public.profile_links (profile_id, enabled, sort_order, created_at);

create index if not exists cards_short_code_status_idx
  on public.cards (short_code, status);
