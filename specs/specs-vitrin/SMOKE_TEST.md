# Karti — Release Smoke Test (10–20 minutes)

Use disposable test records only. Never reset the database; never delete
baseline clients/cards; clean up only rows created by this run
(suffix test names with `SMOKE-<date>`, e.g. `Smoke 2026-09-29`).

## 1. Public (5 min)

1. Open `/fr` → pick a product → product page → order CTA → `/fr/order?product=<slug>` loads that product (no re-select).
2. Complete a PROFILE-product order (e.g. Personal Card, qty 1) with a disposable name/phone (`+2126000000xx` range); use `startedAt` honestly (fill the form, don't rush the timer).
3. Success page shows `KARTI-xxxxxx` + product + qty + next step; receipt survives refresh via `?r=&t=`.
4. Complete a DIRECT-product order (e.g. WhatsApp Card) the same way.
5. Submit `/fr/contact` inquiry (GENERAL, disposable data) → success state.

## 2. Operator (8 min)

6. Login → `/dashboard/orders`: New counts include the two smoke orders; search by order number finds each.
7. Open order → Mark contacted → set price/quote → Confirm → Start fulfillment steps.
8. Convert to NEW client (disposable) → profile created/reused per mapping (PROFILE product) or no profile (DIRECT product).
9. Provision card(s) at `NFC_CONFIGURATION` → `order_item_cards` linked; card shows `/t/{short_code}`.
10. Update payment + fulfillment to READY; verify timeline events, no duplicates.

## 3. Card + profile (4 min)

11. `GET /t/{short_code}` → 307 to current PROFILE slug (or EXTERNAL_URL for DIRECT).
12. Change destination (profile slug or review URL) → same `/t/{code}` resolves to the new target (card never rewritten).
13. `GET /api/vcard/{slug}` for ACTIVE profile → vCard download with expected fields, no private data; inactive slug → safe 404.
14. Check `/sitemap.xml` (marketing only) and `/robots.txt` (dashboard/login/t/api disallowed).

## 4. Cleanup (2 min)

15. Cancel/close smoke orders if the flow allows, or leave them clearly labeled `SMOKE-*`; delete only rows created above; verify baseline data intact.
