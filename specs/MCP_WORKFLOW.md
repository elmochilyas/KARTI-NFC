# Karti — Supabase MCP Workflow for OpenCode

The user will connect Supabase MCP to OpenCode.

The agent is expected to use it when it materially speeds up database/Auth/Storage work.

## 1. What the agent may manage

Using Supabase MCP, the agent may inspect or configure:

- PostgreSQL schema;
- tables;
- constraints;
- indexes;
- migrations;
- RLS policies;
- database functions;
- Storage buckets/policies;
- development seed data;
- Auth-related configuration exposed by the connected MCP.

## 2. Golden rule

A change performed through MCP is not complete until the repository contains the durable representation of that change.

For schema changes this normally means:

```text
supabase/migrations/*.sql
```

MCP state alone is not sufficient project documentation.

## 3. Required workflow

For every Supabase-changing task:

```text
1. Read TASKS.md
2. Inspect existing Supabase state
3. Inspect repository migrations
4. Design smallest safe change
5. Create migration
6. Apply/verify using MCP
7. Regenerate DB types if used
8. Implement application code
9. Test RLS + application behavior
10. Update TASKS.md
11. Update DECISIONS.md when architecture changed
```

## 4. Existing-state-first rule

Never blindly create a table/policy because the spec mentions it.

First inspect whether it already exists and whether the implementation is compatible.

Avoid duplicate:

- policies;
- indexes;
- columns;
- buckets;
- functions.

## 5. No destructive shortcuts

Do not solve migration problems by:

- dropping all tables;
- resetting production;
- deleting real users;
- disabling RLS;
- removing policies wholesale;
- truncating user data.

If an incompatible existing schema is found, migrate it safely.

## 6. Development versus production

When MCP points at a production project, be especially conservative.

Do not create fake clients/cards in production unless explicitly asked.

For testing, prefer a development/staging Supabase project.

## 7. Policy verification

After RLS changes, verify behavior as both:

```text
anonymous
authenticated admin
```

The agent must test behavior, not merely report that policy SQL was created.

## 8. Storage verification

After bucket/policy changes verify:

- authorized upload;
- unauthorized upload rejection;
- public asset display if intended;
- rejected invalid upload types in the application.

## 9. Type generation

After a schema change, regenerate database types if the repository uses generated Supabase types.

Do not manually patch generated types to make TypeScript compile.

## 10. Failure handling

If MCP is unavailable:

- continue with migration files and app implementation where possible;
- clearly mark MCP verification as blocked in `TASKS.md`;
- do not claim database state was updated.

## 11. Agent report

For any Supabase task, completion report should contain:

```text
Supabase
- migrations added:
- tables/columns changed:
- RLS policies changed:
- storage changes:
- MCP verification:
- generated types:
```
