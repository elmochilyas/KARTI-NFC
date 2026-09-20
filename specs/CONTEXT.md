# Karti — Fast Context for AI Agents

## What Karti is

Karti is an NFC business/contact-card management platform.

The admin creates a client/profile, assigns a physical card, and controls where that card sends visitors.

## Most important invariant

```text
NFC / QR
→ https://karti.app/t/{shortCode}
→ Karti resolver
→ current destination
```

The physical card never needs rewriting when the destination changes.

## MVP destination choices

```text
PROFILE
EXTERNAL_URL
```

## Main entities

```text
Client
Profile
ProfileLink
Card
```

Keep them separate.

## Main stack

```text
Next.js
TypeScript
Tailwind
Supabase PostgreSQL/Auth/Storage/RLS
Vercel
Web NFC where supported
vCard
QR
```

## Agent procedure

1. Read `AGENTS.md`.
2. Read `PRD.md`.
3. Find active work in `TASKS.md`.
4. Read task-specific spec.
5. Inspect existing repository.
6. Implement the smallest complete slice.
7. Use Supabase MCP where appropriate.
8. Keep DB changes in migrations.
9. Run tests/checks.
10. Update `TASKS.md`.
11. Update `DECISIONS.md` for architecture changes.
12. Report exactly what changed and what passed.
