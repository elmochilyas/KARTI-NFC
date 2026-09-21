# Karti — Security Specification

Implemented controls as of Phase 12 (2026-09-20). Nothing below is
aspirational: every claim is backed by migration, code, test, or live
verification recorded in `specs/TASKS.md` §12.

## Authentication

- Operator sign-in is email + password via Supabase Auth (`/login`).
- Session refresh + verification uses `getClaims()` (signature-verified) in
  `src/proxy.ts`; dashboard layout re-checks server-side.
- Login errors are generic ("Invalid email or password") — no enumeration.
- `next` redirect targets are same-origin-only (`/` but never `//`), aligned
  across login page, login action, and proxy.
- Finding (2026-09-20): public self-signup is ENABLED with email confirmation
  required. Harmless since Phase 12 (see Authorization), but the operator
  should disable it in the Auth dashboard (manual checklist in report).

## Authorization (explicit admin model, ADR-031)

- `private.admin_users(user_id → auth.users)` is the allowlist; RLS-enabled
  with zero policies (default deny, invisible to API roles).
- `private.is_admin()` — `SECURITY DEFINER`, `SET search_path = ''`,
  fully-qualified refs, boolean return, no dynamic SQL, `EXECUTE` granted to
  `authenticated` only (evaluated during RLS checks; unreachable via REST —
  it lives outside PostgREST-exposed schemas).
- All four app tables: `FOR ALL TO authenticated USING/WITH CHECK
  (private.is_admin())`. Anonymous has no policies (default deny).
- Storage writes on `profile-assets` require `is_admin()`; public read kept.
- Layers: proxy gate → layout gate → per-service session check → RLS
  (authoritative). An authenticated non-admin reaches the shell but every
  query denies them — no protected data renders.
- Operator was bootstrapped before tightening (single user, unambiguous);
  rollback statements are commented in the migration.

## RLS (verified live 2026-09-20)

- Anon REST: SELECT on clients/profiles/profile_links/cards → `[]`;
  INSERT → 42501; allowed-MIME PNG upload → 403 RLS.
- Differential JWT simulation: random sub → `is_admin()=false`, 0 rows;
  operator sub → `is_admin()=true`, operator rows visible.

## Service role

- Used only in server routes (`/[slug]`, `/u/[code]`, `/t/[code]`,
  `/api/vcard/[slug]`, `/u/[code]/manifest.webmanifest`, `/u/[code]/icon-*`)
  with explicit public-safe projections; no writes.
- Secret lives in `src/lib/env-server.ts` behind the `server-only` package
  (client import = build error). `src/lib/env.ts` is browser-safe.
- `admin-isolation.test.ts` statically forbids client-component imports of
  privileged modules. No secrets in repo/history/logs (verified).

## Public access (ADR-032)

- Public profile: ACTIVE-only, projected columns pinned by allowlist test
  (no notes, no client_id, no timestamps, no cards). DRAFT/INACTIVE/unknown
  share one generic 404 (identical visible text + metadata; only the
  request-echoed path differs, which the requester already knows).
- Resolver: format-gated codes (card numbers rejected pre-DB), ACTIVE-only,
  per-hit destination revalidation, 307 + `no-store`, canonical APP_URL host
  (no Host-header trust).
- vCard: ACTIVE-only, escaped builder, http(s)-gated URLs, slug-derived
  filename, `text/vcard`, attachment disposition, `no-store`.
- PWA manifest/icons: ACTIVE-only through the same cached code loader
  (DRAFT/INACTIVE/unknown/malformed share one generic 404); manifest body
  key-pinned to public fields (name, short_name, description, start_url,
  display, colors, icon URLs — never client/card/admin data);
  `start_url` regex-pinned to `/u/{CODE}` (never slug, never `/t/`);
  icon bytes gated by magic-byte check + 5 MB cap; both `no-store` so a
  deactivation or avatar change takes effect immediately.
- Render-time href gates: stored links/website/maps revalidated http(s);
  `tel:`/`mailto:`/WhatsApp builders return null on hostile input and the
  tile/row is omitted. Live hostile-fixture render verified: hostile markup
  appears only escaped, `javascript:` links omitted.

