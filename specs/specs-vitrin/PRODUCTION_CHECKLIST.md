# Karti Vitrine & Orders — Production Checklist (Phase 6)

No secrets in this file. Copy values from `.env.example` classifications.

## BEFORE DEPLOY

- [ ] Production Supabase project confirmed (not dev/preview); project ref recorded separately.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set (prod project).
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (prod project).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set, server-only, never `NEXT_PUBLIC_`.
- [ ] `RECEIPT_TOKEN_SECRET` set: strong (`openssl rand -hex 32`), stable (rotation invalidates outstanding receipt URLs), min 16 chars; app fails closed without it.
- [ ] `RATE_LIMIT_SECRET` set: strong, stable, independent from receipt secret, min 16 chars; app fails closed without it.
- [ ] `NEXT_PUBLIC_APP_URL` = canonical prod origin (e.g. `https://karti.pro`), no trailing slash; DNS + HTTPS verified.
- [ ] `KARTI_SALES_WHATSAPP` decision: set (digits only) or deliberately unset (CTA hides; ordering unaffected).
- [ ] Analytics decision: no vendor connected (default no-op transport); confirm no PII event work pending.
- [ ] Legal copy reviewed (`/delivery`, `/privacy`, `/terms` baselines describe implemented behavior only).
- [ ] Product imagery decision: CSS mockups stand in; no stock photos claimed as real.
- [ ] Backup/recovery awareness: Supabase PITR / backup plan known; who restores, how.
- [ ] All migrations reviewed in order; `src/types/database.ts` regenerated from prod-candidate schema.

## DATABASE

- [ ] Migrations applied to prod in order (additive only; no reset).
- [ ] RLS enabled on `orders`, `order_items`, `order_item_cards`, `order_events`, `inquiries`, `rate_limits` (+ existing tables); anon holds zero commercial policies.
- [ ] RPC ACL: `create_public_order`, `create_public_inquiry`, `check_rate_limit` = owner + `service_role` only; all `admin_*` = owner + `service_role` + `authenticated` (anon revoked).
- [ ] `admin_users` allowlist contains only real operators (no test admin).
- [ ] Storage policies unchanged (public read `profile-assets`, admin writes).
- [ ] Indexes present (orders status/payment/fulfillment/client/phone/email/created, items, events, cards short_code, profiles slug, rate_limits expiry).
- [ ] Rate-limit cleanup: opportunistic bounded delete inside `check_rate_limit`; no cron required.

## DEPLOY

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes; route output inspected (marketing static, profiles dynamic, `/t` redirect, dashboard dynamic, API, sitemap, robots); no secrets in static output.
- [ ] App deployed (preview first, then prod); migration apply precedes app deploy.

## POST-DEPLOY (smoke — see SMOKE_TEST.md)

- [ ] `/fr`, `/ar` (RTL), `/en` render.
- [ ] One product page + order CTA preserves product.
- [ ] One PROFILE-product order → receipt works; one DIRECT-product order → receipt works.
- [ ] Inquiry submission succeeds.
- [ ] Dashboard login + Orders workspace + filters + detail.
- [ ] Contact → quote → confirm lifecycle.
- [ ] Convert/link client (new + existing, no dupes).
- [ ] Provision card(s); `/t/{short_code}` 307 to PROFILE/EXTERNAL_URL; destination/slug change keeps same code working.
- [ ] `/api/vcard/{slug}` downloads for ACTIVE profile; safe 404 otherwise.
- [ ] `/sitemap.xml`, `/robots.txt` correct; order/success/dashboard/t/API not indexed.

## SECURITY

- [ ] No dev credentials, test admins, verbose PII logs, or sample secrets on prod.
- [ ] Secret rotation procedure understood (receipt + rate-limit rotation invalidates outstanding tokens/buckets — rotate deliberately).
