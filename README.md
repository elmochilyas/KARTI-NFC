# Karti — NFC digital contact-card platform

Karti is a web platform for creating, managing, and configuring NFC-enabled
digital business cards. Each physical card stores one permanent URL
(`https://karti.pro/t/{shortCode}`); the dashboard changes the destination
behind that URL without rewriting the tag.

> Previous root README contained only the text `# KARTI-NFC` (UTF-16, 28 bytes)
> — no project content was discarded in replacing it.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 (CSS-first config) + hand-rolled Karti UI primitives
- Supabase (PostgreSQL + Auth + Storage + RLS) via `@supabase/ssr`
- Zod validation, Vitest tests, ESLint + Prettier
- pnpm, Vercel deployment

## Prerequisites

- Node.js 20+ (developed with Node 24; see `engines` in `package.json`)
- pnpm 11 (`packageManager` pins `pnpm@11.4.0`)
- A Supabase project (for live auth/data; the UI compiles without it)

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # then fill in Supabase keys
pnpm dev                     # http://localhost:3000
```

## Environment

| Variable                        | Visibility      | Purpose                                                                |
| ------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | public          | Supabase project URL                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public          | anon key (RLS still applies)                                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server-only** | privileged access; never `NEXT_PUBLIC_`, never imported in client code |
| `NEXT_PUBLIC_APP_URL`           | public          | canonical base URL for card/profile/vCard links                        |

Without Supabase keys the app still builds; `/dashboard/**` redirects to
`/login` with a setup notice. Live sign-in requires a provisioned project.

## Commands

```bash
pnpm dev            # local dev server
pnpm build          # production build
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (use lint:fix to autofix)
pnpm format         # prettier write (format:check to verify)
pnpm test           # vitest run (test:watch for watch mode)
pnpm audit          # dependency vulnerability audit
```

CI (`.github/workflows/ci.yml`) runs frozen-install, typecheck, lint,
format-check, tests, build, and audit on every PR and push to `main`.

## Supabase status

- App-side clients: `src/lib/supabase/browser.ts` (browser),
  `src/lib/supabase/server.ts` (user-scoped server),
  `src/lib/supabase/admin.ts` (privileged server-only reads for the
  anonymous public/resolver/vCard paths; guarded by `server-only`).
- Authorization: explicit `private.admin_users` allowlist + RLS
  (`private.is_admin()`); anonymous has no policies (default deny).
- Schema lives in `supabase/migrations/` (applied to the dev project, drift
  verified zero). RLS enabled on all app tables; `profile-assets` bucket
  configured (public read, admin writes, 5 MB raster-only).
- Database types: `src/types/database.ts` is **generated — never hand-edit**.
  Regenerate after every migration with `pnpm db:types` (needs
  `SUPABASE_ACCESS_TOKEN`). On Windows PowerShell, re-save the output as
  UTF-8 if the redirect writes UTF-16.

## Specs (source of truth)

Start at [`specs/SPEC_INDEX.md`](specs/SPEC_INDEX.md), then
[`specs/AGENTS.md`](specs/AGENTS.md).
**[`specs/TASKS.md`](specs/TASKS.md)** is the implementation tracker.
