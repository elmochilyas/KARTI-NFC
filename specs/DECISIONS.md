# Karti — Architectural Decision Log

Future agents should add important choices here using:

```md
## ADR-XXX — Title
**Status:** Accepted / Proposed / Superseded
**Date:** YYYY-MM-DD

### Context
...

### Decision
...

### Consequences
...
```

---

## ADR-001 — Next.js modular monolith

**Status:** Accepted

### Context

Karti needs public pages, dashboard pages, redirects, server logic and Vercel hosting.

### Decision

Use Next.js + TypeScript as one modular web application.

### Consequences

No separate backend service for MVP.

---

## ADR-002 — Supabase backend

**Status:** Accepted

### Context

Karti data is relational and needs auth, storage and authorization.

### Decision

Use Supabase PostgreSQL + Auth + Storage + RLS.

### Consequences

OpenCode can use Supabase MCP, but DB changes must remain reproducible through migrations.

---

## ADR-003 — Permanent card redirect URL

**Status:** Accepted

### Decision

Every physical card/QR contains:

```text
https://karti.app/t/{shortCode}
```

The database controls the current destination.

### Consequences

Destination changes require no NFC rewrite or QR reprint.

---

## ADR-004 — Two MVP destination types

**Status:** Accepted

### Decision

Use:

```text
PROFILE
EXTERNAL_URL
```

Google Reviews, Instagram, WhatsApp, websites and booking links use `EXTERNAL_URL`.

### Consequences

The schema remains simple until service-specific behavior is genuinely needed.

---

## ADR-005 — Admin-only accounts in MVP

**Status:** Accepted

### Decision

Only Karti operators/admins authenticate.

Cardholders and public visitors do not have accounts yet.

### Consequences

Customer self-service is post-MVP.

---

## ADR-006 — Controlled profile customization

**Status:** Accepted

### Decision

Allow limited branding, not a drag-and-drop page builder.

### Consequences

Better consistency, performance and faster MVP delivery.

---

## ADR-007 — Foundation tooling

**Status:** Accepted
**Date:** 2026-09-19

### Context

Greenfield foundation needed one package manager, web stack, validation,
and test setup compatible with Next.js 16, Node 24, and Vercel.

### Decision

- `pnpm` (single app, no `pnpm-workspace.yaml` beyond the `approve-builds`
  record pnpm itself manages).
- Next.js 16 App Router + React 19 + TypeScript `strict`, `@/*` path alias.
- Tailwind CSS v4 CSS-first (`@theme` tokens in `globals.css`); hand-rolled
  UI primitives, no component library.
- Zod for boundary validation; Vitest for unit tests.
- Supabase via `@supabase/ssr` (browser + user-scoped server clients).

### Consequences

Vercel-compatible build; server-first rendering; no heavy UI dependency to
carry into public-profile performance budgets.

---

## ADR-008 — Email + password admin auth

**Status:** Accepted
**Date:** 2026-09-19

### Context

MVP has a single Karti operator; no cardholder accounts (ADR-005).

### Decision

Admin signs in with email + password via Supabase Auth. Session refresh in
`src/proxy.ts` (Next 16 proxy convention) using `getClaims()`; dashboard
layout re-verifies the session server-side. No privileged service-role
client — nothing in Phase 1 needs it.

### Consequences

Simplest credential story for one operator; magic-link/OAuth can be added
later without changing route protection. Live sign-in unverified until a
Supabase project is provisioned.

---

## ADR-009 — Profiles managed client-centrically (no separate nav)

**Status:** Accepted
**Date:** 2026-09-19

### Context

Dashboard IA lists Profiles as an optional separate nav item.

### Decision

MVP dashboard nav is Dashboard / Clients / Cards / Settings. Profiles are
created and edited from the client workspace, not from a top-level section.

### Consequences

Less navigation chrome; profile work stays in client context. Revisit if
operator workflow shows profiles need independent listing.

---

## ADR-010 — Status/type values as TEXT + CHECK

**Status:** Accepted
**Date:** 2026-09-19

### Context

Profile types, profile statuses, card statuses, destination types, and theme
need DB-level integrity. Options were native ENUMs or TEXT + CHECK.

