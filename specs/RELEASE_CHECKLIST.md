# Karti — Release Checklist

Use this for MVP and later production releases.

Phase 14 status (2026-09-20): `[x]` = verified with evidence this phase;
`[ ]` = open (manual/operator/production-deploy items). Nothing below was
checked without evidence.

## Product

- [ ] MVP scope matches `PRD.md`.
- [ ] No accidental post-MVP feature creep.
- [ ] Permanent-card URL architecture preserved.

## Database

- [x] All required migrations committed. (5 files in `supabase/migrations/`)
- [x] Production migrations applied safely. (live objects match files; no
      re-apply needed; history note in DEPLOYMENT §11)
- [ ] Generated database types current. (needs access token — operator step)
- [x] Constraints/indexes present. (21 CHECK/UNIQUE + 13 indexes re-verified)

## Auth & RLS

- [x] Dashboard requires authentication. (proxy+layout gates, live redirects)
- [x] Anonymous admin-table reads denied. (anon matrix green 2026-09-20)
- [x] Anonymous mutations denied. (42501 / zero-row-filter / 403, live)
- [x] Public profile data exposure reviewed. (projection tests + 404 parity)
- [x] RLS tests verified. (allowlist differential: non-admin 0 rows,
      operator full rows)

## Profiles

- [x] PERSON profile works. (live render + service tests)
- [x] BUSINESS profile works. (live render + service tests)
- [x] Draft/inactive profiles not public. (generic 404, live + route tests)
- [x] Profile links work. (ordered/disabled-link assertions, live)
- [ ] Asset upload works. (unit + bucket layers green; UI click-through
      needs operator session)
- [x] Save Contact works. (live download + headers + structural tests)

## Cards

- [x] Unique card number. (sequence + UNIQUE, live issuance)
- [x] Random unique short code. (crypto + UNIQUE + retry)
- [x] Profile destination works. (live 307)
- [x] External destination works. (live 307, same code)
- [x] Unsafe URL rejected. (validator + trigger + resolver, live)
- [x] Disabled/lost/replaced behavior works. (live disable → 404)
- [x] Destination can change without tag rewrite. (live switch ×2)

## QR/NFC

- [x] QR contains permanent URL. (payload + PNG-bytes tests)
- [ ] QR scan verified. (manual camera)
- [ ] Web NFC flow verified where possible. (mock states green; device manual)
- [ ] Unsupported-device fallback verified. (mock-tested; device manual)
- [ ] Real hardware NFC test completed before claiming hardware readiness.

## UX

- [ ] Public profile 320px.
- [ ] Public profile 390px.
- [ ] Dashboard 390px.
- [ ] Desktop dashboard.
- [ ] Loading/empty/error states.
- [ ] Accessibility basics.

## Security

- [x] No service-role key in browser. (server-only split + isolation test +
      client-chunk scan clean)
- [x] Upload restrictions. (magic bytes + MIME + size + path gate)
- [x] Safe redirects. (validator + trigger + per-hit revalidation)
- [x] No internal notes on public routes. (projection tests + live scans)
- [x] No secrets committed. (history + tree verified)

## Engineering

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Format check passes.
- [x] Tests pass (incl. route/HTTP + security regression).
- [x] Production build passes.
- [x] `pnpm audit` clean (high+).
- [x] Critical E2E scenarios pass. (automated + live dev matrix; hardware
      items tracked separately below)

## CI/CD

- [x] `.github/workflows/ci.yml` green on the release PR.
- [x] Required checks `test` + `build` enforced on `main`.
- [x] Frozen-lockfile install proven.
- [x] No production secrets in CI; live matrix runs dispatch-only.
- [ ] Vercel Git integration: prod on main, previews per PR (Phase 14).
- [ ] Preview envs use development Supabase, never production.

## Supabase production

- [ ] Environment strategy executed (promote current project, §9).
- [ ] Migrations replayed from source in order; drift check clean.
- [ ] Generated types regenerated with a real access token.
- [ ] RLS/policies re-verified on production.
- [ ] Storage policies re-verified on production.

## Auth settings (manual, Supabase dashboard)

- [ ] Public signup disabled.
- [ ] OAuth/magic-link providers reviewed.
- [ ] Leaked-password protection enabled.
- [ ] Production Site URL set.
- [ ] Redirect URLs restricted (no broad wildcards).
- [ ] Production admin created securely; allowlist holds exactly them.

## Environment

- [ ] Per-environment variables set (public vs server-only classified).
- [ ] `NEXT_PUBLIC_APP_URL=https://karti.pro` on production.
- [ ] No preview URL encoded into any physical card/QR.

## Security deployment

- [ ] Security headers live (spot-check response headers).
- [ ] Nonce-CSP tracked for post-launch validation (Phase 14).
- [ ] Backup/PITR status confirmed (no paid changes without approval).
- [ ] Rollback plan understood (app revert + forward-fix migrations).

## Manual hardware checks (all OPEN until performed)

- [ ] QR scan with phone camera (printed + downloaded PNG).
- [ ] Android Web NFC write + physical tap.
- [ ] Destination change without rewrite (tap before + after).
- [ ] iPhone/unsupported NFC fallback (copy + external writer).
- [ ] iOS contact import from vCard.
- [ ] Android contact import from vCard.

## Production

- [ ] Vercel environment configured.
- [ ] Supabase production configured.
- [ ] HTTPS/domain verified.
- [ ] `/t/[code]` verified on production.
- [ ] Public profile verified on production.
- [ ] vCard verified on production.
- [ ] Smoke test completed (login → client → profile → vCard → card →
      resolver → QR → destination switch → NFC UI).

## Documentation

- [ ] `TASKS.md` updated.
- [ ] `DECISIONS.md` updated if needed.
- [ ] Any intentional deviation from specs documented.
