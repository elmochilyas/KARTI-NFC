# Karti Vitrine & Orders — Implementation Tasks

This file is the progress tracker.

## Rules for this tracker

- Tasks are intentionally **coarse**.
- One phase should generally be implementable with **one focused agent prompt** later.
- Do not split tasks into tiny file-level steps unless implementation reveals a real dependency.
- After each implementation phase, check completed items and append a short verification note.
- A phase is not complete merely because UI exists; its business rules, tests, and security requirements must also pass.
- Do not begin a later phase by bypassing unfinished invariants from an earlier phase.

---

# Phase 1 — Domain Foundation & Database

**Goal:** Establish the entire commercial/order domain without yet building the full public funnel.

- [x] **1.1 Product/catalog foundation**  
  Add canonical ProductType definitions, product family/profile/destination mapping, typed product configuration schemas, pricing-mode contract, normalization utilities, and expanded reserved marketing slugs.

- [x] **1.2 Order database foundation**  
  Add the required enums, `orders`, `order_items`, `order_item_cards`, `order_events`, and `inquiries`; add constraints, indexes, timestamps, order-number generation, RLS, and regenerated Supabase TypeScript types.

- [x] **1.3 Order-domain services**  
  Add server-side pricing contract, lifecycle transition rules, attribution classifier, idempotency support, and typed order/inquiry domain operations with unit/integration tests.

**Phase 1 completion gate:**  
Database migrations apply cleanly, existing Client/Profile/Card/public-profile behavior remains intact, RLS is verified, and domain tests pass.

**Status:** Complete (2026-09-28)

---

# Phase 2 — Public Vitrine Shell & Ordering Experience

**Goal:** Build the public conversion layer and make a real anonymous Order reach the database safely.

- [x] **2.1 Vitrine route/layout foundation**  
  Add localized marketing route structure, navigation/footer conventions, locale handling/RTL readiness, product-page shell, noindex rules for checkout, and reserved-route compatibility with `/{slug}`.

- [x] **2.2 Four-step public Order wizard**  
  Implement product preselection, all eight product configuration experiences, customer details, delivery, review step, responsive/accessibility behavior, client-side validation UX, and product/quantity pricing display.

- [x] **2.3 Secure public submission & receipt**  
  Implement server-authoritative order creation, anti-spam, idempotency, pricing recalculation, attribution preservation, minimal receipt/success flow, WhatsApp continuation, and public inquiry submission.

**Phase 2 completion gate:**  
All eight products can create valid anonymous Orders from mobile/desktop without login; duplicate submission produces one Order; no private order data is publicly queryable.

**Status:** Complete (2026-09-28)

---

# Phase 3 — Orders Dashboard & Operational Workflow

**Goal:** Let Karti operate submitted Orders completely from the dashboard before Client/Card conversion.

- [x] **3.1 Orders workspace**  
  Add dashboard navigation, `/dashboard/orders`, server pagination, search, filters, summary counts, Needs Action derivation, responsive list/table behavior, and Inquiries tab.

- [x] **3.2 Order detail command center**  
  Add customer/product/delivery/payment/attribution/notes/timeline sections, state-aware quick actions, WhatsApp/call/email actions, and linked-resource placeholders.

- [x] **3.3 Lifecycle operations**  
  Implement contact, confirmation, cancellation, quote pricing, payment transitions, fulfillment transitions, concurrency protection, event logging, and Dashboard Home order summaries.

**Phase 3 completion gate:**  
An operator can safely process an Order from NEW through operational fulfillment states with complete event history and no stale-session overwrites.

**Status:** Complete (2026-09-28)

---

# Phase 4 — Client Conversion & Card Provisioning Integration

**Goal:** Connect confirmed Orders to the existing Karti operational domain without creating a parallel system.

- [ ] **4.1 Existing/new Client conversion**  
  Implement candidate matching, explicit existing-Client selection, atomic/idempotent new-Client conversion, conflict handling, and Client relation events.

- [ ] **4.2 Product-to-Profile conversion**  
  Implement PERSON/BUSINESS profile creation/reuse for Personal, Career, Business, and Contact Cards while respecting the existing one-profile-per-client rule and surfacing incompatible-profile conflicts.

