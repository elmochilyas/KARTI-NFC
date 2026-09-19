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

- admin account(s) only;
- public profiles require no authentication;
- `/dashboard/**` is protected;
- every mutation has server-side auth enforcement.

Do not add client/cardholder accounts yet.

## RLS

Enable RLS on exposed app tables:

```text
clients
profiles
profile_links
cards
admin_profiles (if used)
```

Anonymous users must never gain unrestricted reads to:

- client notes;
- client admin records;
- card inventory;
- draft/inactive profiles;
- admin data.

Public profile data should be exposed only through a deliberately safe read path (server query, safe view, or narrowly scoped policy).

Test policies as both:

```text
anonymous
authenticated admin
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

- admin-only upload;
- safe public-read strategy for published assets;
- max file size;
- safe MIME allowlist;
- sanitized/generated object names;
- no executable content.

Prefer disallowing SVG in MVP unless explicitly needed.

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
