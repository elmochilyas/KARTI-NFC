# Karti — Testing & Verification Specification

## Quality gate

Use the repository's actual scripts, with equivalent checks for:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm audit --audit-level=high
```

CI (`.github/workflows/ci.yml`) runs exactly this gate on every PR and
push to `main` (jobs `test` → `build`; stable names for branch protection).
User-facing work also requires visual/interaction verification.

## Test layers (smallest effective layer wins)

```text
Unit (src/domain, pure helpers)
  → slugs, URLs, short codes, vCard builder, QR/NFC payloads, setup status
Service/domain with fakes (features/*/service, orchestration, resolver)
  → clients/profiles/links/cards CRUD paths, activation gates, cross-client
  guards, storage validation, dashboard overview — no live DB
Route/HTTP (src/app/**/route.test.ts, page.test.ts, vi.mocked admin client)
  → /t/[code] status/Location/no-store, /api/vcard/[slug] headers/body,
  /[slug] metadata + view props + fail-closed paths
Component helpers (brandIcons, contact href builders)
  → tiles, brand detection, hostile-input omission
Security regression (admin isolation, projections, hostile fixtures)
  → runs inside `pnpm test`; never a separate manual-only suite
Live Supabase (scripts/live-anon-matrix.mjs + manual dispatch workflow)
  → anonymous attack matrix against the development project; creates nothing
Manual hardware/browser
  → QR scans, NFC writes/taps, responsive eyeball, contact imports
```

Do not convert everything into browser E2E. Dashboard pages (auth-gated)
are covered by service tests + live redirect checks, not component renders.

## Coverage

`@vitest/coverage-v8` is available (`pnpm vitest run --coverage`).
Snapshot 2026-09-20: ~60% statements overall; domain ~98%, resolver/public
paths ~90%+, services lower (DB-write paths need live auth and are covered
by the live matrix instead). No threshold gate — coverage informs, the suite
protects. Focus areas: cards/orchestration, resolver, URL validation, vCard,
storage validation, admin authorization, setup status, QR/NFC payload.

## High-value unit tests

Prioritize:

```text
slug normalization
reserved slug detection
safe external URL validation
card short-code generation
card destination resolution
vCard generation
status helpers
```

## Integration tests

Cover:

- create/update client;
- create/update profile;
- slug uniqueness;
- profile-link CRUD/reorder;
- assign card;
- profile destination;
- external URL destination;
- disable card;
- redirect resolution.

## Redirect matrix

| Card state | Destination | Expected |
|---|---|---|
| Missing | — | unavailable/not found |
| UNASSIGNED | — | unavailable |
| DISABLED | valid | unavailable |
| LOST | valid | unavailable |
| REPLACED | valid | unavailable |
| ACTIVE | active PROFILE | redirect to profile |
| ACTIVE | missing PROFILE | unavailable |
| ACTIVE | inactive PROFILE | unavailable |
| ACTIVE | valid EXTERNAL_URL | redirect |
| ACTIVE | unsafe URL scheme | unavailable |

## Public profile

Verify:

- active profile renders;
- inactive/draft does not;
- missing optional fields disappear cleanly;
- Save Contact is wired correctly;
- phone/email/WhatsApp links are correct;
- link order/enabled flags are respected;
- private client notes never appear.

## vCard

Test:

- name;
- organization;
- title;
- phone;
- email;
- URL;
- special-character escaping;
- optional missing fields.

## RLS

Verify actual behavior for:

```text
anonymous
authenticated admin
```

Test reads and writes.

Policy definitions alone are not proof.

## UI/responsive

At minimum verify:

```text
320px
390px
768px
1024px
1440px
```

Critical screens:

- public profile;
- login;
- clients;
- client detail;
- profile editor;
- cards;
- card detail/configuration;
- create-client flow.

Check:

- no horizontal overflow;
- readable typography;
- touch targets;
- visible CTAs;
- loading/empty/error states;
- keyboard/focus behavior.

## NFC

Put Web NFC behind a small adapter so logic can be mocked.

Test states:

```text
supported
unsupported
permission denied/error
success
```

Real hardware verification is required before claiming NFC writing is production-ready.

## QR

QR must encode exactly:

```text
https://karti.app/t/{shortCode}
```

Never the current final destination.

## Regression rule

For a bug:

```text
reproduce
→ add regression test when practical
→ fix
→ run test
→ run related suite
```

## Reporting

Agent must report only checks actually run.

Good:

```text
Typecheck: passed
Lint: passed
Tests: 42 passed
Build: passed
Visual verification: Chrome 390/1440
```

Bad:

```text
Everything should work.
```