- [ ] **4.3 Existing Card orchestration integration**  
  Resolve direct-action destinations, provision physical Cards only at the correct fulfillment stage using the existing Karti orchestration, support multi-quantity `order_item_cards`, and verify all cards continue using `/t/{short_code}`.

**Phase 4 completion gate:**  
A confirmed Order can become an existing/new Client, create/reuse only the required Profile, provision the correct number of Cards through existing logic, and preserve dynamic destination behavior.

**Status:** Not started

---

# Phase 5 — Acquisition, SEO/GEO & Analytics Integration

**Goal:** Make the vitrine discoverable, measurable, multilingual, and connected to real order attribution.

- [ ] **5.1 SEO/GEO technical foundation**  
  Implement canonical/indexing rules, sitemap behavior, localized URLs/hreflang, Organization/Product/Breadcrumb structured-data hooks where valid, crawlable internal navigation, and profile/noindex policy.

- [ ] **5.2 Marketing page information architecture**  
  Implement the homepage/product/solution page structures defined in the vitrine specs with clear factual content areas, product goal selector, tap-demo framework, internal linking, FAQ structures, and conversion CTAs.

- [ ] **5.3 Analytics and source-to-order attribution**  
  Implement centralized analytics events, first/last-touch persistence, source derivation, UTM/referrer handling, privacy-safe event payloads, and dashboard attribution display/verification.

**Phase 5 completion gate:**  
Marketing pages are crawlable and locale-correct, source attribution survives into Orders, and the main traffic → product → order funnel is measurable without sending personal data to analytics.

**Status:** Not started

---

# Phase 6 — Full-System Hardening & Release Gate

**Goal:** Verify the entire feature as one production system.

- [ ] **6.1 Automated test completion**  
  Complete the unit, integration/database, RLS/security, concurrency, and E2E scenarios from `08-testing-and-definition-of-done.md`.

- [ ] **6.2 Manual product/UX QA**  
  Verify every product path, quote flow, repeat customer, multi-card order, cancellation, mobile checkout, French/Arabic behavior, invalid destinations, receipt privacy, dashboard operations, and Client/Profile/Card conversion.

- [ ] **6.3 Production hardening**  
  Resolve accessibility/performance issues, validate no secrets/private data leak, verify additive migrations and existing Karti regressions, run lint/typecheck/tests/build, and document remaining non-blocking limitations.

**Phase 6 completion gate:**  
The complete visitor → Order → dashboard → Client/Profile/Card → `/t/{short_code}` → delivery lifecycle passes the Definition of Done in `08-testing-and-definition-of-done.md`.

**Status:** Not started

---

# Progress Summary

| Phase | Status |
|---|---|
| Phase 1 — Domain Foundation & Database | Complete (2026-09-28) |
| Phase 2 — Public Vitrine & Ordering | Complete (2026-09-28) |
| Phase 3 — Orders Dashboard | Complete (2026-09-28) |
| Phase 4 — Client & Card Integration | Not started |
| Phase 5 — SEO/GEO & Analytics | Not started |
| Phase 6 — Hardening & Release | Not started |

---

# Implementation Notes Log

Add one dated entry after each completed phase.

Example:

```text
## Phase 1 — YYYY-MM-DD

Completed:
- ...

Verified:
- ...

Known limitations:
- ...

Next:
- Phase 2
```

