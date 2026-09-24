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

---

## ADR-038 — Save Contact direct-open (share-first + gated intent + `.vcf` alias)

**Status:** Accepted
**Date:** 2026-09-20

### Context

ADR-037 fixed delivery (`inline` vCard, no `download` attribute), but Android
Chrome still routes many `text/vcard` navigations through Downloads, and
iOS versions that sniff the URL extension don't always recognize the
extension-less `/api/vcard/{slug}` as a contact. No website can insert a
contact silently — the OS confirmation sheet is unbypassable — so “directly”
means one tap to the native sheet instead of a Files/Downloads detour.

### Decision

- **Share-first:** `SaveContactAction` attempts Web Share Level 2 with a
  `.vcf` `File` fetched from the same canonical endpoint. The OS share sheet
  offers “Save to Contacts / Create New Contact” directly. Share success or
  user dismissal resets quietly — the 4s fallback never fires for it.
- **Gated Android intent:** only when share is unavailable, and only for
  Chrome on Android (Samsung Internet, Firefox, Opera, Edge excluded via
  `shouldAttemptAndroidIntent`), navigate an `intent:// … VIEW
  text/x-vcard` URL with `S.browser_fallback_url` back to the profile page.
  Never the default; never on iOS/desktop.
- **Classic fallback preserved:** same-tab navigation to the `inline` vCard
  (the iOS preview path, works with JS disabled), then the existing
  same-endpoint “Download contact” fallback if still visible after 4s.
- **`.vcf` alias:** `/api/vcard/{slug}.vcf` serves the byte-identical
  response (suffix stripped before the normalized-slug lookup; disposition
  filename comes from the stored slug). Both Save anchors point at the
  alias to help OS sniffers. No second data path, no new query.
- Share/intent helpers (`vcardShareFilename`, `buildVCardIntentUrl`,
  `shouldAttemptAndroidIntent`, `supportsVCardFileShare`) are pure and
  unit-tested; the island stays the only client JS on the public page.

### Consequences

Supporting phones skip the Downloads folder entirely; elsewhere behavior is
unchanged. The final save confirmation still belongs to the OS Contacts app
by design. On-device verification (iPhone Safari + Android Chrome) remains
with the operator — no devices here.

---

## ADR-039 — Save Contact Android reliability (intent category, gesture, diagnostics)

**Status:** Accepted
**Date:** 2026-09-20

### Context

On-device retest (Android Chrome, production, ADR-038 code live) still
showed “Opening…” followed by an apparent page refresh with nothing saved.
The production vCard endpoint itself answers 200, so the failure is in
delivery: the share path never engaged, and the `intent://` fallback
reloaded the profile page instead of opening Contacts.

### Decision

- Drop `category=BROWSABLE` from `buildVCardIntentUrl`. Android resolves an
  intent only against filters carrying every category the intent declares;
  Contacts-style DEFAULT-only filters reject a BROWSABLE-only intent, and
  Chrome then loads `S.browser_fallback_url` — the observed silent reload.
  An intent with no categories passes every filter's category test (the
  framework treats it as CATEGORY_DEFAULT for startActivity), which is
  strictly more compatible.
- Never attempt the intent after an `await`: user activation has expired
  there, so Chrome may silently drop the navigation. Share failures go
  straight to plain navigation, which always works.
- The fallback now names the real next step (open the downloaded file from
  notifications) and carries a subtle reason code (`S` share / `I` intent /
  `D` download) so one on-device tap reports exactly which path died.

### Consequences

Same single-endpoint architecture; unit-tested helpers; the only client JS
on the public page stays the one tiny island. Device confirmation still
needs the operator.

---

## ADR-040 — Warm the vCard fetch so share() keeps user activation

**Status:** Accepted
**Date:** 2026-09-20

### Context

The ADR-039 reason codes paid off immediately: on-device tap reported
`(S)` with no share sheet ever appearing — the probe passed, then
`navigator.share()` rejected silently. The mechanism is user-activation
expiry: `share()` ran after `await fetch() + await blob()`, and on slow
networks/cold boots that outlasts the tap's transient activation window,
so Chrome rejects without UI.

### Decision

Start the same-origin vCard fetch on `pointerdown`/`focus` and stash the
promise; the click handler awaits the already-running request, shrinking
the gesture-to-`share()` gap to ~zero. Keyboard-only users (no
pointerdown) keep the fetch-in-tap path. A press that never becomes a tap
costs one tiny `no-store` GET; rejections are swallowed at warm time and
re-observed on tap. No copy, helper-signature, or endpoint changes.

### Consequences

If `(S)` repeats after this, the rejection is fast (not expiry) and the
next pivot is intent-first ordering on Android. If `(I)` appears instead,
the intent leg is the problem, not share.

---

## ADR-041 — INSERT-intent first on Android (direct editor open)

**Status:** Accepted
**Date:** 2026-09-20

### Context

`(S)` repeated on a fresh tab after the fetch warming shipped: `share()`
rejects fast, with no UI, on Samsung + Chrome + Samsung Contacts. The
share-with-File path is a dead end on the target device, and the old
VIEW-at-remote-URL intent is theoretically fragile there too (an `https`
data URI fails the data test against MIME-only importer filters).

### Decision

- Android-Chrome taps fire an `INSERT` intent first, synchronously in the
  gesture: `intent://vnd.android.cursor.dir/raw_contact/#Intent` with
  `action.INSERT` and `S.name/phone/email/company/job_title` extras from
  the official Insert contract. Type-only (no data URI) sidesteps
  scheme/host matching; no category keeps DEFAULT-only editor filters
  resolving. This opens the Contacts editor prefilled — no fetch, no
  activation race, immune to subrequest blockers. Fields ride as props
  from the server component (same source as the vCard builder; already
  public on-page — no new exposure, no new endpoint).
- The attempt is armed in `sessionStorage`; a fallback reload consumes the
  flag and restores the coded fallback instead of a silent refresh.
- Share auto-attempt is removed on this path (proven broken on target);
  share stays for non-Chrome Android and capable iOS/desktop. The old VIEW
  helper is deleted. iOS/desktop behavior is unchanged.

### Consequences

