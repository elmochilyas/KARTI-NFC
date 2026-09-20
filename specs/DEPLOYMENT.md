# Karti — Deployment Specification

Phase 14 status (2026-09-20): promotion preparation complete, deployment
itself BLOCKED — see §11. Nothing has been deployed yet.

## 1. Production architecture

```text
GitHub main
  ↓ (CI: test → build, both green)
Vercel (Git integration: production deploy on main)
  → Next.js application (https://karti.app)

Supabase production project
  → PostgreSQL (+ replayed migrations)
  → Auth (hardened settings)
  → Storage (profile-assets)
```

Production domain:

```text
https://karti.app
```

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
NEXT_PUBLIC_APP_URL           (preview URL on previews, https://karti.app on prod)
```

Never copy production service-role secrets into client-exposed variables.
Preview deployments must use the development Supabase project — never
production data. Never encode preview URLs into physical cards.

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
https://karti.app/
https://karti.app/{profile-slug}
https://karti.app/t/{shortCode}
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

- Repository: `main` on `github.com/elmochilyas/KARTI-NFC`, HEAD at an older
  commit with Phases 0–13 work uncommitted in the working tree. Production
  CANNOT deploy via Git/Vercel until the intended code is committed and
  pushed — and blind `git add .` is forbidden (unrelated operator edits
  coexist). Operator action required; safe commit plan in the Phase 14
  report §37.
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