```text
## Phase 1 — 2026-09-28

Completed:
- 1.1 Product/catalog foundation: src/domain/orders/{productTypes,catalog,
  schemas,normalize} with fixed PROFILE/DIRECT mapping, 8 strict Zod configs,
  QUOTE-only catalog, centralized normalization, 19 reserved slugs added.
- 1.2 Order database foundation: migration
  20260929000000_orders_foundation.sql (TEXT+CHECK per ADR-010/ADR-070,
  orders/order_items/order_item_cards/order_events/inquiries,
  order_number_seq, jsonb object checks, non-negative money/item checks,
  priced-totals discipline, indexes, updated_at triggers, admin-only RLS).
  Manual database.ts backport (db:types needs SUPABASE_ACCESS_TOKEN).
- 1.3 Order-domain services: src/domain/orders/{pricing,attribution,
  lifecycle,events,idempotency} — QUOTE pricing, deterministic attribution,
  explicit order/payment/fulfillment maps + sync rules, 16 event types,
  UUID idempotency contract (atomic create deferred to Phase 2).

Verified:
- pnpm typecheck: pass
- pnpm lint: pass
- pnpm test: 73 files / 908 tests pass (incl. 115 new order-domain tests)
- pnpm build: pass
- Existing Client/Profile/Card/NFC suites still green; no UI/route changes.

Live verification (2026-09-28, connected Supabase project):
- Migration applied as version 20260928191647/orders_foundation; all 5
  tables present with 0 rows, RLS enabled, existing data intact
  (clients 2, profiles 2, profile_links 3, cards 1).
- Live CHECK proofs: quantity=0, negative unit_price, array configuration,
  string metadata, PRICED-without-totals, bad status, bogus FK all
  rejected with the expected 23514/23503 errors; duplicate
  idempotency_key rejected with 23505.
- Live behavior: valid QUOTE order got KARTI-000001 with correct
  defaults; item+ORDER_CREATED event created; updated_at trigger fired.
- Order numbers: 5 parallel inserts got 5 distinct numbers
  (KARTI-000005..000009; gaps from rejected inserts are by design).
- Anon REST matrix: SELECT on all 5 tables returns 200 []; INSERT
  orders/inquiries rejected 401; row-addressed UPDATE returns 200 []
  (zero rows). Admin: identical is_admin() predicate as the
  live-verified app tables + service-side CRUD proven by the proofs.
- All verification rows deleted (cascade verified); commercial tables
  back to 0 rows. No production data touched.
- database.ts regenerated from live schema (no manual backport left):
  orders/order_items/order_item_cards/order_events/inquiries present;
  absorbed profile_sections/public_code backports; template now required
  per live schema with a minimal normalizeProfileRow tolerance extension.
- CONTACT_CARD pinned: family DIRECT, requiresProfile true,
  profileType PERSON, destination PROFILE (catalog.test.ts).

Known limitations:
- No Phase 2+ UI (wizard, receipt, dashboard, conversion, SEO).
- Authenticated-admin REST proof via operator JWT not run (no credentials
  in this environment); covered by identical predicate + service-side
  proofs + pre-existing differential JWT evidence for sibling tables.
- format:check has pre-existing repo-wide warnings; Phase 1 files clean.

Next:
- Phase 2 (public vitrine shell, order wizard, atomic createPublicOrder)
```

```text
## Phase 2 — 2026-09-28

Completed:
- 2.1 Routes/shell: static /fr|/ar|/en dirs (dynamic [locale] impossible
  beside /[slug]; ADR-072), per-locale layouts (ar RTL), VitrineShell,
  minimal landing, 8 product pages each, full FR+EN+AR copy via typed
  VitrineDict, noindex on order/success, canonicals elsewhere.
  `/` brand landing unchanged by design.
- 2.2 Wizard: card/details/delivery/review, preselect via ?product= with
  safe selector fallback, quantity >= 1, all 8 configs reusing Phase 1
  schemas, same-WhatsApp toggle, EMAIL-requires-email, quote wording
  ("Send request"), edit-backs, state preserved, no pre-submit writes.
- 2.3 Server: createPublicOrder/createPublicInquiry actions (Zod +
  normalize + server pricing QUOTE + server attribution + honeypot +
  3s timing + per-IP buckets), atomic create_public_order/inquiry RPCs
  (SECURITY DEFINER, no API grants; ADR-071), idempotency inside the
  txn, SHA-256 receipt tokens, minimal success receipt, WhatsApp
  continuation via KARTI_SALES_WHATSAPP (hides when unset), /contact
  inquiry flow (inquiries only).

Verified:
- pnpm typecheck/lint/test/build: all pass (84 files / 962 tests).
- Live dev DB: RPC applied; atomic 1+1+1 create; idempotent re-call
  returns original receipt untouched; QUOTE null totals; attribution
  persisted; anon table/RPC access denied (200 [] / 404); PostgREST
  wire-shape call succeeds; inquiry isolated; all proof rows cleaned
  (commercial tables back to 0; existing data intact).
- Regression: /{slug}, /t/*, /api/vcard/*, dashboard, NFC suites green.

Known limitations:
- Homepage is minimal landing; solution/guide/example/pricing pages
  reserved but unbuilt (Phase 5). EN/AR copy is complete but deserves
  native-speaker review (flagged, non-blocking).
- Rate limiter is per-instance memory (documented); durable limiter is
  the Phase 6 upgrade path. No CAPTCHA by design.
- Authenticated-admin REST proof needs operator credentials (same
  standing note as Phase 1). No E2E framework exists; coverage is
  unit + route/action + live proofs.

Next:
- Phase 3 (Orders dashboard & operational workflow)
```

