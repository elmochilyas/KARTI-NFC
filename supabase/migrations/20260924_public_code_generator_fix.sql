-- Karti public_code generator fix (ADR-048).
--
-- The 20260923 generator rolled `floor(random() * 32) + 1` against a
-- 31-symbol alphabet (ABCDEFGHJKMNPQRSTUVWXYZ23456789 — no 0/O/1/I/L).
-- Index 32 yields substr(..., 32, 1) = '' on a 31-char string, so ~27%
-- of generated codes came out short (9 chars). Short codes fail the app's
-- 10-char format gate, leaving those profiles unreachable via /u/
-- (fail-closed 404) — including their PWA manifest and icons.
--
-- Fix: roll against the actual alphabet length. Backstop with a format
-- CHECK so no caller path can persist a malformed code again.
-- Additive only: function replace + new CHECK (existing data verified
-- clean before apply).

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
    code := code || substr(alphabet, (floor(random() * length(alphabet))::int) + 1, 1);
  end loop;
  return code;
end;
$$;

alter table public.profiles
  add constraint profiles_public_code_format
  check (public_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$');
