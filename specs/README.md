# Karti Specs Folder

> Start with [`SPEC_INDEX.md`](./SPEC_INDEX.md), then read `AGENTS.md`, `PRD.md`, and `TASKS.md`.

# Karti — AI Agent Context Pack

This directory is the source of truth for AI agents working on Karti.

## Read order

1. `AGENTS.md`
2. `PRD.md`
3. `TASKS.md`
4. `ARCHITECTURE.md`
5. `DATA_MODEL.md`
6. `SUPABASE.md`
7. Task-specific specs:
   - `ROUTES_API.md`
   - `UI_UX.md`
   - `SECURITY.md`
   - `TESTING.md`
   - `CODING_STANDARDS.md`
8. `DECISIONS.md`

## Conflict priority

If instructions conflict, use:

1. Latest explicit user instruction
2. `TASKS.md`
3. `DECISIONS.md`
4. `PRD.md`
5. Other specs
6. Existing implementation

## Critical product invariant

The NFC tag and QR code store a permanent Karti URL:

```text
https://karti.app/t/{shortCode}
```

They do **not** store the final Instagram, Google Review, WhatsApp, website, or public-profile URL directly.

`/t/[code]` resolves the current destination. This allows the dashboard to change what a physical card does without rewriting the NFC tag or reprinting the QR code.

## Stack

```text
Next.js + TypeScript
Tailwind CSS
Supabase PostgreSQL
Supabase Auth
Supabase Storage
Vercel
Web NFC where supported
vCard / VCF
QR generation
```

## Working rule

At the end of every implementation task, the agent must:

- run relevant verification;
- update `TASKS.md`;
- update `DECISIONS.md` if architecture changed;
- report code changes;
- report Supabase changes;
- report what passed and what remains.