One tap → prefilled editor is the best flow any website can offer (the OS
confirmation tap stays, by design). If `(I)` appears on-device, Samsung
Contacts rejects INSERT and the next pivot is a MIME-variant VIEW revival.
Helpers are pure and unit-tested, including extras encoding and the
single-shot stale-tolerant storage flag.

---

## ADR-042 — INSERT `contact` MIME flavor + guided Downloads floor

**Status:** Accepted
**Date:** 2026-09-21

### Context

Fresh-tab, post-deploy tap on Samsung + Chrome still showed `(I)`: with a
visible reload, Chrome attempted the INSERT resolution and Samsung
Contacts declined `vnd.android.cursor.dir/raw_contact`. Delivery is proven
working (fallback reloaded and restored the UI); the MIME flavor is the
remaining variable.

### Decision

- Switch the INSERT type to `vnd.android.cursor.dir/contact`, matching
  field reports of working Chrome-launched editor intents; extras,
  fallback, gating, and arming are unchanged.
- Add a guided floor to the failure UI: an Android-Chrome-only (mount-
  gated, SSR-clean) "Open Downloads" button firing `VIEW_DOWNLOADS` as a
  sync in-tap intent, so the worst case is Save → Open Downloads → tap the
  `.vcf` into the vendor importer — Samsung-to-Samsung native, no dead
  ends. The download link stays for every other browser.

### Consequences

If the editor opens, intent work ends. If `(I)` persists, Samsung rejects
both MIME flavors and the Downloads floor (already in this build) is the
shipped answer; no further intent variants are planned.

> 2026-09-21 outcome (moratorium in effect): operator retest on merged PR
> #10 — fresh tab, post-deploy, Samsung + Chrome — still fails with repeat
> `(I)` plus a dead "Open Downloads" button. The pre-decision above now
> applies: programmatic intent/share work is CLOSED (share-Files, INSERT
> both flavors, VIEW both variants, VIEW_DOWNLOADS all exhausted on this
> build). Remaining paths are operator-device experiments only: My Files
> last-hop check, Samsung Internet tap test, Chrome Canary preferred-app
> flag. No code changes ship for this flow until one of those reports back.

## ADR-043 — Share Profile replaces Save Contact as the public final CTA

**Status:** Accepted
**Date:** 2026-09-21

### Context

Native contact saving proved inconsistent across iOS and Android
(ADR-037–042, intent-work moratorium). The product decision is to stop
presenting Save Contact as the primary action and offer a reliable
native sharing experience instead.

### Decision

- `PublicProfileView` renders no Save Contact surfaces: the in-flow CTA
  and the sticky bar are both removed. Final order is hero → quick
  tiles → information → about → more links → Share Profile → footer.
- `ShareProfileButton` (still the only `"use client"` island on the
  public page) shares `{ title: display_name, text: "Check out {Name}
  on Karti", url: window.location.href }` via the Web Share API, with a
  clipboard fallback (`"Profile link copied"`, plus a legacy
  `execCommand` path) and no technical errors. Only the public display
  name + current public URL are ever shared.
- `SaveContactAction.tsx`, its tests, and `GET /api/vcard/[slug]` stay
  in the repo untouched for later reuse — nothing is deleted.
- The dashboard editor preview mirrors the change with an inert
  server-rendered `ShareProfilePreview` (a `<span>`, not the live
  island — the live button would share the dashboard URL).

### Consequences

Saving contacts is no longer visually suggested as the primary action;
Share is the sole, secondary-styled final CTA. A future save flow can
reuse the kept endpoint + island without rebuilding.

## ADR-044 — Crop-before-upload image editor (no schema change)

**Status:** Accepted
**Date:** 2026-09-21

### Context

Profile photos uploaded straight from the picker were stored immediately
and shown in a fixed container, so framing often mismatched the public
profile. The product needs Select → Adjust → Preview → Save, for avatar
and cover, without touching the storage security model or the database.

### Decision

- Pure crop math (`crop.ts`: cover-fit scale × 1–3x zoom, clamped pan,
  frame→source rect) shared by the editor preview and the canvas step, so
  WYSIWYG cannot drift. Canvas encode (`cropBitmapToWebP` in image.ts)
  returns null — never the uncropped original — when unavailable.
- Native `<dialog>` editor (top-layer, Esc-to-cancel, no dependency):
  drag (Pointer Events) + arrow-key pan + 1–3x slider, Reset/Cancel/
  Confirm, live “How your … will appear” preview in the public crop shape
  (circle avatar, 3:1 cover).
- UploadControl opens the editor on select and uploads only the confirmed
  cropped WebP through the unchanged `uploadAssetAction`; cancel keeps the
  previous image. Generated storage paths, MIME/size/magic-byte gates,
  sharp normalize, and immutable caching are untouched.
- Avatar cap raised 512 → 1024 in code constants only (client + server),
  matching the 1024px requirement; cover stays 1600. No migration — caps
  are not schema.

### Consequences

Framing is decided before any bytes reach Storage. Pinch-zoom is out of
scope (slider + drag + keys cover all inputs); real pointer/canvas
behavior needs a browser pass (no jsdom in the suite).

## ADR-045 — NFC tap performance bundle (zero-stale)

**Status:** Accepted
**Date:** 2026-09-21

### Context

NFC taps paid 2 sequential page loads (`/t/[code]` 307 → `/[slug]`) with
3–4 sequential Supabase RTTs, all dynamic, plus an Edge invocation on every
public hit and two competing preloaded images. Operator target is ~1–2s
tap-to-content with zero stale destinations and the `307` redirect kept.

### Decision

- Proxy matcher narrowed to `/dashboard`, `/dashboard/:path*`, `/login` —
  public taps never invoke Edge (previously a broad matcher ran Edge on
  every public request for a no-op pathname check).
- Single-RTT embeds with legacy fallback (never fail a tap): resolver uses
  `profiles!cards_destination_profile_id_fkey(slug,status)`; public profile
  uses `profile_links!profile_links_profile_id_fkey(...)` with JS-side
  enabled-filter/sort. Embed errors or absent keys fall through to the exact
  legacy two-query paths (unit-pinned by both shapes).
- Additive indexes only (`profiles(slug,status)`,
  `profile_links(profile_id,enabled,sort_order,created_at)`,
  `cards(short_code,status)`; migration `20260922_perf_public_reads`).
