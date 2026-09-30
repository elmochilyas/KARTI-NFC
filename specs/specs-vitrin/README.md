# Karti Vitrine & Orders — Specifications

This folder is the source of truth for implementing the Karti public vitrine, public ordering flow, website-to-dashboard operations, and conversion into the existing Karti Client → Profile → Card system.

## Purpose

The specifications are intentionally split by **major subsystem**, not by tiny implementation detail. The goal is to keep each implementation phase large enough to execute with one focused agent prompt later.

The implementation must preserve the current Karti architecture:

- `Client != Profile != Card != Order`
- Public profiles remain at `/{slug}`.
- Physical NFC cards continue to store only the permanent Karti URL `/t/{short_code}`.
- `/t/{short_code}` continues resolving dynamically to `PROFILE` or `EXTERNAL_URL`.
- Existing client/card orchestration must be reused rather than duplicated.
- Orders are commercial records; they do not automatically become Clients.
- Public visitors do not need an account to order.
- Public order submission must never expose private order/dashboard data.

## Specification map

1. [`01-product-and-business-rules.md`](./01-product-and-business-rules.md)  
   Product catalog, product-to-destination mapping, customer journeys, pricing principles, lifecycle rules, and fixed business invariants.

2. [`02-vitrine-and-public-order-experience.md`](./02-vitrine-and-public-order-experience.md)  
   Marketing route architecture, homepage/product-page conversion model, public order wizard, inquiry flow, responsive UX, localization behavior, and receipt/WhatsApp continuation.

3. [`03-order-domain-database-and-api.md`](./03-order-domain-database-and-api.md)  
   Order-domain data model, enums, tables, relationships, indexes, server mutations, idempotency, pricing snapshots, and state-transition contracts.

4. [`04-dashboard-orders-and-operations.md`](./04-dashboard-orders-and-operations.md)  
   `/dashboard/orders`, order detail, filters, search, operational actions, notes, events, Needs Action logic, and inquiry management.

5. [`05-client-conversion-profile-and-card-provisioning.md`](./05-client-conversion-profile-and-card-provisioning.md)  
   Existing-client matching, atomic conversion, profile mapping, direct-action destinations, multi-card orders, and reuse of the current NFC/card orchestration.

6. [`06-attribution-seo-geo-localization-and-analytics.md`](./06-attribution-seo-geo-localization-and-analytics.md)  
   Acquisition attribution, multilingual routes, SEO/GEO requirements, indexing rules, analytics events, sitemap/canonical/hreflang strategy, and traffic-to-order measurement.

7. [`07-security-validation-edge-cases.md`](./07-security-validation-edge-cases.md)  
   RLS, server-only privileged access, anti-spam, URL/phone/email validation, privacy, concurrency, failure recovery, and required edge-case handling.

8. [`08-testing-and-definition-of-done.md`](./08-testing-and-definition-of-done.md)  
   Unit/integration/E2E coverage, manual QA matrix, acceptance criteria, migration safety, and final Definition of Done.

9. [`tasks.md`](./tasks.md)  
   Coarse implementation phases and progress checklist. This is the file to update as work proceeds.

## Authority order

If implementation details conflict, use this priority:

1. Existing production Karti invariants and database constraints.
2. These specifications.
3. Existing repository conventions.
4. Implementation-agent discretion only where the above do not define behavior.

The implementation agent must never silently invent pricing, payment providers, shipping providers, new profile types, alternative NFC URLs, or a second Client/Card architecture.
