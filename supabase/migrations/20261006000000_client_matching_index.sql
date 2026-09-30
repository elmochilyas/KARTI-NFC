-- Karti Vitrine & Orders — client-matching pagination index (Phase 6 §39).
--
-- Order → existing-client candidate search pages the RLS-visible clients
-- dataset server-side in newest-first 500-row ranges (findClientCandidates).
-- With only the primary key, that is a full seq-scan + sort per range.
-- This single btree on (created_at DESC) makes newest-first pagination
-- index-ordered. No schema/behavior change; additive and safe on populated
-- tables (CREATE INDEX IF NOT EXISTS, no lock beyond a brief share lock).
--
-- Operational threshold (documented, not built): if exact phone/email
-- candidate search ever exceeds ~50k clients or range-paging latency
-- matters, add normalized lookup columns + trigram/prefix indexes then.
-- Do not build that infrastructure now.

create index if not exists clients_created_at_idx
  on public.clients (created_at desc);
