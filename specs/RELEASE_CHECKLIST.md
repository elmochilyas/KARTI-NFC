# Karti — Release Checklist

Use this for MVP and later production releases.

## Product

- [ ] MVP scope matches `PRD.md`.
- [ ] No accidental post-MVP feature creep.
- [ ] Permanent-card URL architecture preserved.

## Database

- [ ] All required migrations committed.
- [ ] Production migrations applied safely.
- [ ] Generated database types current.
- [ ] Constraints/indexes present.

## Auth & RLS

- [ ] Dashboard requires authentication.
- [ ] Anonymous admin-table reads denied.
- [ ] Anonymous mutations denied.
- [ ] Public profile data exposure reviewed.
- [ ] RLS tests verified.

## Profiles

- [ ] PERSON profile works.
- [ ] BUSINESS profile works.
- [ ] Draft/inactive profiles not public.
- [ ] Profile links work.
- [ ] Asset upload works.
- [ ] Save Contact works.

## Cards

- [ ] Unique card number.
- [ ] Random unique short code.
- [ ] Profile destination works.
- [ ] External destination works.
- [ ] Unsafe URL rejected.
- [ ] Disabled/lost/replaced behavior works.
- [ ] Destination can change without tag rewrite.

## QR/NFC

- [ ] QR contains permanent URL.
- [ ] QR scan verified.
- [ ] Web NFC flow verified where possible.
- [ ] Unsupported-device fallback verified.
- [ ] Real hardware NFC test completed before claiming hardware readiness.

## UX

- [ ] Public profile 320px.
- [ ] Public profile 390px.
- [ ] Dashboard 390px.
- [ ] Desktop dashboard.
- [ ] Loading/empty/error states.
- [ ] Accessibility basics.

## Security

- [ ] No service-role key in browser.
- [ ] Upload restrictions.
- [ ] Safe redirects.
- [ ] No internal notes on public routes.
- [ ] No secrets committed.

## Engineering

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Critical E2E scenarios pass.

## Production

- [ ] Vercel environment configured.
- [ ] Supabase production configured.
- [ ] HTTPS/domain verified.
- [ ] `/t/[code]` verified on production.
- [ ] Public profile verified on production.
- [ ] vCard verified on production.
- [ ] Smoke test completed.

## Documentation

- [ ] `TASKS.md` updated.
- [ ] `DECISIONS.md` updated if needed.
- [ ] Any intentional deviation from specs documented.