### Decision

TEXT columns with CHECK constraints (`profiles_profile_type_check`,
`profiles_status_check`, `cards_status_check`,
`cards_destination_consistent`, etc.). Canonical values mirrored in
`src/domain/` TypeScript.

### Consequences

Adding a value later is a small CHECK migration instead of an ENUM
alter/rebuild. Slightly weaker typing than ENUMs; enforced again at app
boundaries with Zod in later phases.

---

## ADR-011 — Single-admin RLS model, no anonymous policies

**Status:** Accepted
**Date:** 2026-09-19

### Context

MVP provisions only Karti operator accounts; cardholders and visitors have
none (ADR-005). Public profiles don't exist yet (Phase 5).

### Decision

One `FOR ALL TO authenticated` policy per app table (`USING true WITH CHECK
true`); zero anonymous policies (default deny). No `admin_profiles`
allowlist table — unjustified complexity for a single-operator MVP.
Delete behavior is deliberate: links cascade with profiles; client delete is
RESTRICTed by profiles, SET NULLs card assignments (cards survive);
referenced-profile delete is RESTRICTed so cards never dangle.

### Consequences

Any authenticated Supabase user is effectively an admin — acceptable only
because account provisioning is operator-controlled. Must revisit with an
allowlist/roles before any non-admin account type exists. Public reads arrive
via server-side application code in Phase 5, not anon policies.

---

## ADR-012 — Public asset bucket with guarded writes

**Status:** Accepted
**Date:** 2026-09-19

### Context

Profile avatars/covers must render on future public pages without
signed-URL plumbing, while uploads stay admin-only and safe.

### Decision

Public `profile-assets` bucket; public SELECT, authenticated-only
INSERT/UPDATE/DELETE on `storage.objects`. Bucket limits: 5 MB,
`image/jpeg|png|webp` only (no SVG). Paths `profiles/{profileId}/…` with
generated filenames enforced in app code (Phase 4).

### Consequences

Simplest read path for public pages. Abuse surface limited to admin
credentials; MIME/size enforced at bucket level plus app-level revalidation
later.

---

## ADR-013 — Generated DB types workflow

**Status:** Accepted
**Date:** 2026-09-19

### Context

App code needs schema-accurate types without hand-maintained drift.

### Decision

`src/types/database.ts` is generated output only (`pnpm db:types` runs
`supabase gen types … --schema public,storage`), Prettier-excluded, never
hand-edited. Regenerate after every migration; browser/server clients are
typed `createClient<Database>()`.

### Consequences

Type drift becomes a loud compile error instead of silent runtime mismatch.

---

## ADR-014 — One primary profile per client, enforced in the app

**Status:** Accepted
**Date:** 2026-09-19

### Context

The schema permits multiple profiles per client, but MVP workflow assumes one
primary profile (client detail shows a single profile workspace).

### Decision

Enforce at the application level: `createProfile` returns CONFLICT when the
client already has one. No unique DB constraint on `profiles.client_id`, so
future multi-profile needs (teams, locales) require no migration.

### Consequences

Race between check and insert is closed by slug uniqueness + operator-scale
traffic; acceptable for single-admin MVP.

---

## ADR-015 — Client-centric profile routes, no Profiles nav

**Status:** Accepted
**Date:** 2026-09-19

### Context

ADR-009 left Profiles client-centric. Phase 4 needed concrete routes.

### Decision

`/dashboard/clients/[id]/profile/new` (create) and
`/dashboard/clients/[id]/profile` (edit). Every mutation re-verifies that the
profile row belongs to the route's client (URL is never trusted). New
profiles get a predetermined UUID so asset paths match the final row from
the first upload.

### Consequences

No top-level Profiles section; deep-linking a profile always carries its
client context. A standalone `/dashboard/profiles/[id]` can be added later
without changing the service layer.

---

## ADR-016 — Link ordering via sort_order + move controls

**Status:** Accepted
**Date:** 2026-09-19

### Context

Links need admin-controlled order reflected on the public page.

### Decision

