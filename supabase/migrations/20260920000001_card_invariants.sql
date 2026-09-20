-- Phase 12 security hardening: database-enforced card/profile invariants.
--
-- Closes direct-API bypasses of application service checks. All additions are
-- additive and verified clean against live data on 2026-09-20:
--   no duplicate profiles per client; no ACTIVE card without client or
--   destination; no cross-client PROFILE destinations; all stored
--   destination URLs http(s); all accent colors hex-or-null; all stored
--   asset paths match the server-generated shape.

-- One primary profile per client (was check-then-insert in app only).
alter table public.profiles
  add constraint profiles_client_id_unique unique (client_id);

-- Accent color: validated hex at the app layer; pinned here too so a direct
-- mutation cannot inject arbitrary CSS into the public page variable.
alter table public.profiles
  add constraint profiles_accent_hex
  check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$');

-- Stored asset references: server-generated shape only (mirrors assetPath +
-- assetPathField in app code). No crafted paths or remote URLs.
alter table public.profiles
  add constraint profiles_avatar_path_safe
  check (
    avatar_path is null
    or avatar_path ~ '^profiles/([0-9a-f-]{1,64}|pending)/(avatar|cover)/[0-9a-f]{16}\.(jpg|png|webp)$'
  );
alter table public.profiles
  add constraint profiles_cover_path_safe
  check (
    cover_path is null
    or cover_path ~ '^profiles/([0-9a-f-]{1,64}|pending)/(avatar|cover)/[0-9a-f]{16}\.(jpg|png|webp)$'
  );

-- Card integrity trigger: ACTIVE requires owner + destination; PROFILE
-- destinations must belong to the assigned client; EXTERNAL_URL values must
-- be http(s) with no control characters (app parser stays authoritative).
create or replace function private.enforce_card_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dest_client uuid;
begin
  if NEW.status = 'ACTIVE' then
    if NEW.client_id is null then
      raise exception 'ACTIVE cards require an assigned client';
    end if;
    if NEW.destination_type is null then
      raise exception 'ACTIVE cards require a destination';
    end if;
  end if;

  if NEW.destination_type = 'PROFILE' then
    if NEW.client_id is null then
      raise exception 'PROFILE destinations require an assigned client';
    end if;
    select p.client_id into dest_client
      from public.profiles p
      where p.id = NEW.destination_profile_id;
    if dest_client is null then
      raise exception 'PROFILE destination does not exist';
    end if;
    if dest_client is distinct from NEW.client_id then
      raise exception 'PROFILE destination belongs to a different client';
    end if;
  end if;

  if NEW.destination_type = 'EXTERNAL_URL' then
    if NEW.destination_url is null
      or NEW.destination_url !~ '^https?://'
      or NEW.destination_url ~ '[[:cntrl:]]' then
      raise exception 'EXTERNAL_URL destination must be an http(s) URL';
    end if;
  end if;

  return NEW;
end;
$$;

-- Trigger firing needs no EXECUTE grant; revoke for least privilege.
revoke all on function private.enforce_card_integrity() from public;

drop trigger if exists trg_cards_integrity on public.cards;
create trigger trg_cards_integrity
  before insert or update on public.cards
  for each row execute function private.enforce_card_integrity();
