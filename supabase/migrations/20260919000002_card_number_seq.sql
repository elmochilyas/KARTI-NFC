-- Karti card number generation — Phase 7 (specs/PRD.md §13).
--
-- card_number is the human/operator identifier (KARTI-000001, ...).
-- Generated database-side from a sequence so concurrent card creation can
-- never produce duplicates (no count-rows-plus-one). Sequence gaps from
-- rolled-back inserts are acceptable — numbers need not be gapless.
-- cards_card_number_unique remains the final protection.
-- See specs/DECISIONS.md ADR-021.

create sequence public.card_number_seq as integer start with 1 increment by 1;

alter table public.cards
  alter column card_number set default (
    'KARTI-' || lpad(nextval('public.card_number_seq')::text, 6, '0')
  );