Integer `sort_order` rewritten on reorder (exact-set validation: the submitted
id list must equal the profile's link set). UI uses accessible move up/down
buttons — no drag-and-drop dependency.

### Consequences

No new dependencies; ordering is deterministic (`sort_order`, `created_at`
tiebreak). DnD can replace the controls later without schema changes.

---

## ADR-017 — Restrained accent usage with derived contrast

**Status:** Accepted
**Date:** 2026-09-19

### Context

Free accent colors can destroy readability if applied broadly.

### Decision

Accent is validated hex-only and applied to at most two surfaces: the Save
Contact button background and a CSS variable. Button foreground is derived
by luminance (dark text on light accents, white otherwise). Body text never
uses the accent.

### Consequences

Admins cannot make primary content unreadable; premium consistency holds
across profiles regardless of taste.

---

## ADR-018 — Public reads via privileged server query, RLS untouched

**Status:** Accepted
**Date:** 2026-09-19

### Context

Anonymous visitors must read ACTIVE profiles, but Phase 2 RLS grants anon
nothing — by design. Options were narrow anon SELECT policies, a safe view,
or a trusted server query.

### Decision

Server-only service-role client (`src/lib/supabase/admin.ts`, throws on
browser import) used exclusively by `getPublicProfileBySlug`, projecting an
explicit public-safe column list (profiles + enabled links only — never
clients, notes, cards, or timestamps). No anon policies, no RLS changes, no
service-role writes. The proxy additionally skips all Supabase work for
non-dashboard/non-login paths so public hits cost no auth round-trip.

### Consequences

RLS posture unchanged; public data boundary enforced in one auditable place.
Service-role key must stay server-only (guarded at import + read time).
Future high-traffic caching must preserve the ACTIVE-only rule.

---

## ADR-019 — Public profiles are noindex in MVP

**Status:** Accepted
**Date:** 2026-09-19

### Context

Contact profiles carry personal data (phone, email); MVP has no per-profile
visibility controls beyond ACTIVE status.

### Decision

All public pages send `noindex, nofollow` (ACTIVE profiles get clean
title/description/OG metadata regardless). Revisit when per-profile SEO
controls or business-discovery needs arrive.

### Consequences

No accidental search indexing of personal contact data or DRAFT/INACTIVE
slugs; businesses lose discovery until the decision is revisited.

---

## ADR-020 — vCard 3.0 without photo embedding

**Status:** Accepted
**Date:** 2026-09-19

### Context

Save Contact needs a contact file that imports reliably on iOS and Android.
Options were vCard 3.0 vs 4.0, a library vs a small domain module, and
whether to embed the avatar.

### Decision

Hand-rolled vCard 3.0 builder (`src/domain/vcard.ts`, no dependency):
broadest Contacts compatibility; careful RFC-style escaping instead of
library weight. No `PHOTO` embedding (size + compatibility risk). WhatsApp
acts as TEL fallback only when no phone exists and it normalizes to digits.
No caching (`no-store`) so saves always reflect current data.

### Consequences

Minimal attack surface (pure function, http(s)-guarded URLs, slug-safe
filenames). Photo-in-contact and 4.0 features remain possible later without
breaking existing downloads.

---

## ADR-021 — Database-sequence card numbers

**Status:** Accepted
**Date:** 2026-09-19

### Context

`card_number` (KARTI-000001, …) must be human-friendly and unique under
concurrent creation; count-rows-plus-one races.

### Decision

Postgres sequence `card_number_seq` + column DEFAULT
(`'KARTI-' || lpad(nextval(…)::text, 6, '0')`), migration
`20260919000002`. Application never supplies the number; UNIQUE stays final
guard. Gaps from rolled-back inserts are acceptable.

### Consequences

Creation is one insert with no coordination; numbers are non-sequential only
in the gap sense, never duplicated.

---

## ADR-022 — Assignment clears destination; activation gates ACTIVE

**Status:** Accepted
**Date:** 2026-09-19

### Context

Reassigning a card while keeping its old destination would silently point a
new owner's physical card at the previous owner's target. ACTIVE cards must
never be unresolvable.

### Decision

Assigning (or unassigning) always clears destination fields; UNASSIGNED →
ASSIGNED automatically, other statuses preserved; ACTIVE/LOST/REPLACED must
change status before reassignment, ACTIVE must deactivate before unassign.
`setCardStatus(ACTIVE)` requires owner + configured destination + resolvable
target (same-client ACTIVE profile, or revalidated external URL) via pure
`checkActivationReadiness`. PROFILE destinations require prior assignment
(explicit workflow, no auto-assign).

### Consequences

No incoherent card states reachable from the dashboard; the Phase 8 resolver
can trust ACTIVE cards to resolve. Slightly more admin taps on owner change —
correct tradeoff for physical-asset safety.

---

## ADR-023 — Client-centric NFC setup with automatic orchestration

**Status:** Accepted
**Date:** 2026-09-19

### Context

The Phase 7 manual flow (create → assign → destination → activate across the
Cards section) was too operational for everyday onboarding. The product needs
client → profile → Configure NFC Card → tap blank tag.

### Decision

Normal workflow is client-centric: `configureCardForClient`
(`src/features/cards/orchestrate.ts`) composes the unchanged Phase 7
primitives (create → assign → destination → ACTIVE) behind one operator
action at `dashboard/clients/[id]/nfc`. Primary-card rule: ACTIVE first,
else newest usable (excluding LOST/REPLACED), else newest overall.
Auto-create is the default (no inventory picker in the normal flow);
destination presets are UI-only and persist as PROFILE/EXTERNAL_URL;
activation stays automatic-but-gated (missing/inactive profile and unsafe
URLs reject cleanly without creating cards). The Cards dashboard remains for
inventory, support, replacement, and diagnostics.

### Consequences

Fewer operator steps; simpler onboarding; backend flexibility preserved
(multi-card, replacement flows untouched); permanent short-code architecture
preserved (identity never changes on reconfigure); Phase 7 tests keep passing
without modification.

---

## ADR-025 — Feature-detected Web NFC, no tag locking, no durable write flag

**Status:** Accepted
**Date:** 2026-09-19

### Context

Physical writing must work where browsers allow it and degrade cleanly
elsewhere, without native apps, heavy libraries, or irreversible tag
operations.

### Decision

- Isolated `NfcWriter` adapter (`src/features/nfc/writer.ts`): capability
  detection (`NDEFReader` presence), standard NDEF URL records with the
  canonical permanent URL, mapped result types (UNSUPPORTED /
  PERMISSION_DENIED / CANCELLED / WRITE_FAILED) with friendly UI copy.
- Tags are never locked; no UID/serial stored; no `nfc_written` DB column —
  success state is local-only (a tag may later be erased or replaced).
- Same `WriteToNfc` component on client NFC section, configure-success
  state, and advanced card detail (Rewrite NFC Tag).

### Consequences

No native dependencies; unsupported browsers get a first-class copy/QR
fallback; destination switches never need rewrites by construction. Real
hardware write + tap verification remains a human check before calling NFC
production-ready.

---

## ADR-024 — Temporary redirects with no-store for /t/[code]

**Status:** Accepted
**Date:** 2026-09-19

### Context

The resolver's whole purpose is remote destination changes. A cached
permanent redirect (301/308) in browsers or CDNs would freeze the old target
and silently break the product's central feature.

### Decision

`GET /t/[code]` responds 307 Temporary Redirect with `Cache-Control:
no-store`, backed by `resolveCardDestination` (minimal projected queries, no
auth, per-hit external-URL revalidation). All failures share one generic
unavailable page — statuses and existence never leak.

### Consequences

Every tap pays two small queries (correctness over latency, fine at MVP
scale); destination edits take effect immediately; no tap analytics or edge
caching yet (future work must preserve the ACTIVE-only rule).

---

## ADR-026 — CSS-only sticky Save CTA on the public profile

**Status:** Superseded by ADR-027 (2026-09-19 — operator restored the
classic look; the sticky bar was removed)
**Date:** 2026-09-19

### Context

Long profiles bury the Save Contact CTA below the fold. Options were a
JS-driven sticky bar (IntersectionObserver/scroll listener, new client
component) or a pure-CSS `position: sticky` duplicate anchor.

### Decision

Duplicate the existing `/api/vcard/{slug}` anchor in a `position: sticky`
bottom bar with safe-area padding and a sheet-color fade. No JavaScript, no
new client boundary, same href as the in-flow CTA (verified equal by markup).

### Consequences

Primary action stays reachable with zero JS cost and no hydration risk;
screen readers encounter the same labeled link twice (acceptable duplicate).
A future dismissible/smart-hide bar would need JS and a new decision.

---

## ADR-027 — Edge-to-edge public sections, no floating cards

**Status:** Accepted
**Date:** 2026-09-19

### Context

Inset cards left pale side gutters beside every tile, CTA, and group —
reported as visible "white edges". Options were tighter gutters or true
full-bleed sections.

### Decision

Public sections reach the screen edges: quick tiles are a full-bleed
`divide-x` strip, Save Contact a full-width band, information/about/links/
share full-bleed `border-y` groups with hairline dividers. Only text keeps
side insets. The dashboard preview deliberately keeps its padded card
frame (it is an editing aid inside a phone mock, not a viewport).

### Consequences

Zero side gutters on any viewport; hierarchy now comes from bands,
hairlines, and type instead of floating cards. Also matches the standing
"avoid card-heavy layout" rule.

---

## ADR-027 - Restore classic floating-card public look

**Status:** Accepted
**Date:** 2026-09-19

### Context

Phases 10.8 (premium polish + sticky bar) and the follow-up full-bleed
band experiment (square CTA band, border-y groups, solid sticky bar)
moved away from the classic look the operator prefers, confirmed by a
reference screenshot of test-client (flat navy hero, white 20px tiles,
solid navy Save button, 20px Contact card).

### Decision

Restore the classic floating-card composition and pixel-match the
screenshot (hero spacing pt-20/pb-22 with ~40px tile overlap, 104px
tiles, solid-accent CTA, 20px cards/titles, 44px row icons). Remove the
sticky bar, entrance motion, and the 10.8 global tokens. ADR-026 is
superseded.

### Consequences

Public page matches the approved reference; future polish proposals
should be validated against that screenshot before merging.

---

## ADR-028 — Admin design system + client-centric workspace

**Status:** Accepted
**Date:** 2026-09-19

### Context

The dashboard grew phase-by-phase into inconsistent containers, raw
status caps, triple-duplicated NFC/QR blocks, two competing client
creation paths, and a 770-line single-page profile editor. The operator
asked for a full admin refactor: clean, easy, everything in its place.

### Decision

- Shared kit: `PageHeader`, `Section`, `StatusBadge`, `BackLink`;
  standard widths (forms `max-w-2xl`, profile wizard `max-w-3xl`,
  lists/home `max-w-5xl`).
- `lucide-react` for admin icons (matches the public Lucide set);
  hand-rolled unicode glyphs removed.
- Creation: single New Client page as primary, Quick Add kept as a
  demoted secondary shortcut on the list page.
- Profile editing: 5-step wizard (Identity → Contact → Links →
  Appearance → Review) with clickable progress and Back/Continue/Save
  footer; one live phone preview; no service changes.
- Physical card: one `PhysicalCardPanel` (URL + Copy/Test + QR + NFC)
  reused in client NFC section, configure-success, and card detail.
- Client detail is the workspace: Contact → Profile → NFC → All cards
  (advanced) → Notes, with contextual primary action. Cards section
  stays advanced inventory (ADR-023 unchanged).

### Consequences

One visual language across the dashboard; no new data model or route
changes; public profile, resolver, vCard, QR payload, and RLS untouched.
A global toast system and direct-link counts remain open (Phase 11).

---

## ADR-029 — Bolder public-profile redesign

**Status:** Accepted
**Date:** 2026-09-19

### Context

The operator asked for improved public-profile UI and explicitly chose
a bolder redesign over refining the classic look (ADR-027).

### Decision

Cinematic hero, sublabel quick tiles, gradient Save CTA with a CSS-only
sticky duplicate (same vCard href, zero JS — revisits ADR-026's removal),
eyebrow info rows, editorial About, Connect links with hostname subtext,
neutral Share card, accent-wash backdrop, one reduced-motion-aware
entrance animation. No backend, routing, resolver, vCard, or data-rule
changes; Share island stays the only client JS.

### Consequences

Classic-look pixel matching (ADR-027) no longer constrains the public
page; future public polish builds on this composition instead.

---

## ADR-030 — Dashboard setup semantics (pure derivation, no status changes)

**Status:** Accepted
**Date:** 2026-09-19

### Context

The dashboard must summarize each client in one human phrase (Ready, NFC
not configured, …) without touching domain statuses or adding new ones.
Two questions needed pinning: what counts as a "configured card", and how
severe a missing NFC card is for a client whose profile is already live.

### Decision

- One pure helper, `deriveClientSetupStatus` (`src/features/dashboard/
  setupStatus.ts`), maps profile status + primary-card status (the existing
  `pickPrimaryCard` rule, ADR-023) to a single setup summary. Database
  statuses are never altered for dashboard labels.
- "Configured" means the primary card is ACTIVE. LOST/REPLACED history
  never counts as an active setup.
- `ACTIVE profile + no card` is an *opportunity* ("Needs setup"), not an
  error: the client already works on their public profile link.
- Dashboard counts and attention lists derive from 3 small batched queries
  (clients + profile statuses + card rows) — no N+1, no service-role, RLS
  posture unchanged (ADR-011).

### Consequences

Operator-facing copy stays consistent (one badge/label vocabulary shared by
home, client list, and detail progress). Future analytics must not
re-interpret these labels as new domain states.

---

## ADR-031 — Explicit admin allowlist (replaces authenticated = admin)

**Status:** Accepted
**Date:** 2026-09-20

### Context

RLS granted every authenticated JWT full CRUD (`USING true`), and live
probing showed public self-signup ENABLED — anyone who confirmed an email
became a full admin over real customer data.

### Decision

- `private.admin_users(user_id → auth.users)` allowlist, RLS-enabled with
  zero policies (invisible to API roles).
- `private.is_admin()`: `SECURITY DEFINER`, `SET search_path = ''`,
  qualified refs, boolean, no dynamic SQL, `EXECUTE` to `authenticated`
  only. All app-table and storage-write policies check it; anon keeps
  default-deny.
- The single existing operator was bootstrapped before tightening (no
  lockout possible); rollback statements live as comments in migration
  `20260920000000`.
- App services keep their session check; RLS is authoritative. No layout
  RPC check: `private.*` is outside PostgREST schemas, and RLS already
  denies non-admin data.

### Consequences

New accounts are non-admin by default and see zero rows (proved live via
differential JWT test). Adding an admin = one explicit INSERT. Any future
non-operator account type must extend this table, never loosen policies.

---

## ADR-032 — Keep server-only service-role public reads (no RPC rewrite)

**Status:** Accepted
**Date:** 2026-09-20

### Context

Public profile/resolver/vCard use a privileged client to bypass RLS.
Options: keep + prove isolation, or narrow SECURITY DEFINER RPCs + anon
client (least runtime privilege, but new function surface + anon EXECUTE
grants to audit).

### Decision

Keep the service-role pattern: 3 routes, projected public-safe columns
(pinned by allowlist unit test), no writes. Harden the boundary instead —
`server-only` package enforcement, `env.ts`/`env-server.ts` split, static
`admin-isolation.test.ts`, canonical-host resolver fix.

### Consequences

Smallest safe change; no new DB surface. Revisit only if public traffic or
threat posture demands anon-path reads.

---

## ADR-033 — Public asset bucket threat model

**Status:** Accepted
**Date:** 2026-09-20

### Context

`profile-assets` is a public bucket holding avatar/cover media, including
for DRAFT profiles whose page is not public.

### Decision

Public-by-design for public-facing media only. A DRAFT asset URL is
reachable if known — acceptable because assets are classified
non-sensitive; identity documents, contracts, notes, and private files must
never be uploaded there. Writes are allowlist-gated; reads stay public.
Uploads additionally pass magic-byte validation; SVG stays rejected.

### Consequences

No signed-URL plumbing. If per-profile private media is ever needed, it
requires a separate private bucket + policy design.

---

## ADR-034 — Database-enforced card/profile invariants

**Status:** Accepted
**Date:** 2026-09-20

### Context

Card activation gates, cross-client destination rejection, and
one-profile-per-client were application-only (check-then-act races, direct
API bypass).

### Decision

- `UNIQUE(profiles.client_id)` (data verified clean first).
- `BEFORE INSERT OR UPDATE` trigger `trg_cards_integrity` (DEFINER, empty
  search_path): ACTIVE requires owner + destination; PROFILE destinations
  must belong to the assigned client; EXTERNAL_URL must be http(s) without
  control characters.
- CHECKs: accent `#RRGGBB`, server-shaped asset paths.
- Six live bypass attempts verified blocked; app validation stays
  authoritative for UX/normalization.

### Consequences

Integrity holds regardless of caller path. Future destination types must
extend the trigger deliberately.

---

## ADR-035 — Admin save + public read performance bundle

**Status:** Accepted
**Date:** 2026-09-20

### Context

Admin profile saves felt slow (repeated auth checks, full-size image
uploads, chatty link/card queries); public reads needed to stay fast
without weakening RLS or the service-role isolation (ADR-031/032).

### Decision

- Single auth check per server action; RLS remains the enforcement layer.
- Dual image pipeline: client canvas downscale + server sharp normalize
  (~200KB), immutable cache.
- Batched links/cards reads; single `revalidatePath` per save; no N+1
  reorder writes.
- Public profile: single `cache()`d fetch + `next/image` priority on LCP.
- RLS select-wrap: admin policies use `(select private.is_admin())` so
  Postgres lifts the check to one InitPlan per statement, not per row
  (migration `20260921_perf_admin_rls_select_wrap.sql`; no behavior change).

### Consequences

Saves are DB-speed for text; images stay small and cache-stable; public
page stays one fetch; authorization posture unchanged (allowlist
default-deny, no service-role in browser).

---

## ADR-036 — Profile editor stepper-footer labels

**Status:** Accepted
**Date:** 2026-09-20

### Context

The profile-editor footer crowded Back / Continue / Save profile into one
row with weak hierarchy; "Continue" did not say where, and "Save profile"
read like the step action rather than draft persistence.

### Decision

- Previous (secondary) / Next step (primary, thumb-side) / Save draft
  (tertiary outline, full-width row); "Create profile" kept until the first
  save. Aria labels name the step direction ("Go to next step: Contact").
- On Review, Next hides and Save takes over as the primary.
- No flow, routing, validation, or backend change; footer extracted to
  `ProfileStepperFooter`, rendered inside the existing save form.

### Consequences

Clear primary at a glance on mobile; save remains always reachable without
competing with step navigation.

---

## ADR-037 — Save Contact native-preview delivery

**Status:** Accepted
**Date:** 2026-09-20

### Context

Tapping Save Contact produced a Files/Downloads detour on mobile instead of
the native contact/import preview. Audit found the button href, builder
escaping, and ACTIVE-only gating correct — the failure was delivery: the
endpoint answered `Content-Disposition: attachment`, which forces a download
mental model on iOS Safari / Android Chrome. The endpoint also ignored
`profile_type`, so BUSINESS profiles never filed an organization.

### Decision

- Serve the canonical `/api/vcard/{slug}` as `text/vcard; charset=utf-8`
  with `Content-Disposition: inline` (+ RFC 6266 `filename*`), `no-store`,
  `nosniff`, and an exact `Content-Length`. No `download` attribute on any
  Save anchor; same-tab direct navigation (no JS Blob fetch, no
  `intent://` URL — unreliable on Samsung Internet and other browsers).
- vCard 3.0 kept: `FN` is the display name for both types; BUSINESS falls
  back to `ORG` = display name when no separate company exists and maps
  `job_title` (category) to `TITLE`. Filename helper re-sanitizes the
  normalized slug so headers can never carry CRLF/quotes/paths.
- One tiny client island (`SaveContactAction`, same pattern as the Share
  island): `idle → Opening… → native flow`, with a same-endpoint
  “Couldn't open Contacts. Download contact” fallback only if the page is
  still visible after 4s. Public page otherwise stays server-rendered.

### Consequences

iOS/Android receive a real vCard response the OS can preview and import;
the final user confirmation stays with the OS (unbypassable by design).
No second contact system exists — vCard remains the single canonical path.
