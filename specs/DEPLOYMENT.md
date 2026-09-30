# Karti — Deployment Specification

Phase 14 status (2026-09-20): promotion preparation complete, deployment
itself BLOCKED — see §11. Nothing has been deployed yet.

## 1. Production architecture

```text
GitHub main
  ↓ (CI: test → build, both green)
Vercel (Git integration: production deploy on main)
  → Next.js application (https://karti.pro)

Supabase production project
  → PostgreSQL (+ replayed migrations)
  → Auth (hardened settings)
  → Storage (profile-assets)
```

Production domain:

```text
https://karti.pro
```

(Canonical production domain since the karti.pro cutover. The previous
Vercel hostname may stay attached temporarily so existing cards keep
resolving; all NEW cards/QRs use karti.pro.)

or the final domain explicitly chosen by the user.

## 2. Deployment order

For changes requiring database migration:

```text
1. Verify migration on development/staging
2. Apply production-safe database migration
3. Deploy compatible application version
4. Smoke test
```

For breaking schema changes, design an expand/migrate/contract approach rather than creating downtime.

## 3. Vercel variables

Configure the correct environment variables for:

- Preview
- Production

```text
NEXT_PUBLIC_SUPABASE_URL      (per environment)
NEXT_PUBLIC_SUPABASE_ANON_KEY (per environment)
SUPABASE_SERVICE_ROLE_KEY     (server-only, per environment)
NEXT_PUBLIC_APP_URL           (preview URL on previews, https://karti.pro on prod)
NEXT_PUBLIC_GTM_ID            (GTM-PCXTLTM7 on production; empty/missing = GTM disabled)
```

Never copy production service-role secrets into client-exposed variables.
Preview deployments must use the development Supabase project — never
production data. Never encode preview URLs into physical cards.

## 3b. GTM / GA4 setup (manual — application integration only)

`NEXT_PUBLIC_GTM_ID` is public (not a secret). Production value:

```text
NEXT_PUBLIC_GTM_ID=GTM-PCXTLTM7
```

Rules (enforced in code, see ADR-075):

- Consent Mode defaults to denied (`analytics_storage`, `ad_storage`,
  `ad_user_data`, `ad_personalization`); analytics requires visitor
  consent via the first-party banner. Advertising consent stays denied
  (no Google Ads/remarketing through this integration).
- GA4 is configured INSIDE GTM. Never install a direct `gtag.js`
  (`G-XXXXXXXXXX`) script alongside GTM — that would double-count.
- The GA4 base tag must have automatic `page_view` disabled: Karti sends
  one centralized sanitized `page_view` plus explicit funnel events, so
  automatic measurement would produce duplicates.

Still required manually inside Google Tag Manager (container
GTM-PCXTLTM7 is NOT published by this task):

1. Add the Google tag → GA4 (measurement ID configured in GTM only).
2. Map Karti dataLayer events (`product_page_view`, `order_started`,
   `order_submitted`, `contact_inquiry_submitted`, …).
3. Mark `order_submitted` as the GA4 conversion/key event.
4. Verify with Preview / Tag Assistant; then publish the container.

## 4. Supabase production checks

Before launch:

- migrations applied;
- RLS enabled;
- policies verified;
- Auth redirect URLs correct;
- Storage policy correct;
- production admin created securely.

## 5. Domain

Verify:

```text
https://karti.pro/
https://karti.pro/{profile-slug}
https://karti.pro/t/{shortCode}
```

NFC and QR payloads should always use HTTPS production URLs for delivered cards.

## 6. Preview deployments

Vercel preview URLs may be used for development verification.

Do not encode preview URLs into production physical cards.

## 7. Smoke test

After production deployment:

```text
login
create/update test client
active profile opens
vCard downloads
card resolver redirects
destination changes remotely
disabled card stops redirect
QR resolves
```

If appropriate, clean up explicit test records afterward.

## 8. Rollback

Application: revert the Vercel deployment (instant, safe).

Database: prefer a forward corrective migration. Never casually reverse a
migration that touched data; all Karti migrations to date are additive
(tables, constraints, indexes, policies, trigger) and backward compatible
with the prior app version, so app-first rollback stays safe.

## 9. Supabase environment strategy (decision)

Only one Supabase project exists today (development). Decision: PROMOTE the
current project to production in Phase 14 after the production checklist
(backups/PITR confirmed, Auth settings hardened, RLS/policies re-verified,
migrations replayed from source, smoke test green), then provision a fresh
development project. Until then, no preview deployment may point at
production data, and no fake fixtures may land in production.

## 10. Phase 14 entry checklist

- [x] CI green on main (workflow exists; local gate suite green — CI itself
      runs on first PR/push after code is committed)
- [x] Production Supabase decision executed (see §9 — current project IS
      production as of Phase 14; verified clean, drift zero)
- [ ] `pnpm db:types` regenerated with a real access token
- [ ] Vercel project connected with per-environment variables (§3)
- [ ] Production domain + HTTPS verified
- [ ] Smoke test passed (see §7)
- [ ] Manual hardware checks scheduled (see release checklist)

## 11. Phase 14 deployment status (actual)

- Repository: `main` on `github.com/elmochilyas/KARTI-NFC` at `881335f`
  (PR #1 merged 2026-09-20: release branch `release/production-mvp`,
  commit `2a98d49`, 59 reviewed paths). Working tree clean.
- CI: green on PR and post-merge main (`test` + `build`). Branch
  protection active on main (PR + checks required, no force-push/deletion).
- Vercel project, env vars, custom domain, Auth hardening: NOT configured —
  operator items with exact steps in the cutover report.
- Supabase: current project promoted to production in-record. Baseline
  1/1/1/0 + 1 user + 1 admin + 2 objects; zero fixtures; allowlist holds
  the operator; anon matrix green (non-mutating re-verified 2026-09-20).
- Migration history note: tracker holds the 2 Phase-12 entries; the 3
  Phase-2 migrations predate tracker recording but their objects verify
  present live (drift zero). Do NOT re-apply or backfill.
- Auth/project settings (signup, providers, leaked-password, Site URL,
  redirects, backups/PITR, domain): UNCHANGED by tooling — manual
  instructions in report §6/§8; all checklist items OPEN.
- Vercel project, branch protection, custom domain: not configured —
  operator items with exact steps in report.