- Zero-stale cross-request cache: `unstable_cache` with `revalidate: false`
  (purge-only, no TTL) behind one global tag; dashboard profile/link writes
  purge via `updateTag` (immediate Server-Action semantics — Next 16's
  `revalidateTag` targets a cacheLife profile and is the wrong tool here).
  The resolver stays `no-store`, so card destination switches bypass the
  cache by construction; slug renames are covered because the purge is global.
- Render: exactly one preloaded LCP image (cover XOR avatar) with
  `fetchPriority`, storage-origin preconnect, zero-client asset URLs,
  `optimizePackageImports` for the icon libs, dynamic `qrcode` import,
  `Server-Timing` on the redirect for sampling.

### Consequences

Repeat taps between edits skip the database; first taps cost ~1 RTT per
page instead of 2 sequential RTTs; dashboard edits stay instantly visible.
Over-purge cost (any edit refetches every slug once) is negligible at
single-admin scale. RLS, service-role isolation, `307` semantics, and the
permanent-URL invariant are unchanged.

## ADR-046 — Digital wallet card saving (Add to Wallet)

**Status:** Superseded (2026-09-21 — wallet integration deferred, see below;
stable identity retained)

> Wallet integration deferred. The Apple/Google integration was removed
> cleanly the same day it was built (external credentials were not going to
> be provisioned — no flags, no dead code, no wallet env vars, no wallet
> dependencies). Stable identity remains: `profiles.public_code`, `/u/`
> route, canonical links, and reserved `u` all stay, supporting future
> integrations such as wallet cards. The design below is preserved as the
> reintroduction blueprint.

### Context

Native contact saving proved inconsistent across iOS/Android (ADR-037–043,
intent-work moratorium), and Share is a share action, not a keep action.
The product needs "keep this card on the phone" via OS wallets with ONE
cta and no platform choice. Slugs are renamable, so wallet cards need an
immutable identity distinct from both the slug and the mutable NFC
destination.

### Decision

- Stable identity: `profiles.public_code` (10-char, card-code alphabet,
  UNIQUE NOT NULL + DEFAULT generator, migration `20260923`), served at
  `/u/{publicCode}` (same view/data as slug pages, canonical link on both).
  Wallet QR/barcode payloads embed ONLY `/u/{publicCode}` — never
  `/t/{shortCode}`. `u` added to reserved slugs.
- `src/features/wallet/`: pure `detectPlatform` (UA + userAgentData hints),
  secret-free model builders (`apple/generatePass`, `google/generateLink`),
  server-only services (P12 split via node-forge + passkit-generator
  signing; jose RS256 save-JWT, stateless — class created once by operator),
  `actions.ts` orchestration. Route `GET /api/wallet/[code]`: iOS → signed
  `.pkpass` (`application/vnd.apple.pkpass`, no-store), Android → 302 save
  link, desktop → 400 phone-modal signal, failures generic.
- Credential-gated CTA (operator decision): the island renders the live
  anchor only when the visitor's platform backend is configured; otherwise
  the QR/Copy modal. No fake button, no dead anchor. Static serials
  (`karti-{publicCode}`) make re-saves update in place; no push updates
  (documented limitation).
- New deps: `passkit-generator`, `jose`, `node-forge` (+ `@types/node-forge`
  dev). No device/installation/visitor tracking tables — forbidden.

### Consequences

Real passes require operator provisioning (Apple Pass Type ID cert +
WWDR; Google Wallet issuer + service account + one-time GenericClass);
until then the CTA degrades per the gate. `src/types/database.ts` carries
a 3-line manual backport of `public_code` (marked, byte-identical to future
generator output) because `pnpm db:types` needs `SUPABASE_ACCESS_TOKEN`,
unavailable here — re-running it absorbs the backport; the generated file
was restored untouched otherwise. On-device install sheets remain
operator-verified (no devices here).

---

## ADR-047 — Profile PWA "Keep this Card" (replaces wallet MVP approach)

**Status:** Accepted
**Date:** 2026-09-21

### Context

Native contact saving proved inconsistent across devices (ADR-037–043,
intent-work moratorium), and the Apple/Google Wallet integration was
removed the day it was built — external credentials were not going to be
provisioned (ADR-046 superseded). The product still needs "keep this card
on the phone": a per-profile install identity built on the stable `/u/`
identity that survives slug renames and NFC destination switches, with no
wallet dependency and no external services.

### Decision

- **One manifest per profile:** `GET /u/[code]/manifest.webmanifest`
  (pure builder in `src/features/pwa/manifest.ts` + thin route). `name` =
  display name, `short_name` = first token ≤12 chars, `start_url`/`id` =
  `/u/{CODE}` always (never the renamable slug, never `/t/{shortCode}`),
  `display: standalone`, validated accent or default theme color. Both
  `/u/[code]` and `/[slug]` pages emit the same manifest link, so the
  install identity is identical regardless of entry URL.
- **On-demand icons, no stored objects:** `GET /u/[code]/icon-192.png`,
  `/icon-512.png`, `/apple-touch-icon.png` render square PNGs via sharp —
  center-crop of the current avatar, accent initials tile when no avatar
  exists or bytes fail validation (magic-byte gate + 5 MB fetch cap). No
  migration, no new bucket paths/policies, no invalidation problem:
  avatar edits reflect immediately. All three responses are `no-store`,
  same as the manifest — install-time fetches where correctness beats
  caching, consistent with the resolver/vCard posture.
- **Platform-split install island:** `KeepProfileButton` (second tiny
  `"use client"` on the public page). Android + `beforeinstallprompt` →
  native prompt fired sync-in-gesture on tap (no manual instructions in
  this path); Android without a captured prompt → minimal hint; iOS →
  guided modal (Share → Add to Home Screen → Add, close button, no
  jargon); desktop → plain guidance note; already-standalone → renders
  nothing. The prompt event is captured, never auto-fired.
- **Placement:** Keep this Card sits after profile information (Connect
  links) and before Share Profile; Share stays the final CTA;
  attribution last. The dashboard editor preview mirrors the order with
  an inert span (a live island could offer installing a dashboard URL).