```text
## Phase 3 — 2026-09-28

Completed:
- 3.1 Workspace: Orders nav (desktop sidebar + mobile bottom bar),
  /dashboard/orders with Orders/Inquiries tabs (?tab=), 7 views
  (All/New/Needs action/In progress/Ready/Completed/Cancelled),
  server pagination (25/page, ?page=), server search (number/name/
  phone/whatsapp/email, LIKE-escaped + or()-safe), product/payment/
  fulfillment/source filters (?product=&payment=&fulfillment=&source=),
  DB-backed summary counts (New/Needs action/In progress/Ready),
  centralized Needs Action derivation (domain/orders/attention.ts,
  TS truth + PostgREST .or() serialization, 132-combo parity test),
  desktop table + mobile cards, URL-driven state throughout.
- 3.2 Detail (/dashboard/orders/[id]): customer (WhatsApp/call/email
  links carry order number; links never mutate), product (human config
  lines, never raw JSON), delivery, payment/quote, fulfillment,
  attribution, internal/customer notes, immutable timeline with human
  labels, related Client/Profiles/Cards ("Not linked yet" in Phase 3),
  state-aware primary actions + cancel dialog with structured reasons.
- 3.3 Lifecycle: 9 atomic admin_* RPCs (migration
  20261003000000: contact/confirm/complete/cancel/quote/payment/
  fulfillment/2×notes; SELECT FOR UPDATE + expected-state or
  updated_at guards → typed CONFLICT; quote formula
  total=subtotal+delivery-discount in minor units, re-quote allowed
  with PRICE_SET per save; fulfillment auto-sync CONFIRMED→
  IN_PROGRESS and DELIVERED→COMPLETED with exactly-once
  ORDER_COMPLETED; notes events carry {updated:true} only).
  Inquiry transitions via guarded single-statement UPDATEs.
  Dashboard Home: New/Needs-action/Ready tiles + top-5 urgent list.

Verified:
- pnpm typecheck/lint/test/build: all pass (95 files / 1029 tests,
  +10 files / +62 tests vs Phase 2).
- Live dev DB: all 9 RPCs SECURITY DEFINER + search_path='' +
  proacl owner+authenticated+service_role (anon execute = false on
  all 9); random-sub call → UNAUTHORIZED; full chain NEW→CONTACTED→
  CONFIRMED→PRICED(11500 exact)→PAID→REFUNDED→…→DELIVERED→COMPLETED
  with 13-event trail, ORDER_COMPLETED exactly once; stale contact
  repeat → CONFLICT with 1 CUSTOMER_CONTACTED; stale updated_at
  quote → CONFLICT (99999 never wrote); invalid payment/fulfillment
  jumps → INVALID_TRANSITION; bad reason/over-discount →
  VALIDATION; cancel metadata exact; terminal re-cancel/fulfillment
  rejected; note content absent from event metadata; direct
  IN_PROGRESS→COMPLETED path proven. All proof rows deleted
  (commercial 0/0/0/0; clients 2, cards 1 intact).
- Regression: vitrine/NFC/dashboard suites green; no public-flow,
  RLS, or Client/Profile/Card changes (additive migration only).

Type freeze verification (2026-09-28, same session):
- `pnpm db:types` CLI genuinely blocked (no SUPABASE_ACCESS_TOKEN in
  env; CLI demands `supabase login` or the token). Used the connected
  Supabase MCP type generator against the same migrated dev project
  instead — full output captured, then applied surgically: the MCP
  output covers the public schema only while the repo file carries
  public+storage, so the file was restored and ONLY the 9 generated
  admin_* Functions blocks were transplanted (git diff: +63/-0).
  Existing function entries proved byte-identical, so no drift.
- All 9 generated signatures verified against the live SQL: uuid→
  string, text→string, bigint→number, timestamptz→string, returns
  Json. No contract mismatch found.
- Phase 3 RPC bypasses removed: service now calls
  supabase.rpc(fn, args) through a typed AdminFunctionName dispatcher
  (compile-enforced names + arg shapes); cancel sends p_note ?? ""
  (SQL treats "" like NULL — same metadata outcome); mapEnvelope's
  unreachable ok-branch + companion cast deleted. Zero `as never` /
  `as any` remain in Phase 3 app code (two test-file casts kept:
  mock wiring + a deliberate-invalid-input negative case).
- Inquiry path verified without redesign: live policy is exactly
  `Admins manage inquiries` for {authenticated} with
  private.is_admin() on USING and WITH CHECK (anon default-deny, so
  anon cannot update); service UPDATE carries id + expected status
  with NOT_FOUND-vs-CONFLICT mapping; action passes expected status
  through; stale-status unit test retained and green.
- Re-run: typecheck 0, lint 0, test 95/1029 pass, build compiled.

Known limitations:
- database.ts Functions for the 9 admin RPCs came via the MCP
  generator transplant (CLI token unavailable); content is genuine
  generator output, verified byte-consistent with existing entries.
- Inquiry status changes are unit-tested (guarded UPDATE) but not
  live-proven (no operator JWT in this environment; RLS path).
- "All" view sorts newest-first; priority surfacing lives in the
  dedicated views + counts (documented interpretation).
- No E2E framework; dashboard coverage is unit + service-fake +
  live proofs per repo TESTING.md convention.

Next:
- Phase 4 (Client conversion & Card provisioning integration)
```

