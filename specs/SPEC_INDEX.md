# Karti — Specification Index

This directory is the source of truth for Karti product and engineering work.

## Required read order for a new AI agent

1. `AGENTS.md`
2. `PRD.md`
3. `TASKS.md`
4. `DECISIONS.md`
5. `ARCHITECTURE.md`
6. `DOMAIN_RULES.md`
7. `DATA_MODEL.md`
8. `SUPABASE.md`
9. `MCP_WORKFLOW.md`
10. The task-specific specification files

## Product specifications

- `PRD.md` — product requirements and MVP scope
- `DOMAIN_RULES.md` — product invariants and business rules
- `UI_UX.md` — visual and interaction requirements
- `NFC_QR.md` — NFC, QR, permanent-card URL behavior
- `ACCEPTANCE_CRITERIA.md` — end-to-end functional acceptance criteria

## Engineering specifications

- `ARCHITECTURE.md` — application architecture
- `PROJECT_STRUCTURE.md` — recommended repository layout and module ownership
- `DATA_MODEL.md` — database/domain schema
- `ROUTES_API.md` — routes, server actions, APIs and redirect behavior
- `SUPABASE.md` — database/Auth/Storage/RLS rules
- `MCP_WORKFLOW.md` — how OpenCode should use Supabase MCP safely
- `ENVIRONMENT.md` — environment variables and local setup
- `CODING_STANDARDS.md` — TypeScript/Next.js conventions
- `ERROR_HANDLING.md` — domain and UI error conventions

## Quality specifications

- `SECURITY.md` — security requirements
- `TESTING.md` — automated/manual test strategy
- `ACCESSIBILITY.md` — accessibility requirements
- `PERFORMANCE.md` — public-profile and redirect performance requirements
- `OBSERVABILITY.md` — logs, auditability and diagnostics

## Delivery and operations

- `TASKS.md` — implementation tracker
- `DECISIONS.md` — architectural decision records
- `GIT_WORKFLOW.md` — safe repository/change workflow
- `DEPLOYMENT.md` — Vercel + Supabase deployment workflow
- `RELEASE_CHECKLIST.md` — release gates
- `HANDOFF_TEMPLATE.md` — standard AI-agent completion report

## Core invariant

The physical NFC tag and printed QR code point to the permanent Karti URL:

```text
https://karti.app/t/{shortCode}
```

The dashboard changes the destination behind that URL.

Never replace this architecture with direct-to-Instagram/direct-to-profile NFC payloads unless the user explicitly changes the product design.