- **Security unchanged:** ACTIVE-only through the existing cached code
  loader (DRAFT/INACTIVE/unknown/malformed → one generic 404); manifest
  body key-pinned to public fields; no service-role or secrets in client
  code (island touches no privileged modules); no service worker, no
  tracking, no new tables, no new dependencies, no new env vars.

### Consequences

Visitors keep a home-screen icon that looks like the person/business and
opens that profile directly in standalone mode. Installed shortcuts stay
valid across slug renames (identity URL) and card destination switches
(NFC layer untouched). The stable `/u/` identity remains available for a
future wallet reintroduction per the ADR-046 blueprint. On-device install
confirmation stays with the operator (no devices here).

---

## ADR-048 — public_code generator off-by-one + format CHECK

**Status:** Accepted
**Date:** 2026-09-21

### Context

Phase 22 live verification caught a latent Phase 21 bug: the
`generate_profile_public_code()` SQL function rolled
`floor(random() * 32) + 1` against a **31**-symbol alphabet, so index 32
produced `substr(..., 32, 1) = ''` — ~27% of issued codes came out short
(9 chars). Short codes fail the app's 10-char format gate, leaving those
profiles unreachable via `/u/` (fail-closed 404, including manifest and
icons). The TypeScript counterpart was never affected (`byte %
alphabet.length`). No operator data was malformed; only a temp probe row.

### Decision

- Migration `20260924_public_code_generator_fix.sql`: roll against
  `length(alphabet)` instead of the hardcoded 32, and add a DB-level
  format CHECK (`profiles_public_code_format`,
  `^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$`) so no caller path can
  persist a malformed code again. Existing data verified clean (zero
  violations) before apply; 10/10 post-fix samples valid; DEFAULT-path
  insert verified end-to-end.
- No app-code change needed: the strict 10-char gate stays correct.

### Consequences

Every issued identity code is install-ready. Future alphabet changes
must keep the roll bounded by `length(alphabet)`, and the CHECK must be
extended deliberately if the format ever changes.

---

## ADR-049 — Hero no-overlap redesign (clean cover + solid identity)

**Status:** Accepted
**Date:** 2026-09-21

### Context

The Phase 19 hero stacked three darkening layers over the cover
(`brightness-[0.8]` + `from-black/70 via-black/30 to-black/85` scrim +
`h-24 from-black/50` bottom gradient), burying mid-tone covers, and pulled
quick tiles 40px up over the hero (`-mt-10`) with unbounded text height
(wrapping name + pill + clamp-3 tagline) — "shadowed cover, things flow
over things".

### Decision

- Cover renders at full color: fixed `h-52 sm:h-60` image-only section, no
  brightness filter, no scrims, no text on the image. Accent-gradient
  fallback kept for cover-less profiles.
- Identity moves onto the solid sheet: avatar `-mt-12` (only bounded
  overlap; ring matches sheet `ring-[#F4F8FC]` / `ring-neutral-950`), name
  in theme text (no text-shadow), category as accent-tinted pill (no
  backdrop-blur), tagline in muted tone.
- Quick tiles sit in-flow (`mt-4` via sheet `pt-4`), no `-mt-10`/`z-10`;
  sheet drops `rounded-t-[28px]`. LCP single-priority rule, server-only
  rendering, section order, and content-driven collapse unchanged.

### Consequences

Cover photography stays vivid; no floating collisions at any content
length or at 320px. Future hero polish must keep text off the image and
keep overlaps bounded/constant-height (avatar-only).

> 2026-09-21 addendum (white-cover separation): cover `<section>` carries
> a theme-aware `border-b` + soft shadow (light `#E2E8F0` + slate shadow,
> dark `white/10` + deep shadow) so white covers read as a finished photo
> edge against either sheet. Avatar deliberately untouched.
>
> 2026-09-21 addendum (premium avatar): 112px avatar/logo, white ring +
> accent halo + deep shadow in both themes; drops the sheet-matched ring
> (invisible on white covers). Spacing rebalanced (name `mt-4` 30px,
> pill/tagline `mt-2.5`, identity `pb-3`, sheet `pt-5`).
>
> 2026-09-21 addendum (Phase 25 sections foundation): the hero/actions/links
> blocks render through `ProfileSectionRenderer` (data-driven order from
> `profile_sections`); default order renders the identical DOM. Hero stays
> pinned to the top slot (full-bleed cover cannot sit mid-sheet without a
> design pass); reorder moves actions/links within the sheet.

---

## ADR-050 — PWA install correctness + platform-specific Keep CTAs

**Status:** Accepted
**Date:** 2026-09-21

### Context

Phase 22 shipped a working install identity, but the manifest lacked
`scope`, had no maskable icon (Android adaptive cropping could clip
faces), pages missed Apple web-app meta (no `capable`/`status-bar`/
`title`), the island could not tell iOS Safari (installable) from iOS
Chrome (not installable — Add to Home Screen absent from its share
sheet), and the iOS guide was unillustrated text. iOS users could not
find the option with no explanation why.

### Decision

- Manifest: `scope` = `start_url` (`/u/{code}`); third icon entry
  `purpose: "any maskable"` on the 512 URL; the 512 route pads to the
  80% safe zone on the accent backdrop (192/180 stay full-bleed).
- Pages: `appleWebApp { capable, statusBarStyle: default, title:
  short_name }` + `mobile-web-app-capable` on both `/[slug]` and
  `/u/[code]`; unknown/misconfigured metadata stays bare.
- Island: `detectInstallEnvironment` (CriOS/FxiOS/EdgiOS/OPiOS-aware);
  CTAs per environment (`Add to Home Screen` / `Install Digital Card` /
  `Open in Safari to save this card` / `Add to Phone` SSR fallback);
  non-Safari iOS gets guidance, never a fake install button.
- Guide: illustrated 3-step modal (toolbar mock, sheet-row mock, Add
  confirmation) in existing icon set, no new dependencies.
- Diagnostics: dev-only `?pwa-debug=1` island (manifest/icon/meta/
  context checks), null in production, no privileged imports.
- Keep section: `Keep this digital card` + quick-access subtitle; Share
  stays the final accent CTA (no duplicate secondary button).

### Consequences

