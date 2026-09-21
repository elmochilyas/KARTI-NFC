-- Karti stable public identity: per-profile public_code (ADR-046).
--
-- Slugs are renamable, so identity links need an immutable identifier:
-- /u/{public_code}. Stable public identity supports future integrations
-- such as wallet cards. 10-char codes from the same unambiguous alphabet
-- as card short codes (no 0/O/1/I/L).
--
-- Additive only: new nullable column → backfill → default → NOT NULL →
-- UNIQUE + composite index. New inserts always receive a code via the
-- column DEFAULT, so application code never has to supply one.

create or replace function public.generate_profile_public_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..10 loop
    code := code || substr(alphabet, (floor(random() * 32)::int) + 1, 1);
  end loop;
  return code;
end;
$$;

alter table public.profiles
  add column if not exists public_code text;

-- Backfill existing rows with collision-safe retry.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where public_code is null loop
    loop
      begin
        update public.profiles
          set public_code = public.generate_profile_public_code()
          where id = r.id;
        exit;
      exception when unique_violation then
        -- collision: regenerate
      end;
    end loop;
  end loop;
end;
$$;

alter table public.profiles
  alter column public_code set default public.generate_profile_public_code();

alter table public.profiles
  alter column public_code set not null;

alter table public.profiles
  add constraint profiles_public_code_unique unique (public_code);

create index if not exists profiles_public_code_status_idx
  on public.profiles (public_code, status);
