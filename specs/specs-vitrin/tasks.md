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

- [ ] **2.1 Vitrine route/layout foundation**  
  Add localized marketing route structure, navigation/footer conventions, locale handling/RTL readiness, product-page shell, noindex rules for checkout, and reserved-route compatibility with `/{slug}`.

- [ ] **2.2 Four-step public Order wizard**  
  Implement product preselection, all eight product configuration experiences, customer details, delivery, review step, responsive/accessibility behavior, client-side validation UX, and product/quantity pricing display.

- [ ] **2.3 Secure public submission & receipt**  
  Implement server-authoritative order creation, anti-spam, idempotency, pricing recalculation, attribution preservation, minimal receipt/success flow, WhatsApp continuation, and public inquiry submission.

**Phase 2 completion gate:**  
All eight products can create valid anonymous Orders from mobile/desktop without login; duplicate submission produces one Order; no private order data is publicly queryable.

**Status:** Not started

---

# Phase 3 — Orders Dashboard & Operational Workflow

**Goal:** Let Karti operate submitted Orders completely from the dashboard before Client/Card conversion.

- [ ] **3.1 Orders workspace**  
  Add dashboard navigation, `/dashboard/orders`, server pagination, search, filters, summary counts, Needs Action derivation, responsive list/table behavior, and Inquiries tab.

- [ ] **3.2 Order detail command center**  
  Add customer/product/delivery/payment/attribution/notes/timeline sections, state-aware quick actions, WhatsApp/call/email actions, and linked-resource placeholders.

- [ ] **3.3 Lifecycle operations**  
  Implement contact, confirmation, cancellation, quote pricing, payment transitions, fulfillment transitions, concurrency protection, event logging, and Dashboard Home order summaries.

**Phase 3 completion gate:**  
An operator can safely process an Order from NEW through operational fulfillment states with complete event history and no stale-session overwrites.

**Status:** Not started

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
| Phase 2 — Public Vitrine & Ordering | Not started |
| Phase 3 — Orders Dashboard | Not started |
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