Install surface is valid PWA on Android (prompt + adaptive icon) and
correct standalone web-app on iOS Safari, with honest fallbacks
everywhere else. Identity model, resolver, NFC/QR, wallet backlog, and
database are untouched. On-device install confirmation stays with the
operator.

---

## ADR-051 — Profile sections foundation (hero/actions/links)

**Status:** Accepted
**Date:** 2026-09-21

### Context

The public profile rendered a hardcoded hero → actions → links order. The
product needs a flexible section builder (maps, menus, gallery later)
without a visual redesign now and without breaking the permanent-URL,
ACTIVE-only, or zero-stale contracts.

### Decision

- New `public.profile_sections` table (`profile_id`, `type`, `position`,
  `enabled`, `settings jsonb`, timestamps): TEXT + CHECK foundation types
  (`hero|actions|links`), `UNIQUE(profile_id, type)` (exactly one of each
  in the foundation) + `UNIQUE(profile_id, position)` (unambiguous order),
  cascade on profile delete, RLS admin-only (`(select private.is_admin())`),
  anon default-deny. Idempotent backfill seeds hero(1)/actions(2)/links(3).
- `settings` defaults to `{}` and is never projected on the public path —
  a future public display key must be allowlisted deliberately.
- Reorder uses a two-phase position write (park at 1000+i, then assign
  1-based) so `UNIQUE(profile_id, position)` never fires transiently.
- Public loader carries sections on the single-RTT embed with a legacy
  fallback; zero rows → canonical default order; rows present but all
  disabled → empty (explicit, no resurrection). Unknown types pass through
  data but render nothing.
- `ProfileSectionRenderer` owns order; section components are verbatim
  extractions (default DOM identical). Keep/Share/attribution stay fixed
  after sections. Hero is pinned to the top slot in the foundation —
  full-bleed cover art cannot sit mid-sheet without a design pass, so
  reorder moves actions/links within the sheet.
- New profiles seed foundation rows best-effort (never fails creation);
  section writes purge the global public cache tag (zero-stale preserved).

### Consequences

Future section types extend the CHECK (and revisit the per-type unique)
deliberately. A free-position hero needs a design pass first. Migration
`20260925` must be applied live; until then the dashboard shows a notice
and the public path renders defaults.

---

## ADR-052 — Section registry + builder architecture (no new rendered sections)

**Status:** Accepted
**Date:** 2026-09-21

### Context

Phase 25 proved data-driven ordering for a fixed trio. The builder needs a
catalog (Business/Personal/Media blocks), an Add flow, richer manager UX,
and drag-and-drop — without implementing any new rendered section yet and
without changing the public UI.

### Decision

- **Split registry (bundle hygiene):** `sectionCatalog.ts` (features) holds
  pure data — type, label, description, category, status, lucide icon,
  default settings — importable from server services and client components
  alike. The component half (`resolveSection` + adapters) lives in
  `ProfileSections.tsx`, pairing a catalog entry with its renderer.
  Admin bundles never absorb public render code through the catalog.
- **11 catalog types, 3 live:** hero/actions/links stay the only rendered
  sections. Location, Opening Hours, Menu, Catalog, About, CV, Experience,
  Gallery are `planned` with `{}` defaults and null components; the
  renderer skips null components without crashing.
- **Singleton-per-type preserved:** migration `20260926` only widens the
  CHECK. `UNIQUE(profile_id, type)` stands — gallery-style repeatable
  sections must revisit it deliberately when they ship.
- **Service-permits / modal-gates split:** `addProfileSection` accepts any
  registry type (singleton-guarded); the Add modal lists planned types as
  Coming soon with no persistence call. Flipping a catalog status to live
  unlocks Add with zero service changes.
- **Delete asymmetry:** foundation trio can be hidden, never deleted
  (`deleteProfileSection` rejects them); planned rows are removable
  (two-tap confirm, non-foundation rows only).
- **Native HTML5 DnD, no library:** handle-only dragging with drop
  indicator; up/down buttons remain the keyboard and touch path (the DnD
  API has no touch support). Shared pure `moveSectionId` helper keeps drag
  and button paths to one ordering semantic.
- **Settings placeholder:** per-card disclosure stating settings arrive
  with each section's implementation — explicit copy instead of fake
  inputs or dead controls.

### Consequences

New sections ship as: catalog status flip + component + map entry +
settings UI — no manager, service, or migration-shape changes for
singleton types. Migration `20260926` must be applied live (file-only
here); until then the new types are rejected by the old CHECK and the
dashboard keeps its unreachable-table notice path.

---

## ADR-053 — Section settings engine (schema-allowlisted settings)

**Status:** Accepted
**Date:** 2026-09-21

### Context

Sections need per-type configuration (visibility toggles today, richer
controls later) without leaking admin internals to the public profile and
without every new section reinventing validation, editing, and projection.

### Decision

- **Schemas own the shape:** `sectionSettings.ts` declares one zod schema
  per live section (hero: showTagline/showCategory; actions:
  showQuickTiles/showAbout; links: showSubtitles — all default-visible, so
  current UI is preserved bit-for-bit). Zod strips unknown keys (ignored)
  and rejects bad value types.
- **Schema is the public allowlist:** the public loader sanitizes stored
  settings through the same schemas before projecting. Only declared
  display keys can ever reach `PublicSection.settings`; smuggled,
  admin-only, or unknown keys are structurally stripped, and invalid
  shapes reset to defaults (never fail a tap). Planned/unknown types
  project `{}`.
- **Registry carries editors + audiences:** catalog entries add
  `settingsComponent` (live editors wired, planned null) and
  `supportedProfiles` (business blocks BUSINESS-only, personal blocks
  PERSON-only, core + gallery both). `SectionSettingsRenderer` loads the
  editor dynamically; the manager shows the arrives-with-implementation
  placeholder where no editor exists.
- **Split persistence rules:** `updateSectionSettings` validates against
  the type schema (planned types accept `{}` only); `addProfileSection`
  enforces the audience split against the profile's type; every write
  purges the public cache tag (zero-stale preserved).
- **No migration:** `profile_sections.settings jsonb` already exists.

### Consequences

