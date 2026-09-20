# Karti — Supabase & MCP Specification

## Role

Supabase provides:

```text
PostgreSQL
Auth
Storage
Row Level Security
```

OpenCode will have Supabase MCP access.

MCP can execute backend work, but the repository must remain the reproducible source of schema history.

## Mandatory MCP workflow

For every DB task:

```text
Read active task
→ inspect current schema/policies/migrations
→ design change
→ create migration
→ apply via MCP
→ verify live schema
→ regenerate TS DB types if used
→ implement app code
→ run tests
→ update TASKS.md
```

If MCP applies a change before a migration exists, create the matching migration immediately.

Never leave an MCP-only change.

## Environment

Prefer separate development/preview/production environments.

Never use production as a scratch DB.

Never seed fake data into production.

Typical env vars:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Rules:

- service role is server-only;
- no secrets in Git;
- validate required env values.

## Auth

MVP:

- admin account(s) only — enforced by the `admin_users` allowlist, not by
  the mere existence of an account (ADR-031);
- public profiles require no authentication;
- `/dashboard/**` is protected;
- every mutation has server-side auth enforcement.

Live finding (2026-09-20): public self-signup is ENABLED with email
confirmation required. Harmless under the allowlist (new accounts are
non-admin by default and see zero rows), but the operator should disable
public signup in the Auth dashboard. No OAuth/magic-link review was
possible via tooling — manual checklist item.

Do not add client/cardholder accounts yet.

## RLS

RLS is enabled on all app tables plus `private.admin_users`
(Phase 12, ADR-031). Live policies (verified 2026-09-20):

```text
clients, profiles, profile_links, cards:
  FOR ALL TO authenticated USING/WITH CHECK (private.is_admin())
private.admin_users:
  enabled, zero policies (default deny; readable only via the helper)
storage.objects (profile-assets):
  public SELECT; INSERT/UPDATE/DELETE TO authenticated + is_admin()
```

Anonymous users get no policies anywhere (default deny — reads return `[]`,
writes 42501, uploads 403; all verified live).

Public profile data is exposed only through the server-only service-role
read path with explicit public-safe projections (ADR-032) — never anon
policies.

Test policies as:

```text
anonymous (REST probes)
authenticated non-admin (differential JWT simulation; end-to-end temp user
  pending operator assistance — see report)
authorized admin (operator JWT simulation + dashboard)
```

Do not consider RLS complete just because policies exist.

## Storage

Recommended bucket:

```text
profile-assets
```

Paths:

```text
profiles/{profileId}/avatar.*
profiles/{profileId}/cover.*
```

Requirements:

- admin-only upload (allowlist-checked policies, verified live);
- safe public-read strategy for published assets;
- max file size (5 MB, app + bucket, verified live);
- safe MIME allowlist (jpeg/png/webp, app + bucket, verified live);
- magic-byte validation (app layer, Phase 12);
- sanitized/generated object names (managed-path gate on deletes);
- no executable content.

SVG stays rejected in MVP (ADR-033). The bucket is public by design for
public-facing media only; DRAFT-asset URL reachability is classified
acceptable (non-sensitive media; never private documents).

## Migrations

Migrations must be:

- deterministic;
- safe on existing data;
- documented by code;
- preferably additive/reversible.

For destructive changes:

- inspect data first;
- provide a data-preserving migration path;
- never drop/reset production casually.

## Service role

Do not use service-role access as a replacement for correct RLS/auth.

Use it only in narrow trusted server contexts when truly necessary and document the reason.

Live posture (ADR-032): service role is used only by `/[slug]`,
`/t/[code]`, `/api/vcard/[slug]` with projected public-safe columns and no
writes. Secret import is guarded by the `server-only` package
(`src/lib/env-server.ts`); `admin-isolation.test.ts` forbids client-bundle
imports. Narrow SECURITY DEFINER RPCs were evaluated and rejected as
unnecessary new surface — differential tests + projections already prove
isolation.

## Seed data

Development/test seeds may include:

- sample client;
- sample active profile;
- sample profile link;
- sample unassigned card;
- sample active external-destination card.

Never rely on seed data as production configuration.

## Production prohibitions

Never use MCP to:

- reset/drop production to fix dev problems;
- disable RLS globally;
- delete all users/data;
- expose private storage accidentally;
- overwrite unknown policies without inspection.