## External URLs

- `validateSafeExternalUrl`: real URL parser, http(s) only, 2048-char cap,
  control-char/CRLF rejection, credentialed-URL rejection, normalization.
- DB trigger backstops stored values (`^https?://`, no control chars).
- Open-redirect posture: only admin-configured http(s) targets, 307
  temporary, no query-param redirector.

## Database integrity (ADR-034)

- `UNIQUE(profiles.client_id)` (race-safe one-profile-per-client).
- Trigger `trg_cards_integrity`: ACTIVE requires owner + destination;
  PROFILE destinations must belong to the assigned client; URL class gate.
- CHECKs: destination shape (pre-existing), accent hex, asset-path shape.
- Six live bypass attempts (dup profile, ownerless ACTIVE, mixed
  destination, cross-client, `javascript:` URL, CSS-injection accent) all
  blocked; fixtures removed.

## File uploads

- Allowlist JPEG/PNG/WebP, ≤5 MB, non-empty; magic-byte gate rejects forged
  MIME/HTML/SVG before upload (no new dependency; 12-byte header read).
- SVG/HTML/executables rejected at app layer and bucket layer (live bucket:
  5 MB, jpeg/png/webp only).
- Generated paths only (`profiles/{uuid}/…/{hex}.{ext}`); deletes gated to
  managed paths; replace-then-delete order preserved.
- Bucket `profile-assets` is public by design (ADR-033): only
  public-facing media belongs there. A DRAFT profile's asset URL is
  technically reachable if known — classified acceptable (non-sensitive
  media only; never identity documents/contracts/notes).

## Slugs / short codes

- Slugs: normalized `[a-z0-9-]` (≤120), reserved routes blocked, traversal
  collapses onto reserved names, unique (DB + app retry).
- Short codes: crypto-random, 8-char 32-symbol alphabet, uppercase
  normalized, unique + collision retry; card numbers can never resolve.

## XSS / injection

- No `dangerouslySetInnerHTML`; React escaping verified live (attributes,
  metadata, flight payload all escaped).
- Accent constrained to `#RRGGBB` (Zod + DB CHECK); theme is a fixed enum.
- Search: LIKE wildcards escaped; commas safe via client URL-encoding;
  hostile inputs fail closed (unit-tested).
- No `console.*` in src; public errors generic; admin errors human-readable
  without internals.

## Headers / transport

- `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, minimal `Permissions-Policy` (clipboard, share,
  NFC deliberately unrestricted), production-only HSTS (`VERCEL_ENV`).
- Full nonce-CSP deferred to Phase 14 with rationale (needs browser
  verification; a naive CSP breaks Next.js hydration).
- HTTPS/HSTS production behavior belongs to deployment; localhost untouched.

## CSRF

- Mutations are Server Actions / authenticated POSTs; no state-changing GET
  routes exist. Browser SameSite defaults + server-side session checks
  apply; no custom token scheme (would be weaker than the framework path).

## Caching

- Dashboard is dynamic (no static cache of protected pages). Resolver stays
  307 + `no-store`. Public profiles uncached (correctness first; no new
  caching introduced).

## Dependencies

- `pnpm audit` clean (2026-09-20). Only addition: `server-only@0.0.1`.

## Known remaining risks (see report §30)

- Auth dashboard settings need manual review (signup disable, leaked-password
  protection, redirect allowlist, backups/PITR status).
- Live admin-path upload + operator click-through need operator credentials.
- Non-admin end-to-end REST proof needs a confirmable temp user (rate-limit
  blocked probe creation); policy logic proved differentially.
- CSP, WAF/rate-limiting, and backup verification belong to Phase 13/14.

## Production security gate

Before release verify: dashboard auth; mutation authorization; RLS matrix;
unsafe redirects rejected; uploads restricted; private data absent from
public output; service-role absent from browser bundle; disabled cards stop
resolving. Phase 12 evidence for each lives in `specs/TASKS.md` §12.