A new section ships settings by adding its schema + editor + audience —
no loader, service-shape, or table changes. Defaults must always equal
the no-settings render so backfill-era rows stay identical. No business
sections are implemented in this phase; their catalog rows stay planned.

---

## ADR-054 — First real sections: Location + Opening Hours

**Status:** Accepted
**Date:** 2026-09-21

### Context

The Phase 26/27 engine (registry, schemas, editors, sanitized projection)
had no real consumer beyond the foundation trio. Location and Opening
Hours are the first BUSINESS-only blocks, exercising the full lifecycle:
catalog → Add → configure → sanitized render → reorder/hide/remove.

### Decision

- **Location:** title/address/coordinates/showMap/buttonLabel settings;
  public renderer shows an address card with Google Maps (primary button)
  and Apple Maps (link) URLs built from an encoded `lat,lng` (preferred)
  or address query. No iframe, no API keys, no third-party scripts.
  Empty target collapses the section (content-driven, like all sections).
- **Opening Hours:** IANA timezone (validated via `Intl`) + 7-day rows
  (closed flag, HH:MM open/close); public renderer lists the week,
  highlights today (`aria-current="date"`), and shows an Open-now/Closed
  badge computed server-side in the schedule's timezone. Undeterminable
  states render no badge rather than a wrong one.
- **No migration:** both types were already in the Phase 26 CHECK;
  flipping catalog `status` to live + adding schema/editor/component is
  the entire shipment. Singleton-per-type and audience gating unchanged.
- **Modal Add goes live for live types:** compatible, not-yet-added live
  entries show a working Add button (singleton + audience enforced
  server-side regardless); planned entries stay Coming soon.

### Consequences

The engine's ship path is proven: Menu/Catalog/About/CV/Experience/
Gallery follow the same four-file pattern (schema, editor, renderer,
catalog flip). Coordinates are display routing data, not secrets — but
like all settings they pass through the schema allowlist all the same.

---

## ADR-055 — Collection sections: Menu + Catalog on settings JSONB

**Status:** Accepted
**Date:** 2026-09-21

### Context

Restaurants and businesses need item collections (menu dishes, catalog
products) with photos and prices, without new tables, without a new
bucket, and without duplicating logic between two near-identical
sections.

### Decision

- **One shared engine:** `collectionItemSchema`/`collectionCategorySchema`
  (id/image/name/description/price/available; categories ≤20, items ≤50)
  back both `menuSettingsSchema` ("Our Menu") and `catalogSettingsSchema`
  ("Products", currency default MAD). One `CollectionEditor`, one
  `CollectionView` — Menu/Catalog are thin wrappers differing only in
  placeholders and fallback headings.
- **Section-scoped images, same bucket:** `{clientId}/sections/{type}/`
  under `profile-assets`; identical validation (MIME, magic bytes, size),
  sharp normalize (1024 cap), immutable cache. Uploads are
  ownership-verified (profile must belong to the client); the managed-path
  delete gate covers the new shape; settings saves best-effort-remove
  orphaned item photos (never fails the save). Only referenced images
  render — no listing surface.
- **RESTAURANT forward-declared:** no such profile type exists (canonical
  types stay PERSON|BUSINESS, no migration), so menu declares
  `["RESTAURANT", "BUSINESS"]` and the audience gate matches BUSINESS
  today — automatically extending if the profile type ever arrives.
- **Catalog modal split preserved:** the uploader is injected through
  editor context (never imported) so the registry stays importable from
  client components and server services without tripping the server-only
  boundary (caught live: a direct server-action import poisoned 12 suites).
- **Public collapse rules:** unavailable/nameless items hidden, emptied
  categories dropped, empty collections render nothing.

### Consequences

About/CV/Experience/Gallery reuse the established patterns. Item-photo
orphans are removed on save, not on upload — replacing a photo then
abandoning the draft keeps the old file (safe order, same as avatars).

---

## ADR-057 — Personal sections with a private CV bucket

**Status:** Accepted
**Date:** 2026-09-21

### Context

PERSON profiles need biography, work history, and a downloadable CV. CVs
are the first non-image uploads and must never be directly reachable —
unlike avatars, a document URL must not work when pasted anywhere.

### Decision

- **About/Experience as settings:** title + plain-text content (2000 cap);
  jobs (company/role required, YYYY-MM dates with end-after-start
  refinement, descriptions). Collapsible when empty, like all sections.
- **Private documents bucket:** `profile-documents` (private, PDF-only,
  5 MB) carries deliberately NO read policy for any API role — default
  deny. The only read path is the service-role download inside
  `GET /api/cv/[slug]`, which re-resolves the ACTIVE profile, validates
  the managed-document path shape, and streams `inline` with `no-store`.
  All failures share one generic 404.
- **Path never leaves the server:** the public projection strips `file`
  and exposes only a `hasFile` presence flag; the renderer links the
  slug endpoint. The stored path embeds the client UUID, so exposing it
  would leak internal ids even if the bytes stayed protected.
- **PDF pipeline mirrors images:** MIME allowlist, `%PDF-` magic bytes,
  size cap, ownership check, server-generated names — but stores original
  bytes (sharp never touches PDFs). Deletes route by path shape to the
  correct bucket; orphan cleanup covers documents.
- **Uploader injection preserved:** the CV editor receives its uploader
  through context (never imported), keeping the registry importable from
  both sides of the server-only boundary.

### Consequences

Gallery is the last planned type. Migration `20260928` must be applied
live with a bucket-privacy check (anonymous GET on a document URL must
403/404). Until then CV uploads fail closed at the storage layer.

---

## ADR-058 — Gallery completes the section registry

**Status:** Accepted
**Date:** 2026-09-21

### Context

Gallery was the final `planned` catalog entry. Visual collections need
multi-upload, alt text, reordering, and two server-rendered layouts —
without client JS on the public page and without new storage.

### Decision

- **Schema-gated image refs:** gallery images carry managed-path refs
  (shape-checked in zod, authoritative in the delete gate) plus alt text.
  The renderer resolves only non-blank, schema-shaped refs to public
  URLs; anything else never reaches an `<img src>`.
- **Layouts without JS:** `grid` (responsive 2→3 columns, square crops)
  and `masonry` (pure-CSS columns) both server-render; lazy loading via
  the native attribute. Empty galleries collapse.