```text
## Phase 2 hardening — 2026-09-28 (idempotency receipt + RPC ACL)

Bug found by lost-response analysis (real bug, now fixed):
- Old design minted a fresh random receipt token per action call while
  the RPC discarded it on idempotency hits → retry-after-commit
  returned a DEAD receipt (hash mismatch). Concurrent same-key losers
  had the same fate, and the SELECT-then-INSERT race could surface
  23505 as UNAVAILABLE instead of the existing receipt.

Fix (simplest secure architecture, no plaintext storage):
- Receipt token = HMAC-SHA256(RECEIPT_TOKEN_SECRET,
  "karti-receipt-v1:<idempotencyKey>") — deterministic per key,
  unforgeable without the server secret; stored as SHA-256 hash only.
  Every retry re-derives the identical working credential.
- RPC rewritten to INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
  (migration 20261001000000): race collapses on the unique index, no
  23505 ever surfaces, stored hash untouched on hits.
- New fail-closed server env RECEIPT_TOKEN_SECRET (min 16 chars).

Security finding fixed (live):
- Supabase default privileges had granted EXECUTE on both RPCs to
  anon/authenticated despite REVOKE FROM PUBLIC — proven live (anon
  created KARTI-000013, cleaned up). Tightened in migration
  20261002000000: ACL is now owner + service_role only. Standing rule
  documented: every future function migration must REVOKE explicitly.

Verified live:
- Lost-response retry (same key, changed payload): (KARTI-000017,
  created=false), original row untouched, counts 1/1/1, derived retry
  token resolves the receipt; wrong token resolves nothing; stored
  value is the hash, never the token.
- Concurrent same-key pair (parallel REST/RPC): both 200, same number
  KARTI-000015 (true+false), counts 1/1/1, no error leak.
- Post-fix ACL: anon full-payload RPC → 401; service wire path → 200.
- All proof rows deleted; commercial tables back to 0, existing data
  intact. pnpm typecheck/lint/test (85 files / 967 tests)/build pass.
```
