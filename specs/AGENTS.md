# AGENTS.md — Mandatory Agent Instructions

## Mission

Build Karti as a production-quality but intentionally simple MVP.

Priority order:

1. Correct product behavior
2. Security
3. Excellent mobile UX
4. Maintainable architecture
5. Fast public-profile performance
6. Reliable admin workflow
7. Minimal unnecessary complexity

Do not over-engineer.

## Before coding

Read:

```text
README.md
PRD.md
TASKS.md
ARCHITECTURE.md
DATA_MODEL.md
SUPABASE.md
```

Then read the spec directly related to the active task.

Inspect the repository and existing work before modifying anything.

## Core invariants

### Permanent card URL

Every physical card stores:

```text
https://karti.app/t/{shortCode}
```

Changing its destination must not require rewriting the NFC tag.

### Keep domain entities separate

```text
Client != Profile != Card != Destination
```

A client can exist without a profile.
A card is an independent physical asset.
A card can point to a profile or an external URL.

### Public vs admin

Public profile:
- no login;
- mobile-first;
- very fast;
- minimal JavaScript;
- only public data.

Dashboard:
- authenticated;
- operational;
- usable on mobile and desktop;
- optimized for quick client/card management.

## `TASKS.md` discipline

`TASKS.md` is the implementation tracker.

A task is DONE only when:

- implementation exists;
- acceptance criteria pass;
- relevant tests pass;
- no known regression remains;
- tracker is updated.

Do not mark a whole phase done while child tasks remain open.

## Supabase MCP

The user will connect Supabase MCP to OpenCode.

The agent may use it to manage:

- schema;
- migrations;
- indexes;
- constraints;
- RLS;
- Storage;
- Auth-related setup;
- DB functions where justified.

Rules:

1. Inspect current database state first.
2. Represent durable DB changes in repository migrations.
3. Never leave an MCP-only undocumented schema change.
4. Prefer additive/reversible migrations.
5. Never destroy real data to make development easier.
6. Keep RLS enabled on exposed tables.
7. Never expose the service-role key to the browser.
8. Regenerate DB TypeScript types after schema changes if type generation is used.
9. Update `DECISIONS.md` for important schema/authorization choices.

If MCP is unavailable, create migration files and continue with locally verifiable work.

## Scope control

Prefer small vertical slices.

Good:

```text
Create client
→ validate
→ persist
→ test
→ update tracker
```

Avoid unrelated rewrites.

Do not implement post-MVP features unless the user explicitly moves them into scope.

## Security

All external input is untrusted:

- slugs;
- URLs;
- uploaded files;
- form values;
- IDs;
- card codes.

Never:

- disable RLS as a shortcut;
- trust client-side authorization;
- allow unsafe redirect schemes;
- expose secrets;
- render arbitrary unsanitized HTML.

Read `SECURITY.md` for security-sensitive changes.

## Engineering

Use strict TypeScript.

Prefer:
- schema validation at boundaries;
- server-side authorization;
- domain helpers for business rules;
- accessible semantic UI;
- small feature-focused modules.

Avoid:
- `any` without justification;
- huge components;
- duplicated business logic;
- magic status strings everywhere;
- broad `"use client"` boundaries;
- generic abstractions before they are needed.

## Verification

Before completion, run the relevant subset of:

```text
typecheck
lint
tests
build
manual/automated UI verification
```

Never claim a check passed if it was not run.

Never claim visual verification from source inspection alone.

## Completion report format

Use:

```text
Implemented
- ...

Verified
- ...

Files changed
- ...

Supabase changes
- ...

Tasks updated
- ...

Remaining / blocked
- ...
```

## Git safety

Do not:

- discard user changes;
- force-push;
- rewrite unrelated history;
- delete branches;
- mass-format unrelated files.

Inspect the working tree before broad changes.