- **Editor reuses the image pipeline:** multi-file upload through the
  injected uploader (gallery scope), previews, alt editing, confirm
  remove, up/down reorder, blank-slot adds. Removed-on-save photos join
  the existing orphan cleanup.
- **All four use cases, one audience pair:** gallery supports PERSON +
  BUSINESS, which covers personal, business, restaurant, and store
  profiles (the latter two are BUSINESS-typed). No audience or migration
  changes were needed — gallery predates the Phase 26 type CHECK.

### Consequences

The registry has no planned types left: every catalog entry is live with
an editor and a renderer. Future blocks follow the proven five-file
pattern (schema, editor, renderer, adapters, catalog flip).

---

## ADR-059 — Builder UX: preview, completion, presets (no arch changes)

**Status:** Accepted
**Date:** 2026-09-21

### Context

Section management worked but felt operational: no live preview of
section edits, no guidance on what "done" means, no onboarding after
creation, and layout variants required hand-editing settings.

### Decision

- **Same renderer, inert islands:** `BuilderPreview` reuses
  `ProfileSectionRenderer` (identical order/visibility/settings
  semantics) with the existing inert Share/Keep previews — the live
  islands share `window.location.href`, which would be a dashboard URL
  in the builder. Updates ride `router.refresh()`, never navigation.
- **One completion source:** `computeCompletion` (required 20pts,
  recommended 10pts) feeds both the progress card and
  `onboardingSteps`, so checklist and bar agree structurally. Location
  counts only with a real target (coordinates or address); gallery only
  with real photos; disabled sections never count.
- **Checklist without tables:** onboarding shows for DRAFT profiles;
  dismissal persists in localStorage per profile (no new tables, no
  RLS surface). All-done collapses to nothing.
- **Presets are validated settings:** registry `presets` merge over
  current values through the normal save path (validation still
  applies); a test proves every preset validates. Variants are real but
  restrained: actions tiles/buttons, menu cards/list, gallery
  grid/masonry — no whole-profile redesign.

### Consequences

Builder UX adds no tables, no routes, no RLS or projection changes. The
edit page widens to a manager + sticky-preview grid on desktop.

---

## ADR-056 — Profile templates (creation-time seeding, metadata column)

**Status:** Accepted
**Date:** 2026-09-21

### Context

New profiles need one-tap section presets (personal/business/restaurant/
store) without coupling the template to the live sections afterwards.
Operators also need to see which preset a profile came from.

### Decision

- **Registry + one-shot seeding:** `profileTemplates.ts` declares the
  four templates (sections + enabled flags + settings overrides).
  `seedTemplateSections` inserts ONLY missing types after the current max
  position — existing rows (disabled, customized, or foreign) stay
  byte-identical, reruns insert nothing. Creation resolves explicit
  compatible choice → type default, and never fails over a bad id.
- **Metadata column, not a driver:** `profiles.template` (+ CHECK,
  backfilled from profile type) records the choice.
  `updateProfileTemplate` updates only that column — the function
  structurally issues no `profile_sections` query, pinned by a
  table-call test. Changing templates never recreates sections.
- **UI split:** template picker lives in the creation wizard (filtered by
  profile type, reset on type change); the edit page shows a reference
  switcher with explicit never-touches-sections copy.
- **Audience coherence:** every template section is addable on the
  template's profile type (registry test pins this), so seeded rows
  always pass the add gate's rules.

### Consequences

Gallery seeds as an enabled row that renders nothing until implemented
(consistent with the planned-type posture). Migration `20260927` must be
applied live (file-only here); until then creation falls back gracefully
(insert without the column fails → UNKNOWN, no partial profile — same as
any schema drift, covered by the migration-first workflow).

---

## ADR-060 — Pre-migration profile loader tolerance (Phase 33 incident fix)

**Status:** Accepted
**Date:** 2026-09-22

### Context

The live database never received migrations 20260925–20260928
(`profile_sections`, widened section CHECK, `profiles.template`,
private documents bucket). Dashboard profile reads therefore ran against
rows without the `template` column and a missing sections table. Any
loader that demanded the new columns answered PGRST204 ("Could not find
the column in the schema cache"), which the client page collapses to a
phantom "No profile configured yet" empty state and the creation page
collapses to "Could not load the profile." — for profiles that exist
and were working before Phase 25–33.

### Decision

- Reads degrade, never fail, on schema drift: `getProfileByClientId` /
  `getProfileById` (and create/update/status post-write selects) try
  `PROFILE_DETAIL_COLUMNS` first and retry with
  `PROFILE_DETAIL_COLUMNS_LEGACY` (no `public_code`) on a missing-identity-
  column error. Rows without a code normalize `public_code` to `""`
  (dashboard keeps loading; `/u/` fail-closes to 404 until migration
  20260923 lands — the safe direction). No read path invents or persists
  identity codes; minting stays with the DB DEFAULT generator + backfill.
- Template resolves, never nulls: `resolveProfileTemplate(stored,
  profileType)` keeps stored-compatible metadata, else derives from the
  profile type (personal/business). The edit page feeds the resolved id
  to the switcher; `getProfileTemplateColumn` stays the tolerant
  metadata read (null = unavailable).
- Sections stay best-effort: `seedTemplateSections` fails closed (false,
  no throw) when the table is absent; the public loader renders
  `DEFAULT_PUBLIC_SECTIONS`; the edit page shows the migration notice
  (table missing) or the one-click restore (rows missing).
- Creation flow needs no routing change: once the loader resolves old
  profiles, Case B (existing profile) redirects to the editor and Case A
  (no profile) creates with the template insert-retry + best-effort
  seeding.

### Consequences

Old profiles load, edit, and build with zero data changes and zero
forced recreates. The additive migrations (20260925–20260928) are still
required to unlock sections/templates/documents — file-only here,
operator applies + live JWT matrix. Regression pinned by
`profileRegression.test.ts` (11 cases: legacy/modern/missing-data).

---

## ADR-061 � Unified profile editor: one draft, one preview, one save

**Status:** Accepted
**Date:** 2026-09-22

### Context

After Phases 25�33 the edit page held two editors (standalone
`SectionsManager` + Identity?Review wizard), two previews (server-fed
`BuilderPreview` + a legacy-kit draft preview), and scattered saves
(profile / link / settings / template / status). The flexible section
architecture is worth keeping; its UX placement was not.

### Decision

- ONE draft: `unifiedDraft.ts` (pure reducer + public-shape adapter) shared
  by every step and the preview. Keystrokes re-render the preview with no
  save and no `router.refresh()`.
- ONE preview: the real `ProfileSectionRenderer` in the `BuilderPreview`
  phone frame, draft-fed, sticky on desktop, tab + full-screen sheet on
  mobile. The legacy `ProfilePreview`-kit approximation is deleted.
- ONE save: `saveUnifiedDraftAction` persists profile columns + link
  end-state + section end-state (creates/updates/deletes/toggles/exact-set
  reorder via the unchanged services), one revalidate + one cache purge.
  Diff logic lives in testable `unifiedSavePlan.ts`. Status changes,
  template metadata, and storage uploads stay immediate (visibility gate /
  reference metadata / storage must pre-exist).
- Steps: Identity (type + template + naming + images), Contact (data +
  actions config), Links (full manager), Sections (content cards + single
  page order, hero pinned, core rows link to their steps), Appearance
  (theme/accent/visual presets), Review (completion + link + status + NFC).
- One additive settings key: `maxQuickActions` (1�3, default 3) in the
  actions schema, honored by `pickQuickActions(limit)` and the renderer.
  No migration (JSONB), no behavior change at default.
- `storagePaths.ts` split: pure URL helpers move out of `storage.ts` so
  the client-rendered preview chain never pulls sharp into the browser
  bundle (`storage.ts` re-exports; all importers keep working).

### Consequences

- No DB model change; all ownership/RLS/validation behavior preserved
  (services reused, not rewritten).
- Dirty tracking + `beforeunload` guard; step navigation never drops edits.
- New profiles keep the save-once gate for links/sections/uploads.
- Fail-closed concurrent-edit detection ("changed elsewhere, reload").

---

## ADR-062 � Explicit primary actions + single mobile preview path

**Status:** Accepted
**Date:** 2026-09-22

### Context

Phase 34 left two gaps: mobile had both Edit/Preview tabs and a Preview
sheet (redundant), and the top-action order was still derived implicitly
(Instagram ? WhatsApp ? Call ? �), so operators could not choose or order
what visitors see first.

### Decision

- Mobile: tabs deleted. The editor is always visible; the header Preview
  button opens a full-screen sheet with the same draft-fed renderer. The
  side preview stays mounted-but-hidden below desktop (one renderer while
  the sheet is closed), so no state is lost opening/closing.
- `actions.primaryActions`: explicit ordered refs (`call | whatsapp |
  email | website`, `link:<uuid>`, max 20) in settings JSONB � no new
  table. `resolvePrimaryActions` is the single resolver for the public
  renderer and the admin preview (explicit order wins, stale refs skipped,
  empty = legacy order, always capped). `primaryAvailability` gates what
  is selectable; `sanitizePrimaryRefs` cleans on save (temp `link:draft-�`
  refs are remapped server-side after link creation).
- `maxQuickActions` widened 1�4 (default 3). The draft adapter carries
  `enabled` so disabled links vanish from tiles AND Connect in preview,
  exactly like the public loader.
- Contact card UI (visible/hidden/unavailable + segmented count) writes
  only the draft; the unified Save persists everything, no extra buttons.

### Consequences

- Existing profiles (no `primaryActions`) render byte-identically.
- Dead refs can never produce broken cards (resolver skips, save cleans).
- Promoting an unsaved link works end-to-end via the temp?real remap.

---

## ADR-063 � Draft-native section editing + keyless OSM maps

**Status:** Accepted
**Date:** 2026-09-22

### Context

Phase 34 sections staged edits behind per-section Save buttons over
bare-`{}` defaults, so new blocks were unconfigurable and invisible until
saved. Location had no real map experience.

### Decision

- All 11 section editors are controlled (`settings` in, `onChange` out,
  every keystroke commits to the draft). No editor persists anything;
  uploads stay immediate with paths staged in draft. One save persists all.
- Add instantiates Zod schema defaults; new rows auto-expand + focus.
- Location gains `mapsUrl` (Google/Apple allowlist) + `mapZoom`; target
  resolution is coords ? link ? address. The map card is a keyless OSM
  embed built from sanitized numbers (lazy iframe); address-only renders
  card + vendor links; user URLs/HTML never reach an embed.
- Admin preview renders per-type empty guidance via a
  `previewPlaceholders` flag; public rendering collapses as before �
  same components.
- Save failures carry `sectionId`; the Sections step expands, scrolls to,
  focuses, and annotates the card.

### Consequences

- Typing anywhere in Sections updates the phone preview with no save.
- Existing rows/profiles byte-identical (defaults only fill at add/save).
- OSM reachability is the only new runtime dependency (links fallback).

---

## ADR-064 � Map-link-only Location with SSRF-safe resolution

**Status:** Accepted
**Date:** 2026-09-22

### Context

Manual coordinate/zoom fields leaked implementation detail and invited
bad pins. The operator should paste one Maps link; Karti resolves exact
coordinates internally.

### Decision

- Editor exposes title/address/maps-link/show-map/button only.
  Coordinates resolve via `resolveMapsLinkAction` (debounced + blur):
  short hosts resolve server-side, everything else extracts directly,
  failures show one shared message and never guess or geocode.
- Short-link fetching is SSRF-hardened: HTTPS-only, allowlisted hops,
  per-hop DNS verification with private-range blocking, =4 hops,
  timeout-guarded, no response bodies. Pure core (`mapLinks.ts`) takes
  injected fetch/DNS so the matrix runs offline.
- Coordinates persist in the existing JSONB keys (storage model
  unchanged); the OSM embed and directions prefer the original safe
  link, else coordinates-based vendor URLs. OSM attribution rendered.
- Resolver injected through settings context � the catalog keeps its
  server-action-free import boundary (vitest-safe).

### Consequences

- No map API keys, no paid services, no new tables.
- Legacy coordinate rows render unchanged; clearing a link clears only
  detected pins.
- Live short-link resolution still needs an operator network check.
