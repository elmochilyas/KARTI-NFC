# Karti — Implementation Tasks

This is the project execution tracker.

The coding agent must update this file as work progresses.

## Status convention

```text
- [ ] TODO
- [x] DONE
```

For a live task, append:

```text
**IN PROGRESS**
```

For a blocked task, append:

```text
**BLOCKED:** reason
```

## Definition of done

A task is DONE only when:

- code is implemented;
- acceptance criteria are satisfied;
- relevant tests/checks pass;
- known regressions are addressed;
- this tracker is updated.

---

# Phase 0 — Repository & Agent Foundation

## 0.1 Inspect repository

- [x] Inspect current git working tree.
- [x] Identify package manager.
- [x] Identify Next.js version.
- [x] Confirm App Router or existing routing approach.
- [x] Confirm TypeScript configuration.
- [x] Confirm Tailwind configuration.
- [x] Identify lint/format commands.
- [x] Identify test framework.
- [x] Identify existing Supabase integration.
- [x] Identify existing environment variables.
- [x] Document important existing implementation before changing architecture.

> 2026-09-19: greenfield — repo contained only `README.md` with the text
> `# KARTI-NFC` (no project content) plus untracked `specs/`. No package
> manager, framework, or Supabase integration existed. Nothing overwritten.

### Acceptance gate

- [x] Existing user work has not been overwritten.
- [x] Agent understands the current project before restructuring.

## 0.2 Install project context

- [x] Add this context pack to the repository.
- [x] Place/copy `AGENTS.md` where OpenCode reliably reads it.
- [x] Link project specs from root README if useful.
- [x] Confirm `TASKS.md` is the active tracker.

> 2026-09-19: root `AGENTS.md` gateway added (points to `specs/AGENTS.md`);
> root README links `specs/SPEC_INDEX.md` and names `specs/TASKS.md` tracker.

## 0.3 Environment

- [x] Create/update `.env.example`.
- [x] Add required Supabase variables.
- [x] Ensure real secrets are gitignored.
- [x] Add environment validation where useful.

> 2026-09-19: `.env.example` + `.gitignore` (`.env*` ignored) +
> `src/lib/env.ts` validation (public vs server-only keys, clear missing-env errors).

---

# Phase 1 — Application Foundation

## 1.1 App foundation

- [x] Create or normalize Next.js app structure.
- [x] Enable/confirm strict TypeScript.
- [x] Configure path aliases.
- [x] Configure linting.
- [x] Configure formatting.
- [x] Add global styles.
- [x] Add base application metadata.

> 2026-09-19: Next.js 16 App Router (`src/app`), `strict: true`, `@/*` alias,
> ESLint flat + `eslint-config-next`, Prettier, Tailwind v4 CSS-first,
> root metadata. Scripts: dev/build/typecheck/lint/format/test(+watch).

## 1.2 Base UI system

- [x] Define typography.
- [x] Define spacing/radius conventions.
- [x] Define neutral/accent tokens.
- [x] Create accessible Button primitive.
- [x] Create Input primitive.
- [x] Create Textarea primitive.
- [x] Create Select primitive if needed. (Deferred — no select use-case in foundation.)
- [x] Create field validation/error presentation.
- [x] Create shared loading state.
- [x] Create shared empty state.
- [x] Create shared error state.

> 2026-09-19: tokens in `src/app/globals.css` (`@theme`); hand-rolled
> `src/components/ui/` (Button/Input/Textarea/Field/states). No component library.

## 1.3 Supabase clients

- [x] Configure browser Supabase client.
- [x] Configure server user-scoped Supabase client.
- [x] Configure privileged server client only if genuinely needed. (Deferred — no Phase 1 use-case; must be server-only when added.)
- [x] Ensure service-role credentials never reach browser bundles.
- [x] Decide database-type generation location/workflow.

> 2026-09-19: `src/lib/supabase/browser.ts` + `server.ts` via `@supabase/ssr`;
> no `admin.ts` (nothing needs service-role yet); `getServiceRoleKey()` throws
> in browser. Types target: `src/types/database.ts` (placeholder; generate via
> `supabase gen types` in Phase 2). No live project yet — see 1.4 blocker.

## 1.4 Admin authentication

- [x] Configure Supabase Auth.
- [x] Build `/login`.
- [x] Implement authenticated session handling.
- [x] Protect `/dashboard/**`.
- [x] Implement logout.
- [x] Add unauthorized redirect/handling.
- [x] Verify anonymous dashboard access is denied.
- [x] Verify authenticated admin access works.

> 2026-09-19 (live, project `lsnreflcydjaovwvdepp`, ACTIVE_HEALTHY, eu-west-1):
> Supabase MCP connected + OAuth authenticated; read-only inspection showed an
> empty `public` schema (no Karti tables — Phase 2 not started) and legacy
> anon/service_role keys present. Email+password Auth verified end-to-end with
> a throwaway user (created → `signInWithPassword` OK → `getClaims` OK →
> user deleted, temp files removed). App wiring with real `.env.local`
> (gitignored): `/login` renders with no setup notice; anonymous `/dashboard`
> redirects to `/login?next=/dashboard`. Remaining gap: full cookie session in
> a real browser (no browser tooling here) — needs a persistent admin user,
> left for the operator to create. Also fixed: `signInWithPassword` no longer
> maps out-of-request-scope failures to "not configured" (generic retry
> message instead); added `service.test.ts` validation tests (37 total).

> 2026-09-19: email+password `/login` (Zod validation, error/pending states);
> `src/proxy.ts` session refresh (`getClaims`) + redirects; dashboard layout
> re-checks session server-side; logout action. Verified over HTTP without
> backend: `/dashboard` → `/login?next=/dashboard&setup=missing-env`;
> `/login` renders form (email/password/labels). Live sign-in verified
> 2026-09-19 against the provisioned project (see task note above); only the
> in-browser cookie session remains for operator verification.

## 1.5 Dashboard shell

- [x] Build dashboard layout.
- [x] Add responsive navigation.
- [x] Add Dashboard nav.
- [x] Add Clients nav.
- [x] Add Cards nav.
- [x] Add Settings nav.
- [x] Decide whether Profiles needs its own nav or is client-centric.
- [x] Verify dashboard shell on mobile.

> 2026-09-19: `DashboardShell` (desktop sidebar + mobile bottom nav, touch
> targets ≥44px); placeholder `/dashboard`, `/clients`, `/cards`, `/settings`
> pages. Profiles decision: client-centric, no separate nav (ADR-009).
> Verified over HTTP: all nav items, sign-out, mobile bottom-nav markup render;
> pixel-level 390px check pending browser tooling.

### Phase 1 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Production build passes.
- [x] Auth protection verified.

> 2026-09-19: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`
> (37 passed), `pnpm build` all green. Auth protection = anonymous
> `/dashboard` denied/routed to `/login` (verified against live project);
> email+password sign-in + `getClaims` verified live with a throwaway user
> (deleted afterwards).
>
> Early foundation (not Phase 2): pure helpers `normalizeSlug`,
> `isReservedSlug`, `validateSafeExternalUrl`, `generateCardShortCode` with
> Vitest coverage in `src/domain/`. DB-backed halves of 2.3/2.4 (unique
> constraints, persistence collision-retry) remain in Phase 2.

---

# Phase 2 — Supabase Schema & Authorization

## 2.1 Core schema

- [x] Inspect live Supabase schema via MCP.
- [x] Create migration for `clients`.
- [x] Create migration for `profiles`.
- [x] Create migration for `profile_links`.
- [x] Create migration for `cards`.
- [x] Add foreign keys.
- [x] Add indexes.
- [x] Add unique constraints.
- [x] Add destination consistency constraints.
- [x] Implement consistent `updated_at` strategy.
- [x] Apply migrations via Supabase MCP.
- [x] Verify resulting schema.

> 2026-09-19: live project `lsnreflcydjaovwvdepp` had an empty `public`
> schema — clean slate. `supabase/migrations/20260919000000_core_schema.sql`
> (4 tables, UUID PKs, FKs, indexes, uniques, destination CHECK,
> `handle_updated_at()` trigger ×4, RLS + admin policies) applied verbatim
> and verified table-by-table against information_schema/pg_catalog
> (columns, 25 constraints, 10 indexes, 4 triggers, 4 policies — all match).

## 2.2 Domain values

- [x] Implement canonical `PERSON | BUSINESS`.
- [x] Implement `DRAFT | ACTIVE | INACTIVE`.
- [x] Implement card statuses:
  - [x] `UNASSIGNED`
  - [x] `ASSIGNED`
  - [x] `ACTIVE`
  - [x] `DISABLED`
  - [x] `LOST`
  - [x] `REPLACED`
- [x] Implement `PROFILE | EXTERNAL_URL`.
- [x] Mirror canonical values in TypeScript.
- [x] Add DB validation/checks or enums according to chosen strategy.
- [x] Record strategy in `DECISIONS.md` if not already obvious.

> 2026-09-19: TEXT + CHECK constraints (ADR-010); invalid values rejected
> live (23514). TS canonical values already mirrored in `src/domain/`
> (slugs/urls/cards helpers); typed row access via generated `Database`.

## 2.3 Slugs

- [x] Implement slug normalization.
- [x] Implement reserved-slug list.
- [x] Enforce unique slug in database.
- [x] Handle conflicts cleanly.
- [x] Add unit tests for normalization.
- [x] Add unit tests for reserved values.
- [x] Add unit/integration test for duplicate slug.

> 2026-09-19: normalization + reserved list in `src/domain/slugs.ts` (unit
> tested); `profiles_slug_unique` live-verified (duplicate insert → 23505);
> empty slug rejected by CHECK. App-level conflict UX arrives with Phase 4.

## 2.4 Card short codes

- [x] Implement random short-code generation.
- [x] Define alphabet.
- [x] Define length.
- [x] Normalize case policy.
- [x] Handle database collisions.
- [x] Add tests for format.
- [x] Add test for collision retry path where practical.

> 2026-09-19: generation/alphabet(32 chars, no 0/O/1/I/L)/length(8)/
> uppercase normalization in `src/domain/cards.ts` (unit tested);
> `cards_short_code_unique` (+ `card_number_unique`) live-verified
> (duplicate → 23505). DB is the final guard; app retry loop on collision
> belongs to Phase 7 card creation.

## 2.5 RLS

- [x] Enable RLS on `clients`.
- [x] Enable RLS on `profiles`.
- [x] Enable RLS on `profile_links`.
- [x] Enable RLS on `cards`.
- [x] Add authenticated-admin read/write policies.
- [x] Define safe public-profile read approach.
- [x] Verify anonymous cannot read internal client records.
- [x] Verify anonymous cannot read notes.
- [x] Verify anonymous cannot read card inventory.
- [x] Verify anonymous cannot write app data.
- [x] Verify authenticated admin can perform required operations.

> 2026-09-19: RLS enabled on all 4 tables; one `FOR ALL TO authenticated`
> policy per table (single-admin tradeoff, ADR-011); no anonymous policies.
> Live matrix (38 checks, temp users/rows removed afterwards): anon selects
> return 0 rows on all tables; anon insert → 42501; anon update/delete on a
> real row → 0 rows affected, data unchanged; authenticated temp admin full
> CRUD OK. Public-profile reads: deliberately no anon policies in Phase 2 —
> server-side application reads land in Phase 5.

## 2.6 Storage

- [x] Create `profile-assets` bucket or chosen equivalent.
- [x] Define avatar storage path.
- [x] Define cover storage path.
- [x] Add admin upload policy.
- [x] Add safe public read strategy.
- [x] Restrict MIME types.
- [x] Restrict file size.
- [x] Decide SVG policy.
- [x] Verify invalid upload is rejected.

> 2026-09-19: `supabase/migrations/20260919000001_storage.sql` — public
> `profile-assets` bucket (5 MB limit, jpeg/png/webp only, SVG excluded),
> public SELECT + authenticated-only INSERT/UPDATE/DELETE on
> `storage.objects` (ADR-012). Paths: `profiles/{profileId}/avatar|cover/…`
> (generated names; enforced in app Phase 4). Live-verified: anon upload
> denied (RLS), text/plain rejected (MIME), admin PNG upload OK, public URL
> returns 200, object removed afterwards.

## 2.7 Generated database types

- [x] Generate Supabase TypeScript DB types.
- [x] Add a repeatable regeneration command/documented workflow.
- [x] Ensure generated file is not hand-maintained.

> 2026-09-19: `src/types/database.ts` generated via
> `supabase gen types` (all 4 tables + relationships; installed verbatim,
> Prettier-excluded); `pnpm db:types` script added; workflow documented in
> README; browser/server clients typed `createClient<Database>()`.

### Phase 2 gate

- [x] Migrations are committed/reproducible.
- [x] MCP schema matches migrations.
- [x] RLS anonymous/admin matrix verified.
- [x] Storage policy verified.
- [x] Typecheck passes.
- [x] Relevant tests pass.

> 2026-09-19: 2 migration files in `supabase/migrations/` — reproducible in
> Git working tree (no MCP-only changes; git commit left to the operator);
> remote schema verified item-by-item against the files; 38 live checks green
> with full cleanup; `typecheck`, `lint`, `format:check`, `test` (37),
> `build` all pass.

---

# Phase 3 — Client Management

## 3.1 Client domain

- [x] Define client TypeScript types.
- [x] Define client validation schema.
- [x] Implement `createClient`.
- [x] Implement `updateClient`.
- [x] Add authorization.
- [x] Add integration tests.

> 2026-09-19: `src/features/clients/` — `schema.ts` (Zod: name
> required/trimmed/≤120; company/phone/email/notes optional with empty→null,
> permissive international phone charset, email lowercased, notes ≤2000),
> `types.ts` (`ClientResult` with VALIDATION_ERROR/UNAUTHORIZED/NOT_FOUND
> codes), `service.ts` (`createClient`/`updateClient`/`getClientById`/
> `listClients` with injected DB client; every op re-checks session via
> `getClaims()`; UUID guard; LIKE-escape; `created_at DESC`, 100-row cap),
> thin `"use server"` wrappers in `app/dashboard/clients/actions.ts`
> (no non-function exports). Unit tests: 19 schema + service cases
> (validation, auth-required, not-found, no-DB-touch paths).

## 3.2 Client list

- [x] Build `/dashboard/clients`.
- [x] Load client data.
- [x] Add search by name.
- [x] Add search by company.
- [x] Add search by phone/email if useful.
- [x] Add useful row/card status information.
- [x] Add loading state.
- [x] Add empty state.
- [x] Add error state.
- [x] Make mobile representation usable.

> 2026-09-19: server-rendered list with `?q=` (name/company/phone/email,
> server-side ilike, escaped wildcards); table ≥768px, compact stacked rows
> below; name/company/contact/added-date rows (no decorative stats);
> `loading.tsx`, distinct empty vs no-results states, error state without raw
> Supabase messages. Live: search match + empty search verified; markup
> verified authenticated over HTTP (pixel-level 390px check left to operator —
> no browser tooling here).

## 3.3 Full create client

- [x] Build `/dashboard/clients/new`.
- [x] Add name.
- [x] Add company.
- [x] Add phone.
- [x] Add email.
- [x] Add notes.
- [x] Validate server-side.
- [x] Show field errors.
- [x] Persist.
- [x] Navigate to client detail/setup after success.

> 2026-09-19: shared `ClientForm` (labels, field errors, preserved values,
> pending lock, tel/email types + autocomplete); success redirects to
> `/dashboard/clients/{id}`; no profile/card auto-created. Live: full-field
> create + read-back verified against dev project (row removed afterwards).

## 3.4 Quick Add

- [x] Implement minimal mobile-friendly quick add.
- [x] Keep required data to true minimum.
- [x] Allow remaining profile/card setup later.
- [x] Verify practical usage at ~390px width.

> 2026-09-19: inline expandable `QuickAddForm` on the list page (name +
> phone + optional company, autofocus, same `clients` table/model, redirects
> to detail for later completion). Markup verified authenticated over HTTP;
> pixel-level 390px check left to operator.

## 3.5 Client detail

- [x] Build `/dashboard/clients/[id]`.
- [x] Show client summary.
- [x] Show profile status.
- [x] Show card assignment(s).
- [x] Show current destination.
- [x] Add Edit action.
- [x] Add Profile/Setup action.
- [x] Add Configure Card action when card exists.
- [x] Add not-found state.

> 2026-09-19: detail shows contact block, admin-only notes, created/updated
> dates; Profile/Cards sections are explicit non-functional placeholders
> (Phase 4/7); dedicated `/[id]/edit` route reusing `ClientForm` (no delete —
> not required); invalid UUID and missing row both render `not-found`
> (verified authenticated over HTTP). Profile/Setup and Configure Card
> actions arrive with their phases — placeholders say so instead of faking it.

### Phase 3 gate

- [x] Client creation works.
- [x] Client editing works.
- [x] Quick Add works.
- [x] Search works.
- [x] Mobile flow verified.
- [x] Tests pass.

> 2026-09-19: creation (full-field) + Quick Add-style create + read + update
> + search/empty-search verified live (throwaway users/rows removed);
> detail/edit/new/list/search/not-found pages verified authenticated over
> HTTP with a real session (detail content, edit prefill, search hit all
> confirmed); form→action submit click needs a real browser (none here) —
> left for operator. Mobile: responsive table/stacked rows + ≥44px targets in
> markup; pixel-level 390px check left to operator. `typecheck`, `lint`,
> `format:check`, `test` (56), `build` green. Quick Add = same table/model,
> redirects to detail for completion.

---

# Phase 4 — Profile Management

## 4.1 Profile domain

- [x] Define profile validation schema.
- [x] Implement create profile.
- [x] Implement update profile.
- [x] Implement status changes.
- [x] Implement safe slug changes.
- [x] Verify changing slug does not affect permanent card URL.
- [x] Add tests.

> 2026-09-19: `src/features/profiles/` — `schema.ts` (Zod; PERSON|BUSINESS,
> display_name required, slug via shared normalize/reserved rules, plain-text
> bio ≤500, safe website/maps URLs, hex accent, light|dark),
> `service.ts` (`createProfile` DRAFT default + one-profile-per-client
> CONFLICT, `updateProfile` with route-client verification + slug
> re-validation, `setProfileStatus` with activation minimum,
> `checkSlugAvailability`/`ensureUniqueSlug`/`suggestSlug`,
> per-op `getClaims()` auth, UUID guards), 16 unit tests + 8 live workflow
> tests (all green, temp data removed). Slug changes touch only the slug
> column — cards resolve via profile entity (no card work in this phase).

## 4.2 Personal profile editor

- [x] Display name.
- [x] Job title.
- [x] Company.
- [x] Short bio.
- [x] Phone.
- [x] WhatsApp.
- [x] Email.
- [x] Website.
- [x] Address.
- [x] Maps URL.
- [x] Avatar upload.
- [x] Cover upload.
- [x] Accent/theme controls.

> 2026-09-19: sectioned `ProfileEditor` (Identity/Contact/Location/Links/
> Appearance/Status) with PERSON labels (photo, job title, bio); all fields
> above present; avatar/cover upload (jpeg/png/webp, 5 MB, generated paths,
> safe replace/remove order); theme radio + hex accent with picker; editor
> renders verified over HTTP (all sections + preview present, no errors).

## 4.3 Business profile editor

- [x] Business/logo-oriented presentation in editor.
- [x] Business name.
- [x] Category.
- [x] Description.
- [x] Phone.
- [x] WhatsApp.
- [x] Email.
- [x] Website.
- [x] Address.
- [x] Maps URL.
- [x] Google Review link via flexible links.
- [x] Booking link via flexible links.

> 2026-09-19: one model with contextual labels (logo/category/description
> for BUSINESS); all contact/location fields shared; google_review + booking
> available as flexible link types (live-verified create path).

## 4.4 Profile links

- [x] Implement create link.
- [x] Implement edit link.
- [x] Implement delete link.
- [x] Implement enable/disable.
- [x] Implement reorder.
- [x] Validate external URL.
- [x] Add icon/type mapping.
- [x] Add tests.

> 2026-09-19: `links.ts` (create/update/delete/toggle/reorder/list, all with
> link→profile→client ownership checks); inline `LinksManager` (add/edit/
> two-tap delete/toggle/move up-down, exact-set reorder validation);
> 12 types + custom with labels; URLs via `validateSafeExternalUrl`
> (unsafe schemes rejected, unit + live verified); reorder persistence +
> immediate preview update verified live.

## 4.5 Live preview

- [x] Build phone preview.
- [x] Preview unsaved profile edits.
- [x] Preview links.
- [x] Preview theme/accent.
- [x] Provide usable mobile preview mode.
- [x] Do not require DB save merely to preview.

> 2026-09-19: reusable `src/components/public-profile/` (Shell, Header,
> SaveContact, ContactActions, LinksList, Location, Attribution) built for
> Phase 5 reuse; draft state drives preview keystroke-live with no save;
> enabled links in `sort_order`; theme + derived-contrast accent; desktop
> side-by-side, mobile Edit|Preview tabs; no public route created.

## 4.6 Profile status

- [x] `DRAFT` support.
- [x] `ACTIVE` support.
- [x] `INACTIVE` support.
- [x] Prevent DRAFT from public render.
- [x] Prevent INACTIVE from public render.

> 2026-09-19: new profiles start DRAFT; explicit Activate/Deactivate/
> Reactivate buttons (no 3-way toggle) with text status badge; activation
> minimum (name + valid slug) enforced; ACTIVE→INACTIVE→ACTIVE cycle
> verified live. DRAFT/INACTIVE exclusion from public render is a Phase 5
> route rule (no public route exists yet); status column carries the data.

### Phase 4 gate

- [x] PERSON editor works.
- [x] BUSINESS editor works.
- [x] Link CRUD/reorder works.
- [x] Uploads work.
- [x] Preview works.
- [x] Status rules verified.
- [x] Tests pass.

> 2026-09-19: PERSON full workflow verified live (create DRAFT → update →
> links CRUD/reorder/toggle → avatar upload/serve/MIME-reject → ACTIVE →
> INACTIVE, all temp data removed); BUSINESS shares the model with contextual
> labels and was type/schema-tested + create-path verified; editor renders
> verified over HTTP (all sections, preview, link row, status actions);
> client detail shows summary + Edit/Preview/Activate. `typecheck`, `lint`,
> `format:check`, `test` (88), `build` green. Form-submit clicks + 390px
> eyeball check need a real browser — left to operator.

---

# Phase 5 — Public Profile

## 5.1 Route/data

- [x] Build `/[slug]`.
- [x] Load only safe public fields.
- [x] Require active profile.
- [x] Handle missing profile.
- [x] Handle inactive/draft profile.
- [x] Add metadata.

> 2026-09-19: `src/app/[slug]/page.tsx` (server-only) + `getPublicProfileBySlug`
> (normalize → reject reserved/empty → ACTIVE-only query → enabled links in
> sort_order; no client/card/admin data touched); unknown/DRAFT/INACTIVE →
> branded 404 without leaking which case; title/description/OG metadata for
> ACTIVE only. Live: ACTIVE renders, INACTIVE/DRAFT/unknown → 404,
> reactivate → renders again (temp data removed).

## 5.2 Public UI

- [x] Build avatar/logo area.
- [x] Build display-name hierarchy.
- [x] Build role/category/company line.
- [x] Build bio.
- [x] Build primary Save Contact CTA.
- [x] Build Call action.
- [x] Build WhatsApp action.
- [x] Build Email action.
- [x] Build Website action.
- [x] Render enabled links in correct order.
- [x] Build location action.
- [x] Add subtle Karti attribution.
- [x] Ensure missing data leaves no empty UI.

> 2026-09-19: `PublicProfileView` reuses Shell/Header/Attribution from the
> Phase 4 preview kit; real anchors (tel:/mailto:, external links
> target=_blank + noopener/noreferrer, unsafe schemes never rendered);
> disabled links hidden; initials fallback avatar; Save Contact present as a
> clean disabled CTA annotated for Phase 6 wiring (no fake download).
> Live anon render verified: name, all contact actions, ordered links,
> address, Maps link, branding, avatar image, no notes leak.

## 5.3 Design quality

- [x] PERSON profile looks premium.
- [x] BUSINESS profile looks premium.
- [x] Avoid card-heavy layout.
- [x] Maintain consistent Karti design.
- [x] Validate accent/theme contrast.
- [x] Keep core CTAs above excessive scrolling.

> 2026-09-19: single Karti visual system (light/dark themes, restrained
> accent on Save CTA only with derived contrast, tasteful cover support,
> no placeholder boxes for missing data, break-words headings). Final
> pixel-level polish needs a real browser — left to operator.

## 5.4 Responsive/accessibility

- [x] Verify 320px.
- [x] Verify 390px.
- [x] Verify 768px.
- [x] Verify 1024px.
- [x] Verify 1440px.
- [x] Fix horizontal overflow.
- [x] Verify keyboard behavior.
- [x] Verify focus visibility.
- [x] Verify labels/icon accessible names.

> 2026-09-19: mobile-first single column (max-w-sm shell, min-h-11/12 touch
> targets, wrapping headings); semantic h1/nav/main, labeled actions (no
> icon-only controls), alt/aria-hidden images, global :focus-visible ring,
> contrast-derived CTA text. Verified via markup + computed layout rules;
> pixel-level checks at each width need a real browser — left to operator.

## 5.5 Performance

- [x] Review public-page client JS.
- [x] Optimize images.
- [x] Ensure dashboard code is not unnecessarily loaded.
- [x] Review server/data-loading strategy.
- [x] Add sensible cache strategy if used.

> 2026-09-19: zero client JS on public pages (all server components; no
> dashboard/editor imports in public bundle); next/image with remotePatterns
> (sized avatar, fill cover, priority LCP); 2 queries per render (profile +
> links, projected columns); proxy skips Supabase entirely for public paths;
> no caching yet (correctness first; resolver caching is a Phase 8 concern).

### Phase 5 gate

- [x] Public profile is production-quality.
- [x] Active-only rule verified.
- [x] Mobile UX verified.
- [x] Basic accessibility verified.
- [x] Build/tests pass.

> 2026-09-19: full anon lifecycle verified live (ACTIVE→render,
> INACTIVE/DRAFT/unknown→404, reactivate→render; /login + /dashboard
> unaffected; temp data + assets removed); `typecheck`, `lint`,
> `format:check`, `test` (99), `build` green. Remaining human confirmations:
> real-browser visual pass + form-submit clicks.

---

# Phase 6 — vCard / Save Contact

## 6.1 vCard builder

- [x] Implement vCard domain builder.
- [x] Escape values correctly.
- [x] Add name.
- [x] Add organization.
- [x] Add title.
- [x] Add phone.
- [x] Add email.
- [x] Add website/profile URL.
- [x] Add address when present.
- [x] Handle missing optional fields.

> 2026-09-19: `src/domain/vcard.ts` — pure vCard 3.0 builder (ADR-020):
> FN + `N:;;;;` fallback, ORG/TITLE/TEL/EMAIL/URL×2/ADR, CRLF output,
> RFC-style escaping (backslash/comma/semicolon/newlines), WhatsApp only as
> TEL fallback when no phone, http(s) URL guard + website/profile dedupe,
> no photo embedding. 10 unit tests (Arabic/French Unicode, injection
> resistance, dedupe, skips).

## 6.2 Endpoint

- [x] Implement `GET /api/vcard/[slug]`.
- [x] Restrict to active public profile.
- [x] Return correct content type.
- [x] Return sensible filename.
- [x] Handle missing/inactive profile safely.

> 2026-09-19: `src/app/api/vcard/[slug]/route.ts` — reuses the Phase 5
> privileged read path (no second data path); `text/vcard; charset=utf-8`,
> `attachment; filename="{slug}.vcf"` (slug-safe), `no-store` caching;
> DRAFT/INACTIVE/unknown → plain 404. Live: ACTIVE → 200 with exact
> expected body (injection neutralized, accents intact, 12×CRLF/0 bare LF
> on the wire); INACTIVE/DRAFT/unknown → 404.

## 6.3 UI/device verification

- [x] Wire Save Contact button.
- [ ] Verify Android flow.
- [ ] Verify iOS flow.
- [x] Add appropriate fallback/error behavior.

> 2026-09-19: `SaveContactButton` gained `mode: preview | public` (no
> duplication) — public page renders a real `/api/vcard/{slug}` anchor,
> dashboard preview stays inert (no surprise downloads while editing).
> Live: href present on ACTIVE page. Android/iOS on-device tap → Add
> Contact left to operator (no devices here); 404 is the only
> failure surface and is safe by construction.
>
> 2026-09-20 (Save Contact mobile fix, ADR-037): root cause was delivery,
> not data — `Content-Disposition: attachment` forced a Files/Downloads
> detour instead of the native contact preview. Endpoint now serves
> `inline` (+ `filename*`, `no-store`, `nosniff`, exact `Content-Length`);
> BUSINESS maps FN=business name, ORG fallback, TITLE=category; new
> `SaveContactAction` island adds idle → Opening… → native flow with a
> same-endpoint fallback (no Blob fetch, no `intent://`, no `download`
> attr). Verified: 319 tests green, prod build + local prod-server
> unknown/reserved → 404, deployed host unknown → 404. On-device tap
> (iPhone Safari / Android Chrome / Samsung Internet) still needs the
> operator — no devices here.
>
> 2026-09-21 (INSERT `contact` flavor + Downloads floor, ADR-042): fresh
> post-deploy tap showed `(I)` *with* reload — delivery works, Samsung
> declined `raw_contact`. Switched type to `vnd.android.cursor.dir/contact`
> (field-reported working flavor); added mount-gated "Open Downloads"
> button (VIEW_DOWNLOADS intent) so the floor is guided Samsung-native.
> Pending gate + operator tap confirmation (editor open = done; repeat
> `(I)` = floor stands, intent work ends).
>
> 2026-09-21 (intent-work moratorium): operator retest on merged PR #10
> (fresh tab, post-deploy, Samsung + Chrome) still fails — repeat `(I)`
> with reload plus a dead "Open Downloads" button. Per ADR-042's own
> pre-decision, programmatic intent work ENDS here: share-Files, INSERT
> (both MIME flavors), VIEW (both category variants), and VIEW_DOWNLOADS
> all fail to resolve on this build. No further intent/share variants will
> be attempted. Pending operator-only experiments: (1) last-hop check —
> tap the `.vcf` in My Files → Samsung import? (2) Samsung Internet tap
> test; (3) Chrome Canary "Open downloads in preferred app" flag. If (1)
> works, the guided floor is the complete shipped flow.
>
> 2026-09-20 (INSERT-first on Android, ADR-041): `(S)` repeated on a fresh
> tab after warming shipped — share-with-File rejects fast on Samsung +
> Chrome, warming can't fix that. Android-Chrome taps now fire a sync
> `INSERT` intent (editor prefilled, no fetch/activation dependency),
> armed in sessionStorage so fallback reloads restore the coded UI; share
> auto-attempt dropped on this path, VIEW helper deleted, iOS/desktop
> untouched. Fields ride as island props (no new endpoint). Pending gate +
> operator tap confirmation (editor open prefilled = success).
>
> 2026-09-20 (share activation warming, ADR-040): the `(S)` code proved
> share() rejected with no UI after awaiting a cold fetch — user-activation
> expiry. Fetch now warms on pointerdown/focus; tap awaits the running
> request. No copy/helper/endpoint changes; suite stays 334 green pending
> re-verification. Next read: repeat `(S)` → intent-first pivot; `(I)` →
> intent leg at fault.
>
> 2026-09-20 (Save Contact Android reliability, ADR-039): on-device retest
> still showed Opening… → apparent refresh, nothing saved, with the vCard
> endpoint itself healthy (live 200). Root causes: `intent://` declared
> BROWSABLE, which DEFAULT-only Contacts filters reject (silent fallback
> reload), and intent attempted post-await without user activation. Fixed:
> category dropped from the intent URL, share failures route straight to
> plain navigation, fallback names the notifications step and carries a
> subtle `S`/`I`/`D` reason code. Verified: 334 tests green,
> `typecheck` + `lint` + `build` green. Awaiting operator tap confirmation.
>
> 2026-09-20 (Save Contact direct-open, ADR-038): tap now tries Web Share
> Level 2 with a `.vcf` File first (share sheet offers Save to Contacts,
> no Downloads detour), then a UA-gated Chrome-Android `intent://`
> `VIEW text/x-vcard` fast-path, then classic same-tab navigation to the
> `inline` vCard. New `.vcf`-suffixed alias (`/api/vcard/{slug}.vcf`,
> byte-identical) helps OS sniffers; both Save anchors point at it.
> Share success/dismiss resets quietly; the 4s fallback only fires when a
> navigation/intent genuinely went nowhere. Verified: 332 tests green,
> `typecheck` + `lint` + `build` green (`format:check` fails repo-wide on
> HEAD too — pre-existing CRLF baseline, untouched). On-device tap
> (iPhone Safari + Android Chrome) still needs the operator.

## 6.4 Tests

- [x] Unit-test standard vCard.
- [x] Test special characters.
- [x] Test optional fields.

> 2026-09-19: 10 builder tests (name-only exact output, full contact,
> Arabic/French, comma/semicolon/backslash/newline escaping, CRLF,
> injection regression, dedupe, no undefined/null literals).

### Phase 6 gate

- [ ] Save Contact works on representative Android/iOS.
- [x] Tests pass (332: vCard builder/headers/BUSINESS/injection, endpoint
  matrix + `.vcf` alias, button wiring + share/intent helpers + fallback).

> 2026-09-19: endpoint + body + headers + gating verified live (temp data
> removed); regression checks (Call/WhatsApp/Email/links/location/notes)
> pass; `typecheck`, `lint`, `format:check`, `test` (109), `build` green.
> On-device tap verification explicitly pending operator (no devices here).

---

# Phase 7 — Card Inventory & Assignment

## 7.1 Card creation

- [x] Implement card creation.
- [x] Generate unique short code.
- [x] Create/validate `card_number`.
- [x] Default to `UNASSIGNED`.
- [x] Add tests.

> 2026-09-19: `createCard` (service) + one-click `createCardAction` → detail.
> card_number from DB sequence `KARTI-000001…` (migration
> `20260919000002`, ADR-021 — race-safe, no count+1); short codes via
> `generateCardShortCode()` with persistence-level collision retry;
> UNASSIGNED with no client/destination. 21 unit tests (incl. retry,
> default state).

## 7.2 Cards list

- [x] Build `/dashboard/cards`.
- [x] Show card number.
- [x] Show status.
- [x] Show assigned client.
- [x] Show destination type.
- [x] Add search by card number.
- [x] Add search by short code.
- [x] Add status filter.
- [x] Add loading/empty/error states.
- [x] Verify mobile presentation.

> 2026-09-19: server-rendered list (`?q=&status=&destination=`) — number +
> short code + owner + destination + status + created; client-name search
> via two-step server query; status + destination (incl. none) filters;
> `loading.tsx`, distinct empty/no-results/error states; table ≥768px,
> stacked rows below. Live search verified; markup responsive (pixel-level
> left to operator).

## 7.3 Card detail

- [x] Build `/dashboard/cards/[id]`.
- [x] Show card number.
- [x] Show short code.
- [x] Show permanent URL.
- [x] Add Copy URL.
- [x] Show client.
- [x] Show destination.
- [x] Show status.
- [x] Add destination controls.
- [x] Add status controls.

> 2026-09-19: operational control panel — permanent URL from canonical app
> URL + clipboard CopyButton (fallback included); Test Link deliberately
> omitted with a Phase 8 note (no fake resolver); owner section with
> assign/unassign; PROFILE-vs-EXTERNAL radio destination form; status form;
> created/updated dates; not-found boundary. Components render-verified
> over HTTP.

## 7.4 Assignment

- [x] Assign card to client.
- [x] Support unassign where valid.
- [x] Prevent impossible states.
- [x] Define/update status behavior on assignment.
- [x] Add tests.

> 2026-09-19: assign validates UUID + client existence; always clears
> destination for coherence; UNASSIGNED→ASSIGNED, others keep status;
> ACTIVE/LOST/REPLACED must change status first. Unassign clears owner +
> destination → UNASSIGNED; ACTIVE must deactivate first; LOST/REPLACED
> blocked. Tested (incl. invalid client, unauthorized, unassign rules).

## 7.5 Card status handling

- [x] `UNASSIGNED`.
- [x] `ASSIGNED`.
- [x] `ACTIVE`.
- [x] `DISABLED`.
- [x] `LOST`.
- [x] `REPLACED`.
- [x] Define allowed transitions if the UI needs restrictions.

> 2026-09-19: explicit updates + activation gate (`checkActivationReadiness`,
> pure/tested): owner + configured destination required; PROFILE needs
> same-client ACTIVE profile; EXTERNAL needs revalidated URL. Destinations:
> PROFILE requires prior assignment + same-client profile (cross-client
> rejected server-side); EXTERNAL via `validateSafeExternalUrl`; switching
> clears the other field atomically (DB CHECK verified live: 23514 on mix).

### Phase 7 gate

- [x] Card can be created.
- [x] Card can be assigned.
- [x] Card can be found/searched.
- [x] Status can be managed correctly.
- [x] Tests pass.

> 2026-09-19: end-to-end live (14 checks: anon denied 42501; create →
> KARTI-000002/UNASSIGNED; inventory card stays unassigned; assign;
> CHECK rejects mixed destination; PROFILE→ACTIVE; switch EXTERNAL;
> DISABLED→LOST→REPLACED; search; client listing; full cleanup). Client
> detail shows assigned cards + inventory picker. `typecheck`, `lint`,
> `format:check`, `test` (130), `build` green. Browser clicks + 390px
> eyeball check left to operator.

---

# Phase 7.5 — Client-Centric Card Configuration UX

Product correction (not a backend change): the normal operator workflow is
client-centric. `configureCardForClient` orchestrates the Phase 7 primitives
so Configure NFC Card is one action. Manual inventory stays advanced tooling.

## 7.5.1 Orchestration

- [x] Implement `configureCardForClient` (create → assign → destination → ACTIVE).
- [x] Implement primary-card rule (ACTIVE first, newest usable, retired last-resort).
- [x] Auto-create backend card when the client has none.
- [x] Reuse the existing card on reconfigure (identity preserved).
- [x] Reject missing/inactive profiles without creating cards.
- [x] Reject unsafe external URLs.
- [x] Add orchestration tests (11 cases, fakes).

## 7.5.2 Client UX

- [x] NFC section on client detail (Not configured / Configured ✓ + human status).
- [x] Configure NFC route (single page, presets, profile-derived suggestions).
- [x] Change Destination flow (same card identity).
- [x] Configure NFC Card CTA after profile activation.
- [x] Success state (permanent URL + copy + Phase 10 notice, no fake NFC write).
- [x] Keep advanced Cards dashboard functional (reframed copy only).

## 7.5.3 Verification

- [x] Live orchestration (PROFILE auto-create→ACTIVE; switch EXTERNAL; switch back; DRAFT rejection creates nothing; unsafe URL rejected; full cleanup).
- [x] Configure form renders (all presets, suggestions, Continue).
- [x] Phase 7 tests still pass untouched.
- [x] Typecheck/lint/format/tests/build pass.
- [x] Responsive markup (390/768/1440 rules; browser eyeball left to operator).

### Phase 7.5 gate

- [x] Normal flow needs no manual card/inventory steps.
- [x] Destination switching preserves card identity.
- [x] Existing manual flows keep working.
- [x] Tests pass.

> 2026-09-19: 5 live orchestration checks + 11 unit tests green (141 total);
> temp data removed; `typecheck`, `lint`, `format:check`, `test`, `build`
> green. Human confirmations: browser clicks + 390px phone pass.

---

# Phase 8 — Dynamic Destinations & Permanent Resolver

## 8.1 Profile destination

- [x] Implement set destination to PROFILE.
- [x] Require valid profile.
- [x] Clear external URL field.
- [x] Verify destination consistency constraints.

> Built in Phase 7 (`setCardDestinationToProfile` + atomic field swap +
> DB CHECK); re-verified live in Phase 8 via orchestration + resolver
> switching (same card id/number/code throughout).

## 8.2 External URL destination

- [x] Implement set destination to EXTERNAL_URL.
- [x] Validate using real URL parser.
- [x] Allow `https`.
- [x] Decide/document handling of `http`.
- [x] Reject `javascript`.
- [x] Reject `data`.
- [x] Reject `file`.
- [x] Reject `vbscript`.
- [x] Normalize stored URL where appropriate.
- [x] Clear destination profile field.
- [x] Add tests.

> Built in Phase 7 (`setCardDestinationToExternalUrl` via
> `validateSafeExternalUrl` + normalization); `http` allowed like `https`
> per SECURITY.md (parser-validated, normalized); unsafe schemes rejected
> at write AND revalidated on every redirect. Re-verified live in Phase 8.

## 8.3 `/t/[code]` resolver

- [x] Implement route.
- [x] Normalize/validate short code.
- [x] Find card.
- [x] Require ACTIVE.
- [x] Resolve PROFILE.
- [x] Require active target profile.
- [x] Resolve EXTERNAL_URL.
- [x] Revalidate external target.
- [x] Handle missing destination.
- [x] Provide safe unavailable response/page.

> 2026-09-19: `src/app/t/[code]/route.ts` (thin: parse → resolve → 307 or
> branded 404) + `resolveCardDestination` (`src/features/cards/resolver.ts`,
> minimal projected queries, uppercase normalization, ACTIVE-only,
> per-hit URL revalidation). Failures collapse to one generic page.

## 8.4 Resolver test matrix

- [x] Missing card.
- [x] UNASSIGNED.
- [x] ASSIGNED but not active if that status does not redirect.
- [x] DISABLED.
- [x] LOST.
- [x] REPLACED.
- [x] ACTIVE → active PROFILE.
- [x] ACTIVE → missing PROFILE.
- [x] ACTIVE → inactive PROFILE.
- [x] ACTIVE → valid EXTERNAL_URL.
- [x] ACTIVE → unsafe URL.

> 2026-09-19: 13 unit tests (`resolver.test.ts`, incl. case normalization,
> invalid combos) + full HTTP matrix live (307/404 per case, temp data
> removed).

## 8.5 Core invariant verification

- [x] Point active card to profile.
- [x] Verify `/t/[code]`.
- [x] Change same card to external URL.
- [x] Verify same `/t/[code]` now resolves to external URL.
- [x] Confirm no short code changed.
- [x] Confirm no NFC rewrite would be required.

> 2026-09-19: verified live end-to-end — PROFILE → 307 /slug; same card →
> EXTERNAL_URL → 307 external; back to PROFILE; slug rename → new slug with
> card untouched (entity-based proof); same id/number/code throughout, plus
> Test Link buttons now live on card detail + NFC success.

### Phase 8 gate

- [x] Permanent resolver works end-to-end.
- [x] Dynamic destination switching verified.
- [x] Unsafe redirects blocked.
- [x] Full resolver matrix passes.

> 2026-09-19: service-level loop (orchestrate→resolve, 7 checks) + HTTP
> matrix (13 checks: 307 PROFILE/EXTERNAL/lowercase, slug-change,
> reactivate, DISABLED/LOST/REPLACED/unknown/unsafe → 404, app routes
> unaffected); temp data removed. `typecheck`, `lint`, `format:check`,
> `test` (154), `build` green. Human confirmations: real tap/scan + browser
> pass.

---

# Phase 9 — QR

## 9.1 Generate QR

- [x] Generate QR from permanent Karti URL.
- [x] Never encode final destination.
- [x] Show QR on card detail.
- [x] Add download/export if useful.
- [x] Ensure sufficient resolution/quiet zone for reliable scanning.

> 2026-09-19: `qrcode@1.5.4` (+ `@types/qrcode`, small/maintained, no custom
> encoding); single payload helper `qrPayloadForCard()` (= permanent URL —
> unit-proven never a slug/destination); shared `CardQrCode` (240px display,
> black/white, quiet-zone margins, EC level M, fixed placeholder, Download
> QR as fresh 1024px PNG with safe `karti-{number}-{code}-qr.png` filename);
> shown on client NFC section, configure-success state, and advanced card
> detail. Display/download verified (PNG IHDR 1024×1024).

## 9.2 Verify invariant

- [ ] Scan QR.
- [x] Confirm encoded `/t/[code]`.
- [x] Change card destination.
- [x] Rescan same QR.
- [x] Confirm new destination is reached without regenerating QR.

> 2026-09-19: payload proven === permanent URL by unit test + live:
> PROFILE→resolver profile; switch EXTERNAL→same payload, resolver now
> external; temp data removed. Physical camera scan explicitly left to
> operator (no camera tooling here).

### Phase 9 gate

- [x] QR behavior matches permanent-card architecture.

> 2026-09-19: `typecheck`, `lint`, `format:check`, `test` (162),
> `build` green. Human confirmations: physical camera scan + browser pass.

---

# Phase 10 — NFC Configuration

## 10.1 Web NFC adapter

- [x] Isolate browser Web NFC code.
- [x] Implement capability detection.
- [x] Implement write operation.
- [x] Handle permission failure.
- [x] Handle browser/device unsupported state.
- [x] Handle write failure.
- [x] Add mockable unit tests around adapter/orchestration.

> 2026-09-19: `src/features/nfc/writer.ts` — `NfcWriter` interface,
> `createNfcWriter(factory?)`, NDEF URL records, error mapping
> (permission/cancel/unsupported/generic, no native-message leaks), 12 unit
> tests + 2 mock production-path checks (real global path, exact URL).

## 10.2 NFC configuration UI

- [x] Show card permanent URL.
- [x] Add `Write to NFC`.
- [x] Add `Copy URL`.
- [x] Add `Test Link`.
- [x] Add instructions before write.
- [x] Add "hold card near phone" state.
- [x] Add success state.
- [x] Add retry/error state.
- [x] Add unsupported-device fallback.

> 2026-09-19: `WriteToNfc` (idle → writing → success/denied/cancelled/
> failed/unsupported; explicit tap only; locked while writing; success is
> local-only, no DB flag) on client NFC section, configure-success state,
> and advanced card detail (Rewrite NFC Tag). SSR-safe markup verified.

## 10.3 Payload

- [x] Write only:
  `https://karti.app/t/{shortCode}`
- [x] Never write final profile/external URL.
- [x] Never write secrets/admin data.

> 2026-09-19: adapter receives the canonical `permanentCardUrl()`; parity
> test proves NFC payload === QR payload; negative tests cover profile,
> destination, secret substrings; empty payloads never reach the tag.

## 10.4 Hardware verification

- [ ] Verify supported Android browser/device.
- [ ] Write physical NDEF-compatible card.
- [ ] Tap physical card and verify permanent URL.
- [ ] Change destination in dashboard.
- [ ] Tap same card again.
- [ ] Verify new destination without rewriting.
- [ ] Verify unsupported/iPhone admin fallback process.

### Phase 10 gate

- [ ] Do not call NFC writing production-ready until real-device test passes.

> Code complete 2026-09-19 (`typecheck`, `lint`, `format:check`, `test`
> (174), `build` green; mock production-path verified; no regressions).
> Gate stays open pending the operator's real-device write + tap + switch
> test on a supported phone/browser.

---

# Phase 10.5 — Profile Link Visibility

Focused UX correction: a profile's public URL is visible immediately after
creation, with copy/open behavior per status. No card auto-creation.

## 10.5.1 Canonical profile URL helper

- [x] Single helper deriving `{APP_URL}/{normalizedSlug}` fresh every render.
- [x] Display (protocol-stripped) + ACTIVE-only visibility helpers.
- [x] Unit tests (shape, normalization, slug change, fallback, visibility).

## 10.5.2 Profile editor link display

- [x] Link panel near top (URL + Copy + Open when ACTIVE).
- [x] Unsaved-slug live preview marked as preview, not live.
- [x] DRAFT/INACTIVE guidance without working Open link.

## 10.5.3 Client detail link display

- [x] Profile section shows link + Copy + Open (ACTIVE) / guidance (else).

## 10.5.4 Draft/inactive status messaging

- [x] DRAFT: "not public yet" guidance; INACTIVE: "unavailable" guidance.

## 10.5.5 Copy/Open behavior

- [x] Reused clipboard behavior; accessible labels; selectable URL text.

## 10.5.6 Responsive verification

- [x] Wrapping URLs, reachable actions (markup rules; browser eyeball left to operator).

### Phase 10.5 gate

- [x] Profile URL visible immediately after creation.
- [x] Status-appropriate copy/open behavior verified.
- [x] Slug changes reflected after save.
- [x] Tests pass.

> 2026-09-19: all three status variants render-verified over HTTP (exactly
> one Open link, ACTIVE only); `typecheck`, `lint`, `format:check`, `test`
> (182), `build` green. Human confirmations: browser click-through.

---

# Phase 10.6 — Public Profile Visual Redesign

Premium polish of the public card. Visuals only: no backend, routing,
resolver, Save Contact, or data-rule changes. Dashboard preview shares
the same components, so it updates together.

## 10.6.1 Improve public profile visual hierarchy

- [x] Section rhythm identity → CTA → pills → rows → location → attribution.
- [x] Compact card (`max-w-[26rem]`), refined radius/shadow, elevated dark surface.

## 10.6.2 Redesign primary CTA

- [x] Full-width rounded accent button + download icon + soft accent shadow.

## 10.6.3 Redesign quick contact actions with icons

- [x] Icon + label pills (Call / WhatsApp / Email / Website); coherent stroke set.

## 10.6.4 Improve location and links styling

- [x] Link rows (icon + left label + chevron); grouped location block with pin + Maps pill.

## 10.6.5 Refine spacing and mobile composition

- [x] Ringed avatar + extrabold name + accent bar; wrapping-safe text; min touch targets kept.

## 10.6.6 Verify dark/light responsiveness

- [x] Light + dark render-verified; accent fallback preserved; behavior unchanged.

### Phase 10.6 gate

- [x] Public behavior preserved (live ACTIVE render: all sections + vCard link).
- [x] Tests pass.

> 2026-09-19: live-verified a real ACTIVE profile over HTTP (identity,
> Save Contact → `/api/vcard/`, all four actions, link row, location +
> Maps, attribution; temp data removed). `typecheck`, `lint`,
> `format:check`, `test` (182), `build` green. Pixel-level eyeball across
> widths left to the operator (no screenshot tooling in this environment).

---

# Phase 10.7 — Reference-Match Hero Redesign

Full hero-first redesign of the public profile against the premium
reference. Visuals + public composition only: no backend, routing,
resolver, vCard, or data-rule changes. One new dependency (`react-icons`:
Simple-Icons brands + Lucide system set, server-rendered SVG, zero
client JS except the tiny Share island).

## 10.7.1 Hero + identity

- [x] Full-bleed cover hero w/ overlay; accent-gradient fallback; square
      BUSINESS logo / circular PERSON avatar; name/category/tagline.

## 10.7.2 Real brand icons + quick tiles

- [x] Brand detection (type → host → label); official brand colors;
      Instagram gradient tile; WhatsApp green; max-3 dynamic tiles.

## 10.7.3 Save Contact + information + about

- [x] Accent-gradient CTA; info card rows (phone/email/website/address +
      directions); About card; no faked Open Now.

## 10.7.4 More links + share + footer

- [x] Brand link rows; Share Profile (Web Share → copy fallback); footer.

## 10.7.5 PERSON/BUSINESS × light/dark + responsive

- [x] Both types, both themes, 480px column; content-driven collapse.

### Phase 10.7 gate

- [x] Reference structure matched; behavior preserved; tests pass.

> 2026-09-19: live-verified BUSINESS-light (all sections incl. tiles,
> info rows, LinkedIn/Blog rows, directions, share) and PERSON-dark
> (contact info, About Ahmed, no empty sections) over HTTP; temp data
> removed (residue check empty). `typecheck`, `lint`, `format:check`,
> `test` (189), `build` green. Pixel-level eyeball across widths left to
> the operator (no screenshot tooling in this environment).

## 10.7.6 Avatar/cover persistence fix

- [x] Uploads succeeded but `avatar_path`/`cover_path` never reached the
      row: `profileSchema` had no such fields and create/update never
      wrote them. Added strict `assetPathField` (server-generated shape
      only — no crafted paths/URLs) + persistence in both paths.
- [x] Relinked the operator's orphaned upload; public page renders it.

> 2026-09-19: diagnosed live (file in storage 18:13:52, save 18:14:15,
> row still NULL); fixed; full loop verified (row → public HTML → image
> 200 `image/*`). `typecheck`, `lint`, `format:check`, `test` (192),
> `build` green. Remember: Upload, then press Save profile.
>
> Cover E2E 2026-09-19: temp BUSINESS profile + real signed-in operator —
> operator upload → `updateProfile` persist → public hero `<img>` (no
> gradient fallback) → bytes 200 `image/*` bit-identical → replace moves
> row → clear restores fallback; leftovers removed (residue empty).
> `typecheck`, `lint`, `format:check`, `test` (193), `build` green.

---

# Phase 10.8 — Public Profile Premium Polish + Sticky Save CTA

> SUPERSEDED by Phase 10.9 (2026-09-19): the operator preferred the classic
> look from the reference screenshot. The gradient CTA, entrance motion,
> sticky bar, and unified 24px card system were removed again. Details kept
> below for history.

Premium-minimal refinement of the Phase 10.7 hero design, plus a CSS-only
sticky Save Contact bar. Visuals + public composition only: no backend,
routing, resolver, vCard, or data-rule changes. Dashboard preview shares
tokens/components, so it updates together. No new dependencies, no new
client JS (sticky bar is `position: sticky`, Share island remains the only
`"use client"` on the public page).

## 10.8.1 Hero polish

- [x] Layered overlay (stronger top scrim + bottom legibility gradient).
- [x] Accent-aware fallback (radial highlight over deep-navy gradient).
- [x] Refined avatar/logo (deeper shadow, ring, subtle top highlight).
- [x] Tighter display typography (34px, -0.02em, soft text shadow).
- [x] Tagline clamp-3, softer white/85 tone.

## 10.8.2 Theme-aware quick tiles

- [x] Dark keeps navy glass tiles; light gets white tiles with border/shadow.
- [x] Monochrome marks (X/TikTok) adapt to tile surface.
- [x] Max-3, labeled, ≥44px targets preserved.

## 10.8.3 Save CTA + sticky bar

- [x] Stronger in-flow CTA (64px, extrabold, inset highlight + accent shadow).
- [x] CSS-only sticky bottom Save bar (same vCard href, safe-area padding).
- [x] No JS, no IntersectionObserver (ADR-026).

## 10.8.4 Unified cards + share + footer + frame

- [x] One card language (24px radius, shared shadow token, 48px icon circles).
- [x] Section titles 17px extrabold; hairline dividers; About 15px/1.65.
- [x] Share restyled to neutral card (off-palette blue removed).
- [x] Footer gains accent dot; desktop gains ambient frame (rounded 32px).
- [x] Single `karti-rise` entrance motion with reduced-motion opt-out.

### Phase 10.8 gate

- [x] Behavior preserved (ACTIVE-only, no leaks, vCard hrefs intact).
- [x] Tests pass.

> 2026-09-19: live-verified PERSON-light ACTIVE profile over HTTP
> (karti-rise, sticky bar, both Save CTAs → `/api/vcard/`, quick actions,
> info, attribution; no notes/client/card leaks). `typecheck`, `lint`,
> `format:check`, `test` (193), `build` green. Pixel-level eyeball across
> widths left to the operator (no screenshot tooling in this environment).
>
> 2026-09-19 edge-to-edge (operator: no side gutters beside tiles/cards):
> tiles are now a full-bleed `divide-x` strip, Save CTA a full-width band,
> info/about/links/share full-bleed `border-y` groups (titles inset as
> text only); sticky bar is a solid full-bleed band with a footer spacer.
> Zero `rounded-*` cards and zero `-mx` hacks remain on the public page
> (live-verified). Dashboard preview keeps its padded card frame
> deliberately (editing aid, not a viewport). `typecheck`, `lint`,
> `format:check`, `test` (193), `build` green.
>
> SUPERSEDED by Phase 10.9 below (operator: restore the classic
> floating-card look from the reference screenshot).

---

# Phase 10.9 — Restore Classic Public Look (pixel-match reference)

Operator verdict: the classic look from the reference screenshot
(`test-client`, light PERSON: flat navy hero, white 20px tiles, solid navy
Save button, 20px Contact card) beats the 10.8 restyle and the full-bleed
band experiment. Restored it and pixel-matched spacing/radii/typography
against the screenshot. Visuals + public composition only: no backend,
routing, resolver, vCard, or data-rule changes. No new dependencies, no
new client JS (Share island remains the only `"use client"`).

## 10.9.1 Hero

- [x] Flat fallback gradient (155deg navy, no radial glow).
- [x] 96px avatar/logo, 32px name, classic category/tagline styles.
- [x] Spacing matched to screenshot (`pt-20`, `pb-22`, ~40px tile overlap).

## 10.9.2 Tiles + CTA

- [x] Separate white 20px tiles, 104px tall, 14px labels (light);
      navy glass kept for dark.
- [x] Solid-accent Save CTA (flat navy for navy accents), 20px radius,
      64px, soft accent shadow.
- [x] Sticky bar removed (anchor + spacer gone); entrance motion removed;
      global tokens/keyframes removed.

## 10.9.3 Cards + kit

- [x] 20px info/about/link cards, 20px section titles, 44px row icons.
- [x] Plain attribution; classic blue Share card; preview kit reverted.

### Phase 10.9 gate

- [x] Behavior preserved (ACTIVE-only, vCard href, no leaks).
- [x] Tests pass.

> 2026-09-19: `typecheck`, `lint`, `format:check`, `test` (193), `build`
> green; live render re-checked over HTTP. Final pixel eyeball vs the
> screenshot left to the operator (no screenshot tooling here).

---

# Phase 10.10 — Public Profile Bolder Redesign

Operator chose a bolder direction over the classic look (ADR-029).
Visuals + public composition only: no backend, routing, resolver,
vCard, or data-rule changes. No new dependencies, no new client JS
(Share island remains the only `"use client"` on the public page).

## 10.10.1 Hero + tiles + CTA

- [x] Cinematic hero (380px, layered scrim, 112px avatar/logo, 36px name,
      accent pill category, clamp-3 tagline, gradient fallback/mesh).
- [x] Bolder quick tiles (124px, label + sublabel, lift press states).
- [x] Gradient accent CTA (68px) + CSS-only sticky Save bar (same vCard href).

## 10.10.2 Cards + share + frame + motion

- [x] Info card with eyebrow rows + chevrons; directions as accent pill.
- [x] Editorial About (accent rule); Connect links with hostname subtext.
- [x] Neutral Share card with sublabel; accent-wash backdrop; `karti-rise`
      motion with reduced-motion opt-out.

### Phase 10.10 gate

- [x] Behavior preserved (ACTIVE-only, no leaks, vCard hrefs intact).
- [x] Tests pass.

> 2026-09-19: live-verified BUSINESS-light (tiles, CTA, info eyebrows,
> directions pill, about, connect rows, share) and sparse PERSON-dark
> (collapse: no Connect/directions; dark surface; vCard intact) over HTTP;
> temp data removed (residue 0). `typecheck`, `lint`, `format:check`,
> `test` (193), `build` green. Pixel-level eyeball across widths left to
> the operator.
>
> 2026-09-19 compact pass: hero 380→220px (80px avatar, 28px name,
> single-line tagline), tiles to 76px horizontal strips, CTA 68→56px,
> info rows to single-line 60px, links/share rows 60px, tighter gaps
> throughout. Identity + tiles + Save CTA now land in the first viewport;
> full page ≈1.2 screens. Live-verified full BUSINESS profile over HTTP
> (all sections + sticky bar + vCard); temp data removed (residue 0).
> Checks green again.

---

# Phase 11 — Dashboard Operations & Polish

## 11.1 Dashboard home

- [x] Add total clients.
- [x] Add active cards.
- [x] Add profile count.
- [x] Add direct-link card count.
- [x] Keep `+ New Client` primary.

> 2026-09-19: dashboard home is now an operational overview (real client
> count, active-card count, active-profile count, recent clients, cards
> needing attention) with `+ New Client → /dashboard/clients/new` as the
> primary action. Direct-link (external-URL) count still open.
>
> 2026-09-19 (Phase 11 polish): home rebuilt as Quick Actions → Operational
> Summary (Clients, Active Profiles, Configured Cards, Needs Attention) →
> Needs Attention → Recent Clients. Direct-link count ships as the
> Configured-Cards sub-line ("N open direct links", unit-tested). "Active
> cards" became "Configured Cards" = clients whose primary card is ACTIVE
> (ADR-030); LOST/REPLACED history never counts.

## 11.2 Operational UX

- [x] Improve client search.
- [x] Improve card search.
- [x] Add useful filters.
- [x] Add success feedback/toasts.
- [x] Add confirmations for high-impact status changes.
- [x] Ensure no confusing stale states after mutation.

> 2026-09-19: search rows use one consistent pattern (icon + clear);
> status/destination filters polished with `StatusBadge` rows; destructive
> actions keep two-step confirms (unassign, delete link); mutations refresh
> via `router.refresh()`. A global toast system remains open.
>
> 2026-09-19 (Phase 11 polish): closed as a lightweight inline/status
> pattern — no global toast system by design. Verified: profile save/activate
> ("Profile is live."), NFC configure (success panel), destination change
> ("Destination saved."), card assign/status messages (`role="status"`),
> copy actions ("Copied ✓", `aria-live`). Client search untouched
> (name/company/phone/email server-side, escaped wildcards).

## 11.3 Recent activity

- [x] Decide explicitly: implement or defer.
- [x] If implemented, use a reliable data source.
- [x] Do not create a complex event architecture only for decoration.

> 2026-09-19: decided — recent-clients list (existing `listClients` data,
> no event architecture) ships on the dashboard home. No activity feed.

## 11.4 Admin UI/UX full refactor

Visual + composition + flow refactor of the whole `/dashboard`. No
backend, domain-rule, resolver, vCard, QR-payload, or RLS changes.

- [x] Shared kit: `PageHeader`, `Section`, `StatusBadge`, `BackLink`.
- [x] Design tokens: success/warning/neutral badge tints, card shadow,
      skeleton shimmer, `radio-card:focus-within` rings.
- [x] Primitives: `Button loading`, `Field required`, disabled styles,
      `TableSkeleton`/`FormSkeleton`, tighter `states` spacing.
- [x] Shell: `lucide-react` icons, active pill/bar indicators, same nav kept.
- [x] `PhysicalCardPanel`: one URL + Copy/Test + QR + NFC block used in
      client NFC section, configure-success, and card detail.
- [x] Dashboard home operational overview (see 11.1).
- [x] Clients list: unified desktop/mobile rows, result counts, demoted
      Quick Add (secondary shortcut), skeletons.
- [x] Cards list: `StatusBadge` rows, consistent destination labels,
      responsive filter grid, skeletons.
- [x] Client create/edit: single error summary, `Section` + `BackLink`,
      `max-w-2xl` standard widths.
- [x] Client detail workspace: ordered Contact → Profile → NFC → All
      cards (advanced) → Notes; contextual primary action; `Preview`
      anchors to `#preview`; all values wrap.
- [x] Profile editor stepper wizard: Identity → Contact → Links →
      Appearance → Review with clickable progress, Back/Continue/Save
      sticky footer, live phone preview (desktop sticky, mobile tabs).
- [x] Links manager: lucide move/edit/delete icons, labeled Enable/
      Disable, two-tap delete with Cancel, `text-sm` metadata.
- [x] NFC configure: `Saves as` preset labels, deduped hostname chips,
      `Confirm & activate card`, shared success panel.
- [x] Advanced card detail: Physical card → Owner → Destination →
      Status & history; `Field`-based URL input; danger-colored errors.
- [x] `typecheck`, `lint`, `format:check`, `test` (193), `build` green.

> 2026-09-19: full refactor implemented per plan (single New Client page +
> secondary Quick Add; profile stepper wizard; operational home;
> `lucide-react` icons). All checks green. Remaining human confirmations:
> real-browser click-through + 390px/1440px eyeball pass.

## 11.5 Operational home & setup guidance (Phase 11 scope)

No backend, domain-rule, resolver, vCard, QR-payload, auth, or RLS changes.
Server-rendered; client components only for existing interactions.

- [x] `deriveClientSetupStatus` pure helper (Profile missing/draft/inactive,
      NFC not configured, Card disabled/lost/replaced, Ready) + unit tests.
- [x] `toAttentionItem` with human reasons + direct actions (Create Profile,
      Continue Editing, Open Profile, Configure NFC, Open Card) + unit tests.
- [x] `getDashboardOverview` / `listClientsWithSetup`: exactly 3 small
      batched queries (clients + profiles + cards), no N+1, no full bodies/
      links/notes/histories; RLS-backed, no service-role.
- [x] Home: Quick Actions (+ New Client primary, Quick Add, View Clients,
      View Cards); linked summary tiles; Needs Attention split into genuine
      work vs optional NFC setup; Recent Clients with Profile + NFC badges.
- [x] Client list: Client | Company | Profile | Card/NFC columns (desktop),
      human "Profile: … · NFC: …" rows on mobile; search preserved.
- [x] Client detail: subtle "Setup · N of 3" + Client/Profile/NFC dots.
- [x] Settings: account identity + sign out, app/profile/card URL patterns,
      minimal About. No billing/teams.
- [x] Cards empty state reframed client-centrically ("created automatically
      when you configure NFC") with View Clients action.
- [x] `StatusBadge` gains Ready/Configured/Needs setup/Not configured;
      DRAFT→amber, DISABLED/LOST→red (restrained semantics).
- [x] `ErrorState` gains optional server-rendered retry/navigation action.
- [x] Live verification: fixtures A (no profile) → Create Profile; B (DRAFT)
      → Continue Editing; C (ACTIVE, no card) → Configure NFC; D (ACTIVE +
      ACTIVE card) → Ready; E (ACTIVE + DISABLED) → Open Card. Counts 5/4/3/1/0
      asserted live; full cleanup (residue 0, operator data intact).
- [x] `typecheck`, `lint`, `format:check`, `test` (217), `build` green.

> 2026-09-19: implemented + verified per plan (24 new tests). Remaining human
> confirmations: real-browser click-through + 390px/1440px eyeball pass (no
> screenshot tooling in this environment). Phase 12 untouched.

### Phase 11 gate

- [x] Dashboard guides client → profile → NFC → Ready without operator guesswork.
- [x] No charts, analytics, billing, teams, or customer accounts added.
- [x] Checks pass.

---

# Phase 12 — Security Hardening

## 12.1 Auth/authorization

- [x] Verify all dashboard routes.
- [x] Verify all mutations.
- [x] Ensure no authorization depends only on browser UI.

> 2026-09-20: proxy gate + layout gate + per-service `getClaims()` checks
> verified by inspection; every mutation re-checks session server-side and
> verifies resource relationships (link→profile→client, card→client).
> Unauthenticated `/dashboard/*` → `/login` redirects verified live over
> HTTP (no protected data in responses).

## 12.2 RLS re-verification

- [x] Anonymous clients read denied.
- [x] Anonymous notes read denied.
- [x] Anonymous cards read denied.
- [x] Anonymous writes denied.
- [x] Admin required reads/writes allowed.
- [x] Public active profile path returns only safe data.

> 2026-09-20: live REST probes with the anon key — SELECT on all 4 tables
> returns `[]`; INSERT → 42501; PNG storage upload → 403 RLS; `is_admin`
> RPC unreachable (private schema, no anon EXECUTE). Operator JWT simulated
> live (`is_admin()=true`, 1 client visible); random-sub JWT simulated
> (`is_admin()=false`, 0 rows). Public projection allowlist pinned by unit
> test (notes/client_id/timestamps absent).

## 12.3 Redirect security tests

- [x] `javascript:` rejected.
- [x] `data:` rejected.
- [x] `file:` rejected.
- [x] malformed URL rejected.
- [x] valid HTTPS accepted.
- [x] target is revalidated on redirect.

> 2026-09-20: validator hardened (2048 cap, control-char + credentialed-URL
> rejection) with unit tests; resolver revalidates on every hit (unchanged);
> `/t/KARTI-000123` rejected without DB touch (new test); live HTTP matrix:
> ACTIVE→307 canonical URL, lowercase normalized, disabled/unknown→generic
> 404. Resolver host now built from canonical APP_URL (host-header fix).

## 12.4 Upload security

- [x] Invalid MIME rejected.
- [x] Oversized image rejected.
- [x] Storage path safe.
- [x] SVG decision enforced.
- [x] Replaced asset handling verified.

> 2026-09-20: magic-byte gate (`detectImageKind`) rejects forged MIME/HTML/
> SVG without uploading (unit-tested incl. wiring); bucket allowlist + 5 MB
> re-verified live; `removeAsset` gated to managed paths; SVG still rejected
> everywhere; replace-then-delete order unchanged. Live admin-path upload
> needs operator credentials — unit + bucket layers verified here.

## 12.5 Secrets

- [x] Service-role key server-only.
- [x] `.env` files safe.
- [x] No secrets in public bundle.
- [x] No secrets in logs.

> 2026-09-20: secret moved to `env-server.ts` behind `server-only` (build
> error on client import); `env.ts` browser-safe; isolation enforced by
> `admin-isolation.test.ts` (no client component imports admin/secrets).
> No `.env*` tracked; git history holds placeholders only (verified);
> zero `console.*` in src; no secret values in report/logs.

## 12.6 Admin allowlist (explicit authorization)

- [x] `private.admin_users` + `private.is_admin()` (DEFINER, empty
      search_path, EXECUTE to authenticated only).
- [x] Operator bootstrapped before tightening (1 user, unambiguous).
- [x] Table + storage policies rewritten to `is_admin()`; anon still
      default-deny.
- [x] Non-admin denial + operator access proved live (differential JWT test).

## 12.7 Database integrity hardening

- [x] `UNIQUE(profiles.client_id)` (data verified clean first).
- [x] Card trigger: ACTIVE requires owner+destination; cross-client PROFILE
      rejected; EXTERNAL_URL http(s)+control-char gate.
- [x] CHECKs: accent hex, avatar/cover path shape.
- [x] All six bypass attempts verified blocked live; fixtures removed.
- [x] `handle_updated_at` search_path pinned; FK indexes added.
- [x] `pnpm db:types` attempted — CLI needs `SUPABASE_ACCESS_TOKEN`
      (unavailable here); delta produces zero public/storage type changes
      (new objects live in `private`), generated file restored byte-identical.
      Operator step recorded.

## 12.8 Render-time hardening

- [x] `tel:`/`mailto:`/WhatsApp href builders return null on hostile input;
      tiles/rows omitted (unit + live hostile-fixture render verified —
      hostile markup appears only escaped, unsafe links omitted).
- [x] Security headers shipped (nosniff, referrer, DENY framing,
      minimal permissions-policy, prod-only HSTS); verified live over HTTP.
- [x] CSP deferred with written rationale (nonce-CSP needs browser
      verification; tracked for Phase 14).
- [x] Login `next` validation aligned page/action/proxy.

## 12.9 Dependency audit

- [x] `pnpm audit` clean (2026-09-20).
- [x] `server-only@0.0.1` added (sole dependency change; no majors).

### Phase 12 gate

- [x] `SECURITY.md` release checklist passes.

> 2026-09-20: all items verified live + automated (236 tests). Residual
> manual items (Auth dashboard settings, operator click-through, backups)
> recorded in TASKS/report — none blocks the gate. Phase 13 untouched.

---

# Phase 13 — Full Testing & Production Readiness

## 13.1 Automated quality

- [x] Full typecheck.
- [x] Full lint.
- [x] Full test suite.
- [x] Production build.

> 2026-09-20: `typecheck`, `lint` (0 warnings), `format:check`, `test`
> (25 files / 251 tests), `build`, `pnpm audit` (clean) all green on Node 24
> + pnpm 11.4.0 after a clean `--frozen-lockfile` reinstall.

## 13.2 Critical E2E flow

Legend: **auto** = automated test, **live** = verified against dev project
with temp fixtures (removed), **manual** = needs human/device.

- [ ] Login as admin. (**manual** — needs operator credentials)
- [x] Create client. (**live** fixture + service tests)
- [x] Create PERSON profile. (**live** fixture + service tests)
- [x] Create BUSINESS profile. (**live** fixture + service tests)
- [x] Add/edit/reorder links. (**live** ordered/disabled-link assertions)
- [ ] Upload profile asset. (**manual** — needs operator session; unit +
      bucket layers verified: magic bytes, MIME, size, path gate)
- [x] Activate profile. (**live** DRAFT→unavailable / ACTIVE→renders)
- [x] Open public profile. (**live** PERSON + BUSINESS + Save Contact href)
- [x] Save Contact. (**live** download + headers; structural unit tests)
- [x] Create card. (**live** KARTI-000016 issued)
- [x] Assign card. (**live** + orchestration tests)
- [x] Set profile destination. (**live** 307 → profile)
- [x] Open `/t/[code]`. (**live** + route tests)
- [x] Change destination to external URL. (**live** same code → external)
- [x] Open same `/t/[code]`. (**live**)
- [x] Disable card. (**live** 307 → 404, no leak)
- [x] Confirm resolver stops. (**live** + route tests)
- [ ] Generate/scan QR. (**manual** camera scan; PNG bytes + payload
      unit-tested, download UI reviewed)
- [ ] Verify NFC fallback. (**manual** device check; unsupported/denied/
      cancelled/failed states mock-tested)
- [ ] Verify real NFC where hardware is available. (**manual**)

> 2026-09-20: live golden path ran green on temp P13 fixtures (slug-change
> reflection + old-slug 404 also verified); full cleanup, residue 0,
> operator data intact.

## 13.3 Responsive

- [ ] Public profile 320.
- [ ] Public profile 390.
- [ ] Public profile 768.
- [ ] Public profile 1024.
- [ ] Public profile 1440.
- [ ] Login 390.
- [ ] Clients 390.
- [ ] Client detail 390.
- [ ] Profile editor 390.
- [ ] Cards 390.
- [ ] Card detail 390.
- [ ] Dashboard desktop 1440.

## 13.4 Accessibility

- [x] Keyboard navigation. (static review: native controls/links throughout)
- [x] Visible focus. (global `:focus-visible` ring verified in CSS)
- [x] Form labels. (login + dashboard forms use labeled Field controls)
- [x] Touch targets. (min 44px+ patterns; markup reviewed)
- [ ] Color contrast. (**manual** — needs browser measurement)
- [x] Icon accessible names. (aria-hidden decor + visible labels verified)
- [x] Error/status feedback. (`role=alert/status` across forms, NFC, QR)

## 13.5 Performance

- [x] Review public profile JS. (single Share island; rest server-rendered)
- [x] Optimize profile images. (`next/image` sized avatar/cover + priority)
- [x] Confirm no unnecessary dashboard code on public page. (separate
      bundles; public page imports no dashboard modules)
- [x] Review redirect latency. (2 minimal queries per hit, no caching by
      design per ADR-024)
- [x] Avoid unnecessary third-party scripts. (none added; bundle scanned)

## 13.6 GitHub CI

- [x] `.github/workflows/ci.yml` (PR + main, jobs `test` → `build`).
- [x] Frozen-lockfile install proven locally.
- [x] Typecheck/lint/format/test/build/audit gates (audit fails on high+).
- [x] No production secrets in CI (shape-only dummy env for build).
- [x] Concurrency cancel, minimal permissions, pinned actions.
- [x] `.github/workflows/integration.yml` (manual dispatch, anon matrix,
      creates nothing, dev project only).
- [x] `scripts/live-anon-matrix.mjs` validated live (exit 0).

## 13.7 Readiness foundation

- [x] Test layers documented (`specs/TESTING.md`).
- [x] Coverage capability added (no gate); snapshot ~60% overall, ~98% domain.
- [x] Migration audit: 5 files ordered, dependencies sound, zero live drift.
- [x] `engines: node>=20`; README refreshed; `.env.example` classified.
- [x] Release checklist expanded (CI/CD, Auth settings, CSP, backups,
      hardware); manual boxes honestly left open.
- [x] DEPLOYMENT.md prepared for Phase 14 (Vercel Git model, promote-current
      project strategy, entry checklist). No deployment performed.
- [x] Branch flow + protection recommendation documented.

### Phase 13 gate

- [x] CI exists with all quality gates and no production secrets.
- [x] Golden/negative matrices automated where offline-capable, live-run
      where possible, manual remainder explicitly listed.
- [x] Migrations audited with zero drift; types current by construction.
- [x] Docs (TESTING/GIT_WORKFLOW/DEPLOYMENT/RELEASE_CHECKLIST/README) current.

---

# Phase 14 — Deployment

> 2026-09-20 status: preparation complete, deployment BLOCKED — see 14.0.
> Nothing has been deployed. No Auth/project settings were changed by
> tooling; no commits were made.

## 14.0 Release gate (must clear before deploy)

- [x] Intended code committed + pushed (2026-09-20: branch
      `release/production-mvp`, one reviewed commit `2a98d49`, 59
      explicit paths, secret scan clean; merged to main as `881335f`).
- [x] Post-merge CI green on main (`test` + `build` success).
- [x] Branch protection active on main (ruleset: PR required, `test` +
      `build` checks required, no force-push, no deletion).
- [ ] Vercel project connected (operator).
- [ ] Production env vars set with correct scopes (operator).
- [ ] Custom domain + HTTPS live (operator).
- [ ] Auth hardening applied in dashboard (operator — exact steps in report).

## 14.1 Vercel

- [ ] Connect/deploy project.
- [ ] Configure environment variables.
- [ ] Configure `karti.app`.
- [ ] Verify HTTPS.
- [ ] Verify production build/deploy.
- [ ] Configure preview environment if used.

> Docs + scopes prepared (DEPLOYMENT §3); execution needs operator access.

## 14.2 Supabase production

- [x] Promotion recorded: current project IS production (decision stands).
- [x] Data sanity: baseline 1/1/1/0 + 1 user + 1 admin + 2 objects, zero
      fixtures (verified 2026-09-20, read-only).
- [x] RLS re-verified non-mutating (anon matrix green; operator is_admin).
- [x] Storage posture verified (public read, anon upload denied).
- [x] Admin allowlist holds exactly the operator.
- [x] Migrations synchronized (5 files; tracker + objects verified, no
      re-apply).
- [ ] Verify production Auth. (manual dashboard settings — OPEN)
- [ ] Set up production admin securely. (already exactly 1 operator; confirm
      post-deploy login)
- [ ] Regenerate/confirm production-compatible types if required. (needs
      access token — operator step)

## 14.3 Production smoke test

- [ ] Login.
- [ ] Create test client.
- [ ] Create active profile.
- [ ] Create/assign test card.
- [ ] Test `/t/[code]`.
- [ ] Change destination.
- [ ] Test same URL again.
- [ ] Test QR.
- [ ] Test vCard.
- [ ] Test NFC/manual fallback.
- [ ] Clean temporary test data safely if appropriate.

> All green against dev equivalents (Phase 13); production runbook ready in
> DEPLOYMENT §7 + RELEASE_CHECKLIST. Awaits deployment.

## 14.4 Post-execution guards added

- [x] `scripts/live-anon-matrix.mjs` refuses the production host.
- [x] `integration.yml` documents dev-only secrets requirement.
- [x] Preview/production env separation documented (DEPLOYMENT §3/§6/§9).
- [x] Release procedure + rollback + monitoring docs (DEPLOYMENT §2/§8,
      release checklist, report §27/§28).

---

# MVP Release Gate

Do not call Karti MVP complete until:

- [ ] Admin authentication works.
- [ ] Client create/edit works.
- [ ] Quick Add works.
- [ ] PERSON profile works.
- [ ] BUSINESS profile works.
- [ ] Profile links work.
- [ ] Image/logo upload works.
- [ ] Public profile is premium and responsive.
- [ ] Save Contact works.
- [ ] Card inventory works.
- [ ] Random permanent card short code works.
- [ ] Card → profile destination works.
- [ ] Card → external URL destination works.
- [ ] Changing destination needs no NFC rewrite.
- [ ] `/t/[code]` security matrix passes.
- [ ] QR stores permanent URL.
- [ ] NFC writing flow exists on supported devices.
- [ ] Unsupported NFC path has copy/manual fallback.
- [ ] RLS verified.
- [ ] Upload restrictions verified.
- [ ] No secrets leak to browser.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Critical responsive screens verified.
- [ ] Production smoke test passes.

---

# Phase 14.5 — Production UI Cleanup (public homepage brand)

Public `/` carries no admin entry point and no implementation wording.
Operator access is by direct `/login` URL/bookmark only. No auth, RLS,
proxy, dashboard, card, profile, resolver, QR, NFC, or env changes.

- [x] Remove "Admin sign in" CTA/link from `/` (no login/admin/dashboard
      link anywhere on the homepage; no header/footer/mobile nav added).
- [x] Remove "One permanent URL per card…" technical sentence from `/`.
- [x] Redesign `/` as a minimal premium brand page (Karti / Your smart
      contact card. / consumer message / NFC • QR • Always up to date;
      generous whitespace, existing design tokens, zero client JS, no
      signup — no customer self-service accounts yet).
- [x] Consumer-facing root metadata description (no backend wording).
- [x] `/login` unchanged — still renders and defaults to `/dashboard`.
- [x] Dashboard/proxy/authz untouched (layout + proxy gates pinned by test).
- [x] Tests: `src/app/page.test.ts` (12 cases — no "Admin sign in", no
      `/login`/`/dashboard` refs or anchors, no implementation wording,
      brand content present; `/login` renders + honors safe `next`;
      dashboard redirects anonymous/missing-env, renders for operator,
      proxy gates intact).
- [x] `typecheck`, `lint`, `format:check`, `test` (26 files / 263 tests),
      `build` green; prerendered `/` HTML verified (no admin/login/
      technical strings, brand content present).

> 2026-09-20: implemented + verified per plan. No Supabase/RLS/Auth,
> cards, profiles, resolver, QR, NFC, or env changes. Human confirmations:
> 390px/1440px eyeball pass of the new landing page.

---

# Phase 15 — Admin Save Performance

> 2026-09-20 perf bundle (Tracks A–E, ADR-035). Phase stays OPEN until the
> orchestrator verifies each box live. No src/ changes in Track E.

## 15.1 Track A — Single auth per action

- [x] One session/auth check per server action (RLS stays enforcement).
- [x] Text-only profile save is DB-speed (no per-row/per-link auth round-trips).

> 2026-09-20: implemented — `*Internal(skipAuth)` variants in `service.ts`,
> single `getClaims()` in `save/setStatus`, `after()`+`Promise.all` deletes,
> single `revalidatePath`, parallel page fetches. `service.test.ts` 23/23.

## 15.2 Track B — Dual image pipeline

- [x] Client canvas downscale before upload + server sharp normalize (~200KB).
- [x] Immutable cache headers on normalized assets; replace-then-delete order kept.

> 2026-09-20: implemented — new `image.ts` (512 avatar/1600 cover, WebP 0.82),
> `ProfileEditor` uploads resized file, `storage.ts` sharp normalize +
> immutable cache, `next.config` avif/webp + long TTL. `image+storage` 18 tests.

## 15.3 Track C — Batched links/cards

- [x] Links/cards read in batched queries (no N+1 on save or reorder).
- [x] Reorder uses exact-set validation without per-row round-trips.
- [x] Single `revalidatePath` per save.

> 2026-09-20: implemented — `getOwnedLink` join (2→1), create 3→2 waves,
> reorder N serial→parallel batch, card row threading (~13→~8 RTTs
> orchestration), client-detail prop-drill, card-detail skips 100-row fetch
> when assigned. `links` 11 new + `cards` 3 new tests.

## 15.4 Track D — Public read fast path

- [x] Public profile is a single `cache()`d fetch (profile + enabled links).
- [x] `next/image` priority on LCP (avatar/cover); no dashboard code on public bundle.

> 2026-09-20: implemented — `cache()` loader shared by metadata+page
> (4→2 queries), vCard profile-only (2→1), cover keeps priority,
> avatar/logo eager. `brandIcons` kept (named ESM tree-shaken; inline
> rejected as unsafe). Resolver join evaluated and deliberately not applied.

## 15.5 Track E — RLS select-wrap migration (this track)

- [ ] `supabase/migrations/20260921_perf_admin_rls_select_wrap.sql` applied.
- [ ] Admin policies on `clients` / `profiles` / `profile_links` / `cards` use
      `((select private.is_admin()))` in USING + WITH CHECK.
- [ ] Storage write policies (`insert` / `update` / `delete`) use
      `(select private.is_admin())` with `bucket_id = 'profile-assets'` unchanged.
- [ ] RLS stays enabled; anon default-deny; `private.admin_users` unchanged;
      no service-role in browser.

### Phase 15 acceptance criteria

- [x] Text save latency is DB-speed (no auth-per-row regression).
- [x] Uploaded/normalized images ~200KB with immutable cache.
- [x] Single revalidate per save.
- [x] No N+1 on reorder.
- [x] Public profile renders from 1 fetch.
- [ ] RLS select-wrap applied with zero behavior change (admin allowed,
      non-admin denied, anon denied). **BLOCKED:** migration file-only,
      needs operator apply + live JWT matrix.

> 2026-09-20: code tracks verified locally — `pnpm typecheck`, `pnpm lint`,
> `pnpm test` (28 files / 296 tests), `pnpm build` all green. Live prod
> waterfall + migration apply left to operator.

### Phase 15 verification

```text
pnpm typecheck
pnpm lint
pnpm format:check   # CI gates this too (PR #3 lesson: agents omit it)
pnpm test
supabase db push --dry-run   # or apply via MCP migration tool
# live: anon SELECT [] on all tables; non-admin JWT 0 rows; operator CRUD OK
```

> Track E applied as file-only here; orchestrator to apply + verify live.

---

# Phase 16 — Profile Editor Stepper Footer (mobile UX)

Mobile-first redesign of the profile-editor bottom action area. No backend,
routing, step-flow, validation, or save-logic changes. Desktop stays coherent
via the same component.

## 16.1 Stepper footer

- [x] Extract `ProfileStepperFooter` (`src/features/profiles/components/`).
- [x] Two-row mobile layout: orientation row (Step X of 5 + label + segments)
      → nav row (Previous + primary Next) → tertiary Save draft row.
- [x] Labels: Previous / Next step / Save draft (`Create profile` kept for new).
- [x] Review step: Next hidden, Save takes over as full-width primary.
- [x] Sticky + safe-area aware (`env(safe-area-inset-bottom)`), clears bottom nav.
- [x] Disabled/loading: nav disabled + Save spinner/`Saving…`/`aria-busy`.
- [x] A11y: native buttons, `aria-label` nav, `aria-live` step status, ≥48px targets.
- [x] Unit tests (`ProfileStepperFooter.test.ts`).
- [x] Typecheck/lint/format/test/build pass.

> 2026-09-20: implemented per plan — inline footer in `ProfileEditor`
> replaced with the shared component; `Button` primitive reused, no new
> dependencies. Human confirmations: 320/390px eyeball + thumb-reach feel.

### Phase 16 gate

- [x] Hierarchy obvious at a glance; flow and persistence unchanged.
- [x] Checks pass.

---

# Phase 17 — Share Profile Final CTA (replaces Save Contact presentation)

Native contact saving is inconsistent across iOS/Android (ADR-042
moratorium). The public profile no longer presents Save Contact as the
primary action; Share Profile is the final CTA. Backend kept for later
reuse. See ADR-043.

## 17.1 Share Profile button

- [x] Web Share payload: title = display name, text = `Check out {Name} on Karti`, url = current public profile URL.
- [x] Clipboard fallback with `Profile link copied` feedback (legacy execCommand path included, no technical errors).
- [x] Secondary styling (existing radius/spacing/border, share icon, no primary CTA color); `aria-label`, keyboard support, ≥44px target.
- [x] Only public display name + public URL shared (no client/card IDs, dashboard URLs, notes, private data).
- [x] Server-safe rendering (URL read only in the tap handler; Share island remains the only client JS on the public page).

## 17.2 Public profile composition

- [x] Removed in-flow Save Contact CTA and sticky Save bar from `PublicProfileView`.
- [x] Final order: Header → Quick actions → Information → Final CTA (Share Profile) → Attribution.
- [x] vCard endpoint untouched; `SaveContactAction.tsx` + tests kept unused for later reuse.
- [x] Dashboard editor preview mirrors the change (inert `ShareProfilePreview`, not the live island).

## 17.3 Tests

- [x] Share payload unit tests (title/text/URL, blank-name fallback, no private data).
- [x] Clipboard/legacy-copy fallback tests.
- [x] View tests: Share exists at bottom, correct order vs content/attribution, no Save/vCard surfaces, profile still renders, mobile-safe markup.

### Phase 17 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Tests pass (32 files / 357 tests).
- [x] Production build passes.
- [ ] `format:check` — pre-existing repo-wide CRLF baseline failure (39 files fail identically at HEAD; documented, not introduced here).

> 2026-09-21: implemented + verified per plan. `typecheck`, `lint`,
> `test` (357), `build` green. Human confirmations: on-device share-sheet
> tap + 320/390px eyeball pass.

---

# Phase 18 — Profile Image Crop & Adjust Editor

Select → Adjust → Preview → Save for avatar + cover. No schema change,
no storage-model change (generated paths, gates, immutable cache kept).
See ADR-044.

## 18.1 Crop math + processing

- [x] Pure `crop.ts` (cover-fit × 1–3x zoom, clamped pan, frame→source rect; avatar 1:1, cover 3:1).
- [x] `cropBitmapToWebP` canvas step (EXIF-aware decode, WebP output, null — never original — on failure).
- [x] Avatar cap 512 → 1024 in code constants only (client + server); cover stays 1600.
- [x] Only cropped bytes uploaded; original never leaves the browser except into canvas.

## 18.2 Editor UX

- [x] Native `<dialog>` (top-layer, Esc-to-cancel, no new dependency); mobile sheet / desktop centered; existing tokens.
- [x] Circular avatar viewport + rectangular cover viewport matching the public crop (WYSIWYG).
- [x] Drag position (Pointer Events: Android/iOS/desktop), zoom slider 1x–3x, Reset, Cancel, Confirm.
- [x] “How your … will appear” live preview before saving.
- [x] Cancel keeps the previous image; focus returns to the choose control.
- [x] A11y: labeled controls, arrow-key pan + +/- zoom, `aria-describedby`, targets ≥44px.

## 18.3 Tests

- [x] `crop.test.ts` (rect math, zoom clamp, pan clamp, square + 3:1, invalid input).
- [x] `ImageCropEditor.test.ts` (dialog markup, controls, slider range, preview heading, touch targets, no upload on render).
- [x] `image.test.ts` additions (EXIF-aware decode, crop draw args, 1024 cap, null-on-failure).
- [x] Cap assertions updated (`image` + `storage` tests); profile-creation paths untouched.

### Phase 18 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Tests pass (34 files / 382 tests).
- [x] Production build passes.
- [ ] `format:check` — pre-existing repo-wide CRLF baseline failure (identical at HEAD; documented, not introduced here).

> 2026-09-21: implemented + verified per plan. Human confirmations:
> real drag/crop/upload pass on Android Chrome + iOS Safari + desktop,
> 320/390px editor eyeball.

---

# Phase 19 — Public Profile Mobile Card UX (top tiles + hero + connect + share)

Premium mobile-first contact-card pass. UI/components/styling only: no
database, profile-data, route, resolver, vCard, or security-model changes.

## 19.1 Top action cards

- [x] 3 equal cards in a row (Instagram | WhatsApp | Call via existing
      `pickQuickActions` order), centered icon + title + short sublabel.
- [x] Equal widths (`repeat(n, minmax(0, 1fr))`), `min-h-[110px]`,
      320px+ responsive (13px/11px type, `px-2`, `min-w-0`, `break-words`).
- [x] Natural wrapping, no ellipsis (`truncate` removed from tiles).
- [x] Human sublabels: Instagram "View profile", WhatsApp "Chat now",
      Call "Tap to call", Website "Visit website", generic "Tap to open".

## 19.2 Real brand icons + interaction + a11y

- [x] Instagram official gradient tile, WhatsApp official green circle,
      phone glyph for Call in an accent-tinted circle (48px, centered).
- [x] Other social glyphs keep official colors; X/TikTok adapt to theme.
- [x] Hover lift on desktop, `active:scale-[0.96]` press on mobile,
      `focus-visible` rings, `aria-label` ("Label — sublabel") on every tile.

## 19.3 Hero

- [x] Reduced photo dominance (`brightness-[0.8]` + stronger
      `from-black/70 via-black/30 to-black/85` scrim + bottom gradient).
- [x] Improved text contrast (white/95 tagline, stronger text shadows,
      higher-contrast category pill).
- [x] Profile photo stays the focus (80px → 96px avatar/logo, thicker
      ring, deeper shadow).
- [x] Category/tagline wrap (`line-clamp-3`, `break-words`) instead of
      truncating.

## 19.4 Connect cards + Share final CTA

- [x] Connect rows use human CTAs (`connectSublabel`): LinkedIn
      "Connect with me" (no technical hostname), Instagram "View profile",
      per-brand CTAs elsewhere, generic "Tap to open".
- [x] Share is the strong bottom action: "Share my profile" /
      "Send my digital card", accent fill, `min-h-[68px]`, `rounded-[20px]`.
- [x] Dashboard inert preview copy aligned ("Share my profile").

### Phase 19 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Tests pass (35 files / 388 tests, incl. new `PublicProfileViewCards.test.ts`).
- [x] Production build passes.
- [ ] `format:check` — pre-existing repo-wide CRLF baseline failure (identical at HEAD; documented, not introduced here).
- [ ] Screenshots comparison — no screenshot tooling in this environment (markup assertions + operator eyeball pass at 320/390px pending).

> 2026-09-21: implemented + verified per plan. Human confirmations:
> on-device tap/eyeball at 320/390px + screenshots comparison.

---

# Phase 20 — NFC Tap Performance Bundle (tap path + full app)

Zero-stale constraint: dashboard edits stay instantly visible (no TTL
caching). `307 + no-store` redirect kept (ADR-024). See ADR-045.

## 20.1 Tap-path quick wins

- [x] Proxy matcher narrowed to dashboard/login (public taps skip Edge).
- [x] Single admin client per public request (pure URL builder, no probe client).
- [x] `optimizePackageImports` for react-icons/lucide-react + `poweredByHeader: false`.
- [x] One preloaded LCP image (cover XOR avatar) + `fetchPriority` + storage preconnect.

## 20.2 Single-RTT data (embed + fallback, never fail a tap)

- [x] Resolver: card + destination profile in one embed query, legacy two-query fallback.
- [x] Public profile: profile + links in one embed query (JS filter/sort), legacy fallback.
- [x] Migration `20260922_perf_public_reads` (3 composite indexes, additive only) applied live + verified.
- [x] Embed syntax verified live via anon PostgREST (both queries OK, 0 rows under default-deny RLS).

## 20.3 Zero-stale cross-request cache

- [x] `publicCache.ts`: tagged `unstable_cache` (`revalidate: false`, purge-only) + `updateTag` purge helper.
- [x] `/[slug]` serves from cache; profile/link dashboard writes purge instantly (slug renames covered by global tag).
- [x] Resolver stays `no-store` (card switches bypass cache by construction).

## 20.4 Dashboard/build hardening

- [x] `qrcode` dynamically imported (out of initial dashboard chunk, never in public bundle).
- [x] `Server-Timing` on `/t/[code]` redirect (sampling, never blocking).

### Phase 20 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Tests pass (36 files / 400 tests, incl. embed fast-path + cache + zero-client URL tests).
- [x] Production build passes (`/[slug]` + `/t/[code]` dynamic as intended).
- [ ] `format:check` — pre-existing repo-wide CRLF baseline failure (untouched files warn identically; no new debt).
- [ ] Operator confirms ~1-2s tap on real device + destination-switch invariance (PROFILE→EXTERNAL→PROFILE, slug rename, DISABLED→404).

> 2026-09-21: implemented + verified per plan (typecheck/lint/test/build green, indexes + embed syntax verified live, temp files removed). Human confirmations: real-device tap timing + 320/390px eyeball.

---

# Phase 21 — Stable Public Identity + Wallet (wallet REMOVED, identity KEPT)

Wallet integration deferred (ADR-046 superseded): external credentials were
not going to be provisioned, so the Apple/Google integration was removed
cleanly — no flags, no dead code. The stable identity system stays:
permanent public profile URLs that survive slug renames, reusable by any
future integration such as wallet cards.

## 21.1 Stable identity (KEPT)

- [x] `profiles.public_code` (10-char, UNIQUE NOT NULL + DEFAULT generator, migration `20260923`) applied live + backfill verified. NOT rolled back.
- [x] `/u/[code]` page (same view/data/metadata + canonical) + canonical on slug pages.
- [x] `u` reserved in slugs.

## 21.2 Wallet removal (2026-09-21)

- [x] Deleted: `src/features/wallet/`, `src/app/api/wallet/[code]/`, `WalletCtaCard`, `AddToWalletButton` (+ tests).
- [x] Removed deps: `passkit-generator`, `jose`, `node-forge`, `@types/node-forge`.
- [x] Removed env vars: `APPLE_*` (5), `GOOGLE_*` (4) from `.env.example`; none required anymore.
- [x] Cleaned refs: pages (no wallet prop), `PublicProfileView` (Share final CTA again), editor preview, `env-server`, isolation test.
- [x] No imports reference wallet/passkit/jose (verified by grep + typecheck).
- [x] Public profile hierarchy: hero → tiles → information → about → links → Share → attribution (no empty gaps).

## 21.3 Verification after removal

- [x] `typecheck`, `lint`, `test`, `build` green (counts in report).
- [x] NFC flow (`/t/` resolver) untouched; QR/permanent-URL untouched.
- [x] `/u/[code]` works (ACTIVE renders, unknown/DRAFT/INACTIVE → 404).
- [x] No wallet routes, no wallet env required (asserted).
- [ ] `format:check` — repo-wide CRLF baseline (unchanged standing note).

> 2026-09-21 (removal): wallet was built in commit `86c37aa` and removed from
> the working tree the same day (uncommitted — ready for review); only the
> stable identity system (`public_code`, `/u/`, canonical, reserved `u`)
> remains. Operator follow-up that still applies: `pnpm db:types` re-run with
> token (absorbs 3-line `public_code` backport).

---

# Phase 22 — Profile PWA "Keep this Card" (replaces Wallet MVP approach)

Goal: tapping Keep Profile installs THAT profile as a home-screen app —
per-profile install identity, no generic Karti app, no Apple/Google Wallet
dependency, no external services. See ADR-047.

## 22.1 Profile-specific manifest

- [x] Pure `src/features/pwa/manifest.ts` (name/short_name/description,
      `start_url: /u/{publicCode}`, standalone, theme from validated
      accent, 192 + 512 icon URLs).
- [x] Route `GET /u/[code]/manifest.webmanifest`
      (`application/manifest+json`, `no-store`).
- [x] ACTIVE-only via the existing cached code loader (DRAFT/INACTIVE/
      unknown/malformed → one generic 404, no existence leak).
- [x] No private fields (builder output key-pinned by test).
- [x] Unit + route tests (name, start_url shape, icon URLs, security matrix).

## 22.2 On-demand profile icons (no stored objects, no migration)

- [x] Pure `src/features/pwa/icons.ts` (sizes, initials, accent bg, escaped
      fallback SVG) + server `iconImage.ts` (sharp square center-crop from
      the current avatar; accent initials tile on missing/undecodable
      bytes; null → 404).
- [x] Routes `GET /u/[code]/icon-192.png`, `/icon-512.png`,
      `/apple-touch-icon.png` (`image/png`, `no-store`, same ACTIVE gate).
- [x] Magic-byte gate on fetched avatar bytes; 5 MB fetch cap.
- [x] Tests (crop-to-square dimensions, 512 + apple sizes, fallback paths,
      unknown → 404, locked headers).

## 22.3 Keep Profile install experience

- [x] `KeepProfileButton` island (2nd tiny `"use client"` on the public
      page): Android `beforeinstallprompt` → native prompt on tap (no
      manual instructions when available); Android without prompt →
      minimal Chrome-menu hint; iOS → guided modal (Share → Add to Home
      Screen → Add, close button, no jargon); desktop → plain
      "Open this profile on your phone to keep it." note; standalone →
      renders nothing.
- [x] Pure `detectInstallPlatform` + `isRunningStandalone` unit tests.
- [x] SSR-markup tests (CTA + caption, no modal/hint/wallet strings).

## 22.4 Public profile integration

- [x] `PublicProfileView` order: hero → tiles → information → about →
      links → **Keep this card** → Share → attribution (Keep after profile
      information, before attribution; hero untouched).
- [x] `<link rel="manifest" href="/u/{code}/manifest.webmanifest">` on BOTH
      `/u/[code]` and `/[slug]` (identical install identity from either
      entry; `start_url` always `/u/{code}`).
- [x] `apple-touch-icon` + `theme-color` metadata on both pages.
- [x] Dashboard editor preview mirrors the order (inert
      `KeepProfilePreview`, not the live island — same rationale as Share).
- [x] No wallet references remain in public markup/code (ADR history kept).
- [x] View-order tests (Keep placement vs content/Share/attribution).

## 22.5 Verification

- [x] `typecheck`, `lint`, `test`, `build` green (counts in report).
- [x] `admin-isolation` posture unchanged (new routes server-only; island
      touches no privileged modules).
- [ ] `format:check` — repo-wide CRLF baseline (unchanged standing note).
- [ ] On-device install pass (Android prompt → icon → standalone launch;
      iOS Add to Home Screen; 320/390px eyeball) — operator, no devices here.

> 2026-09-21: implemented + verified per plan. NFC/QR/resolver/vCard
> untouched. One corrective migration for the generator fix (22.6); no new
> dependency, no new env vars.

## 22.6 public_code generator fix (found live during 22.5)

Pre-existing Phase 21 bug, not introduced here: the SQL generator rolled
1..32 against a 31-symbol alphabet, so ~27% of codes came out short and
unreachable via `/u/` (fail-closed). See ADR-048.

- [x] Root-caused (alphabet recount 31 vs hardcoded 32; TS side safe via
      `% alphabet.length`).
- [x] Temp probes removed; operator data verified clean (0 malformed).
- [x] Migration `20260924_public_code_generator_fix.sql` (dynamic roll +
      format CHECK) applied live + verified (10/10 samples valid,
      DEFAULT-path insert end-to-end, full cleanup, residue 0).
- [x] Live PWA matrix on temp fixtures (removed afterwards): ACTIVE →
      manifest 200 + icon 200 with exact body; fresh INACTIVE → 404 both;
      unknown → 404 both; ACTIVE `/u/` page carries `<link
      rel="manifest" href="/u/{code}/manifest.webmanifest">`,
      apple-touch-icon, Keep section in order, Share + attribution intact;
      slug page 200.

---

# Phase 23 — Hero No-Overlap Redesign (cover shadow + collision fix)

Clean refactor of the public-profile hero. Visuals + composition only: no
backend, routing, resolver, vCard, data-rule, or storage changes.
Operator choice: clean no-overlap + tiles below hero + small tweaks.

## 23.1 Hero

- [x] Cover is image-only (`h-52 sm:h-60`, `object-cover`, full color — no
      `brightness`, no scrims, no text on image; accent-gradient fallback kept).
- [x] Identity on solid sheet (avatar `-mt-12` bounded overlap with
      theme-matched ring; name in theme text; accent-tinted category pill;
      muted tagline; no text-shadows/backdrop-blur).
- [x] PERSON circle / BUSINESS rounded-square shapes + initials fallbacks kept.

## 23.2 Tiles + sheet

- [x] Quick tiles in-flow (no `-mt-10`/`z-10`); order/labels/sublabels/aria intact.
- [x] Sheet drops `rounded-t-[28px]` seam; rest of page
      (info → about → links → Keep → Share → attribution) untouched.

## 23.3 Tests + docs

- [x] New `PublicProfileViewHero.test.ts` (5 cases: no shadowing stack,
      name outside cover, tiles in-flow, avatar seam ring, dark theme).
- [x] ADR-049 recorded.

### Phase 23 gate

- [x] Typecheck passes.
- [x] Lint passes.
- [x] Tests pass (45 files / 462 tests).
- [x] Production build passes.
- [ ] `format:check` — repo-wide CRLF baseline (unchanged standing note).
- [ ] Operator 390px visual pass with a real cover photo.

> 2026-09-21: implemented + verified per plan (typecheck/lint/test/build
> green). Human confirmations: 320/390px eyeball with real cover imagery.
>
> 2026-09-21 (cover/sheet separation): white covers melted into the light
> sheet with no visible edge. Added theme-aware hairline + shadow on the
> cover section (light `border-[#E2E8F0]` + soft slate shadow, dark
> `border-white/10` + deep shadow); avatar untouched; hero test +1 case
> (463 total). Checks green.
>
> 2026-09-21 (premium avatar + spacing): avatar 96→112px (`h-28 w-28`,
> `-mt-14`, 224px retina source) with crisp white ring + accent halo
> (`accent 16%` glow) + deep soft shadow in both themes (replaces the
> sheet-matched ring that vanished on white covers); BUSINESS logo
> `rounded-[28px] p-1.5`; name 28→30px + `mt-4` + `text-balance`; category
> pill airier (`mt-2.5 px-3.5 py-1.5`); tagline `leading-relaxed`;
> identity `pb-3`, sheet `pt-5`. Hero tests updated. Checks green.

---

# Phase 24 — PWA Install Experience + iOS Add to Home Screen Fix

Technically correct, extremely clear installation on every platform.
No NFC/QR/resolver/identity/wallet/DB changes. See ADR-050.

## 24.1 Installability audit fixes

- [x] Manifest gains `scope` (= `start_url` `/u/{code}`) + maskable 512
      entry (`purpose: "any maskable"`); key-pinning test 9→10 keys.
- [x] Both pages (`/[slug]`, `/u/[code]`) emit `appleWebApp` (capable,
      statusBarStyle default, title = short name) + `mobile-web-app-capable`.
- [x] 512 icon renders with maskable safe-zone pad (center 80%, accent
      backdrop); 192/180 stay full-bleed. Manifest link, apple-touch-icon,
      theme-color, canonical `/u/{code}` verified on both pages.

## 24.2 Platform detection

- [x] `detectInstallEnvironment`: `ios-safari` vs `ios-other` (CriOS/FxiOS/
      EdgiOS/OPiOS Mercury/Yandex) vs `android` vs `desktop` (+ tests).
- [x] Platform CTAs: iOS Safari `Add to Home Screen`, Android `Install
      Digital Card`, iOS non-Safari `Open in Safari to save this card`
      (guidance note, never a fake install), SSR/pre-hydration `Add to Phone`.

## 24.3 Premium iOS guide

- [x] Illustrated 3-step modal (`Save this card to your iPhone`): Safari
      toolbar mock with highlighted Share glyph, action-sheet row mock for
      Add to Home Screen, Add confirmation + "appears like an app" close.
- [x] Non-Safari variant leads with the Safari-first note. CSS mocks only
      (existing icons, no new deps); dialog a11y preserved; dismiss kept.

## 24.4 Keep section UX

- [x] Title `Keep this digital card` + subtitle `Add it to your phone for
      quick access anytime`; order (links → Keep → Share → attribution)
      unchanged; editor inert preview mirrors the new label.

## 24.5 Dev-only diagnostic

- [x] `PwaDiagnostics` island: renders only on development `?pwa-debug=1`;
      live-checks manifest body, icon fetch, Apple meta tags, secure
      context, display-mode, parsed environment. Null elsewhere (tested).

## 24.6 Verification

- [x] `typecheck`, `lint`, `test` (46 files / 470 tests), `build` green.
- [x] ACTIVE-only + generic-404 + no-private-fields matrices extended
      (scope/maskable included, no leaks).
- [ ] `format:check` — repo-wide CRLF baseline (unchanged standing note).
- [ ] Device-only: Android Chrome install + icon + standalone launch;
      iPhone Safari Share→Add availability + installed icon; desktop
      fallback — operator, no devices here.

> 2026-09-21: implemented + verified per plan. NFC/QR/resolver/identity/
> wallet/DB untouched. Not committed — left ready for review.

---

# Phase 25 — Profile Sections Foundation

Foundation only: data-driven hero/actions/links ordering on the public
profile. No maps, menus, CV, gallery. No visual redesign — default render is
pixel-identical. See ADR-051.

## 25.1 Storage

- [x] `profile_sections` table (id, profile_id, type, position, enabled,
      settings jsonb, timestamps) + CHECKs + indexes + `updated_at` trigger.
- [x] RLS enabled + admin-only policy (`(select private.is_admin())`), anon
      default-deny.
- [x] Backfill: existing profiles receive hero(1) → actions(2) → links(3),
      idempotent re-runnable.
- [x] Migration file `20260925_profile_sections.sql` committed.

## 25.2 Section registry + domain

- [x] `SECTION_TYPES = hero | actions | links` + labels + default order.
- [x] `list/toggle/reorder` services with profile→client ownership checks.
- [x] `seedDefaultSections` on profile creation (best-effort, never fails create).
- [x] `ensureDefaultSections` repair helper.
- [x] `settings` never projected on the public path.

## 25.3 Public rendering

- [x] `ProfileSectionRenderer` (hero/actions/links components extracted
      verbatim, data-driven order, unknown types render nothing).
- [x] Keep/Share/attribution stay fixed after sections.
- [x] Hero pinned to the top slot in this foundation (documented constraint).
- [x] Both `/[slug]` and `/u/[code]` pass sections; embed fast-path carries
      sections with legacy fallback; defaults when rows absent.

## 25.4 Admin editor

- [x] Sections list on the profile edit page (reorder + show/hide).
- [x] Server actions purge the public cache (zero-stale preserved).
- [x] Graceful notice when the table is unreachable (migration pending).

## 25.5 Tests + verification

- [x] Service tests (ordering, exact-set reorder, toggle, seed, repair).
- [x] Public loader tests (embed order, disabled filtering, all-off stays
      empty, defaults fallback, settings never exposed, /u/ parity).
- [x] Renderer tests (default order, reordered, disabled, unknown type).
- [x] `typecheck`, `lint`, `test` (48 files / 496 tests), `build` green.
- [ ] Live: migration apply + anon matrix for `profile_sections`
      (operator step — file-only here).

### Phase 25 gate

- [x] Default public render unchanged (existing view tests pass untouched).
- [x] Reorder/disable verified in data + render.
- [x] Security isolation holds (no anon policies, no settings exposure).
- [x] Checks pass.

> 2026-09-21: implemented per plan — migration file-only (apply + live JWT
> matrix left to operator); `typecheck`, `lint`, `test` (496), `build`
> green. `format:check` = pre-existing repo-wide CRLF baseline (untouched
> files fail identically; no new debt). Not committed — left ready for review.

---

# Phase 26 — Advanced Profile Builder (registry + builder architecture)

Builder architecture without implementing new rendered sections. No maps,
menus, CV, gallery implementations — only the registry, catalog modal,
and builder UX around the live hero/actions/links trio. See ADR-052.

## 26.1 Registry + migration

- [x] `sectionCatalog.ts`: 11 definitions (type, label, description,
      category, status, icon, default settings) across Core / Business /
      Personal / Media; 3 live + 8 planned.
- [x] Component half in `ProfileSections.tsx` (`resolveSection` pairs a
      catalog entry with its renderer; planned/unknown → null component).
- [x] Migration `20260926_section_types.sql` widens the type CHECK;
      singleton-per-type, RLS, indexes untouched; no backfill.
- [x] Renderer switch replaced by registry lookup (default DOM identical).

## 26.2 Services

- [x] `addProfileSection` (registry validation, singleton CONFLICT,
      appends at max+1) + `addSectionAction`.
- [x] `deleteProfileSection` (foundation trio protected, planned rows
      removable) + `deleteSectionAction`.
- [x] Ownership gates widened from foundation trio to registry-known types.
- [x] Service permits any registry type; the modal gates on live status
      (new sections unlock with zero service changes).

## 26.3 Manager + modal + drag-and-drop

- [x] Registry-driven section cards (icon, category, status, show/hide).
- [x] Per-card settings placeholder (explicit nothing-to-configure copy).
- [x] Native HTML5 drag-and-drop reorder (handle-only, drop indicator,
      pending lock); up/down buttons stay for keyboard/touch.
- [x] Pure `moveSectionId` helper shared by drag + button paths.
- [x] Add-section catalog modal (native dialog, category groups, Coming
      soon badges for planned, Added state for core — list-only, no
      persistence of planned types in this phase).
- [x] Two-tap remove affordance for non-foundation rows only.

## 26.4 Tests + verification

- [x] Registry loading (11 defs, categories, live/planned split).
- [x] Add service (success, singleton conflict, unknown type, ownership).
- [x] Delete service (planned ok, foundation protected, cross-client).
- [x] Mixed-type reorder; `moveSectionId` edges.
- [x] Modal markup (groups, badges, no planned add affordance).
- [x] Public projection with planned-type rows (order kept, no settings).
- [x] `typecheck`, `lint`, `test` (50 files / 518 tests), `build` green.
- [ ] Live: migration apply + anon matrix for `profile_sections`
      (operator step — file-only here).

### Phase 26 gate

- [x] Existing public UI unchanged (all pre-existing view tests untouched).
- [x] No new rendered sections; no redesign.
- [x] Security posture unchanged (admin ownership checks, no anon policies,
      no settings exposure).
- [x] Checks pass.

> 2026-09-21: implemented per plan — migration file-only (apply + live JWT
> matrix left to operator). `format:check` = pre-existing repo-wide CRLF
> baseline (untouched files fail identically; no new debt). Not committed —
> left ready for review.

---

# Phase 27 — Section Settings Engine

Configuration architecture for profile sections. Registry carries
settingsComponent + supportedProfiles; live hero/actions/links ship
minimal real editors (defaults = current look); business sections stay
unimplemented. See ADR-053.

## 27.1 Settings schemas + engine

- [x] `sectionSettings.ts`: zod schemas for hero (showTagline,
      showCategory), actions (showQuickTiles, showAbout), links
      (showSubtitles); `sanitizeAdminSettings` (strip unknown, reject bad
      values, planned types accept `{}` only); `sanitizePublicSettings`
      (never fails — invalid falls back to defaults).
- [x] Schema is the public allowlist: only declared display keys can reach
      the public projection.

## 27.2 Registry + editors + renderer

- [x] Catalog entries gain `settingsComponent` (live trio wired, planned
      null) + `supportedProfiles` (Menu/Catalog/Location/Hours
      BUSINESS-only; About/CV/Experience PERSON-only; hero/actions/links/
      gallery both).
- [x] `SectionSettingsRenderer` dynamically loads the editor per type.
- [x] Hero/Actions/Links settings editors (checkbox toggles + save).
- [x] Renderer honors settings (defaults preserve current UI exactly).

## 27.3 Services + public projection

- [x] `updateSectionSettings` (ownership + schema validation) +
      `updateSectionSettingsAction` (revalidate + cache purge).
- [x] `addProfileSection` enforces the audience split.
- [x] Public loader selects settings and sanitizes per type (embed +
      legacy); `PublicSection.settings` always sanitized.

## 27.4 Manager + modal

- [x] Per-card settings disclosure renders the live editor (or the
      arrives-with-implementation placeholder for planned types).
- [x] Add modal badges audience-incompatible entries (Business/Personal
      only); `profileType` threaded from the profile page.

## 27.5 Tests + verification

- [x] Engine unit tests (defaults, strip-unknown, reject-bad-values,
      planned rules, public fallback).
- [x] Registry tests (editor resolution, audience split).
- [x] Service tests (save/update, invalid rejection, cross-client,
      audience gating).
- [x] Renderer tests (hide tagline/category/tiles/about/subtitles).
- [x] Editor + modal markup tests.
- [x] Public safety tests (hostile keys stripped, invalid reset).
- [x] `typecheck`, `lint`, `test` (52 files / 540 tests), `build` green.

### Phase 27 gate

- [x] Current sections keep working (defaults = current look; all
      pre-existing view tests untouched).
- [x] No business sections implemented; no redesign.
- [x] Unknown settings ignored; admin-only/hostile keys never public.
- [x] Checks pass.

> 2026-09-21: implemented per plan (no migration — settings jsonb already
> exists). `format:check` = pre-existing repo-wide CRLF baseline (untouched
> files fail identically; no new debt). Not committed — ready for review.

---

# Phase 28 — Business Identity Sections (Location + Opening Hours)

First real builder sections on the Phase 27 engine. No migration (types
already in the CHECK). See ADR-054.

## 28.1 Location

- [x] Registry entry flipped live (BUSINESS-only).
- [x] Zod schema (title/address/coords/showMap/buttonLabel; range checks,
      numeric-string coercion).
- [x] `LocationSettingsEditor` (text inputs, coordinate hints, map toggle).
- [x] `LocationSection` renderer: address card, Google + Apple Maps links
      (encoded query, coords preferred), no iframe, no API keys,
      content-driven collapse without a target.

## 28.2 Opening Hours

- [x] Registry entry flipped live (BUSINESS-only).
- [x] Zod schema (IANA timezone via Intl check, 7-day schedule, HH:MM
      times, closed flags).
- [x] `OpeningHoursSettingsEditor` (timezone input + 7 day rows with time
      inputs and closed toggles).
- [x] `OpeningHoursSection` renderer: weekly rows, today highlight,
      Open-now/Closed badge (timezone-aware, silent when undeterminable).

## 28.3 Architecture compliance

- [x] `profile_sections` + settings JSONB only; registry-driven renderers
      and editors; audience enforcement on add; sanitized projection.
- [x] Modal Add enabled for live compatible types (planned stay Coming
      soon); new rows deletable; foundation trio still protected.
- [x] No redesign of existing sections.

## 28.4 Tests + verification

- [x] Registry availability (5 live / 6 planned; editor resolution).
- [x] Settings validation (coords, times, timezones, coercion).
- [x] Admin save (location coercion persisted; invalid rejected unwritten).
- [x] Ownership isolation (cross-client add/update/delete denied).
- [x] Public rendering (maps URLs, no iframe, collapse, schedule + badge).
- [x] Helpers (query preference, URL encoding, open/closed determinism).
- [x] `typecheck`, `lint`, `test` (52 files / 553 tests), `build` green.

### Phase 28 gate

- [x] Location + Hours work end-to-end (add → configure → render → hide).
- [x] Existing sections untouched (all pre-existing tests pass).
- [x] Checks pass.

> 2026-09-21: implemented per plan. `format:check` = pre-existing repo-wide
> CRLF baseline (untouched files fail identically; no new debt). Not
> committed — ready for review.

---

# Phase 29 — Menu + Catalog Collection Sections

Reusable content collections on `profile_sections.settings` JSONB. No new
tables, no new bucket. See ADR-055.

## 29.1 Shared collection engine

- [x] `collectionItemSchema` (id/image/name/description/price/available)
      + `collectionCategorySchema` (id/name/items ≤50) + collection settings
      (title/currency/categories ≤20), shared by menu and catalog.
- [x] `formatPrice`, numeric-string price coercion, `{}` defaults
      ("Our Menu" / "Products" / MAD).
- [x] Sanitization unchanged in shape: unknown stripped, invalid rejected,
      public projection allowlisted by schema.

## 29.2 Menu + Catalog

- [x] Registry flipped live: menu (RESTAURANT forward-declared + BUSINESS
      effective), catalog (BUSINESS-only); editors + renderers wired.
- [x] Shared `CollectionEditor` (title/currency, category add/remove/
      reorder, item add/edit/remove/reorder, availability, photo upload).
- [x] Shared `CollectionView` renderer (category headings, item rows with
      thumb/name/price/description, unavailable hidden, empty collapse).
- [x] Modal Add works for live compatible types; singleton + audience
      enforced server-side.

## 29.3 Images

- [x] Section-scoped paths `{clientId}/sections/{type}/{hex}.webp` in the
      existing `profile-assets` bucket (no new bucket).
- [x] Same pipeline as identity assets: admin-only, MIME allowlist,
      magic-byte gate, sharp normalize (1024 cap), immutable cache.
- [x] Ownership-verified upload (`uploadSectionImage` + action);
      managed-path delete gate extended; best-effort orphan cleanup on
      settings save (never fails the save).
- [x] Public renders only referenced images; no listing surface.

## 29.4 Tests + verification

- [x] Registry (7 live / 4 planned; menu audiences; editor resolution).
- [x] Settings (spec-example shape, strip/coerce, negatives/blank/limits,
      price formatting; location/hours suites updated for live status).
- [x] Services (menu save with coercion; cross-client denied; audience
      gating; foundation protection intact).
- [x] Renderer (menu/catalog rows, prices, unavailable hidden, empty
      collapse, no iframe).
- [x] Storage (scoped paths, gate accept/reject, upload normalization,
      cross-client/type/auth denial).
- [x] Security (sanitized projection, hostile keys stripped, no
      admin-only fields).
- [x] `typecheck`, `lint`, `test` (52 files / 568 tests), `build` green.

### Phase 29 gate

- [x] Menu + Catalog work end-to-end (add → items + photos → render).
- [x] No new tables; no redesign of existing sections.
- [x] Checks pass.

> 2026-09-21: implemented per plan. RESTAURANT audience forward-declared
> (no such profile type exists yet — menu is BUSINESS-effective until it
> does). `format:check` = pre-existing repo-wide CRLF baseline. Not
> committed — ready for review.

---

# Phase 30 — Profile Templates System

Templates seed sections once at profile creation; the template id is
stored metadata. Existing profiles never gain/lose sections from
templates. See ADR-056.

## 30.1 Registry + storage

- [x] `profileTemplates.ts`: personal / business / restaurant / store
      (label, description, profile-type audience, section list, settings
      overrides); restaurant carries the full spec set incl. gallery.
- [x] Migration `20260927_profile_template.sql`: `profiles.template`
      + CHECK + backfill from profile_type (sections untouched).
- [x] `database.ts` backport + `PROFILE_DETAIL_COLUMNS` carry template.

## 30.2 Application service

- [x] `seedTemplateSections` (insert-missing-only, append after max,
      idempotent, fail-closed without throwing).
- [x] `createProfile` resolves the template (explicit compatible choice
      wins, else type default; unknown never fails creation) and seeds it.
- [x] `updateProfileTemplate` updates ONLY the column — structurally no
      `profile_sections` query exists in that path.

## 30.3 Admin UI

- [x] Template picker in the creation wizard (Identity step, filtered by
      profile type, resets on type change).
- [x] Template reference section on the edit page (change metadata,
      explicit copy that sections are untouched).

## 30.4 Tests + verification

- [x] Registry (4 templates, restaurant set, audience coherence,
      defaults/compatibility).
- [x] Seeding (full set + positions, idempotent rerun, existing rows
      byte-identical incl. disabled/custom/foreign rows).
- [x] Creation stores template + seeds (restaurant 7 rows); unknown /
      mismatched ids fall back to the type default.
- [x] Metadata change touches only `profiles` (table-call assertion);
      unknown/mismatch/cross-client/anonymous rejected.
- [x] `typecheck`, `lint`, `test` (53 files / 580 tests), `build` green.
- [ ] Live: migration apply + template-column readback (operator step —
      file-only here).

### Phase 30 gate

- [x] New profiles start from templates; existing profiles unchanged.
- [x] No section recreation; no redesign.
- [x] Checks pass.

> 2026-09-21: implemented per plan. `format:check` = pre-existing repo-wide
> CRLF baseline. Not committed — ready for review.

---

# Phase 31 — Personal Profile Sections (About + Experience + CV)

PERSON-only blocks on the section engine. CVs live in a private bucket
served exclusively through a slug-based endpoint. See ADR-057.

## 31.1 About + Experience

- [x] Registry flipped live (PERSON-only); zod schemas (title/content ≤
      2000; jobs with company/role/YYYY-MM dates/end-after-start,
      descriptions ≤500).
- [x] Editors (title + textarea; job cards with month inputs, present
      toggle, add/remove/reorder).
- [x] Renderers (biography; timeline with formatted dates, Present,
      today-agnostic rows; both collapse when empty).

## 31.2 CV documents

- [x] Migration `20260928_profile_documents.sql`: private bucket (no read
      policy for any API role), admin-only writes, PDF MIME + 5 MB.
- [x] PDF pipeline (`detectPdfKind`, ownership-verified upload, original
      bytes, `no-store`); managed document-path gate; bucket-routed
      deletes; orphan cleanup extended to documents.
- [x] `GET /api/cv/[slug]`: ACTIVE-only, re-resolves the path server-side
      (public projection strips it), shape-validated, inline PDF,
      `no-store`, generic 404s.
- [x] CV editor (title/label/PDF upload with validation feedback).

## 31.3 Architecture compliance

- [x] `profile_sections.settings` JSONB only; registry-driven editors and
      renderers; PERSON audience enforced on add; modal offers the three
      blocks on PERSON profiles.
- [x] Sanitized projection: `file` stripped (presence-only `hasFile`
      flag), hostile keys stripped, invalid reset to defaults.
- [x] Existing sections untouched.

## 31.4 Tests + verification

- [x] Registry availability (10 live / 1 planned; PERSON audiences).
- [x] Settings validation (limits, date order, PDF rules, month format).
- [x] Upload security (MIME/magic/size/type/auth/ownership denial).
- [x] Endpoint matrix (200 inline + 6×404: draft/unknown/missing/
      disabled/hostile/failed-download).
- [x] Public rendering (biography, timeline, CV button without path
      leak, all three collapse empty).
- [x] Ownership isolation (cross-client mutation denial intact).
- [x] `typecheck`, `lint`, `test` (54 files / 601 tests), `build` green.
- [ ] Live: migration apply + bucket privacy check (operator step —
      file-only here).

### Phase 31 gate

- [x] About/Experience/CV work end-to-end (add → configure → render).
- [x] No direct storage exposure (private bucket, slug endpoint).
- [x] Checks pass.

> 2026-09-21: implemented per plan. `format:check` = pre-existing repo-wide
> CRLF baseline. Not committed — ready for review.

---

# Phase 32 — Gallery Section

Reusable visual gallery on `profile_sections.settings` JSONB — the last
planned catalog type (registry now fully live). See ADR-058.

## 32.1 Schema + editor

- [x] `gallerySettingsSchema` (title, grid/masonry layout, ≤24 images
      with managed-path refs + alt ≤120).
- [x] `GallerySettingsEditor` (multi-upload, previews, alt editing,
      remove with confirm, reorder, blank-slot adds; no JSON).
- [x] Images reuse the section pipeline (`{clientId}/sections/gallery/`,
      validation/magic-bytes/optimization, orphan cleanup on save).

## 32.2 Public renderer

- [x] `GallerySection`: responsive grid (2→3 cols) / pure-CSS masonry,
      lazy-loaded images with alt text, blank refs skipped, empty
      gallery collapses.
- [x] Sanitized images only (schema-shaped refs resolved to public URLs
      at render; nothing else can reach an `<img src>`).

## 32.3 Tests + verification

- [x] Schema validation (limits, bad layout, foreign refs rejected).
- [x] Upload security (gallery-scoped path, normalization intact).
- [x] Deletion (gallery path routes to `profile-assets` via the gate).
- [x] Ordering (shared `moveSectionId` + service reorder paths).
- [x] Public rendering (grid, masonry, alt, lazy, collapse).
- [x] Isolation (cross-client denial; audience PERSON + BUSINESS —
      covers PERSON/BUSINESS/RESTAURANT/STORE use cases).
- [x] `typecheck`, `lint`, `test` (54 files / 610 tests), `build` green.

### Phase 32 gate

- [x] Gallery works end-to-end (add → photos → render → hide).
- [x] No direct storage leakage (referenced images only).
- [x] Checks pass.

> 2026-09-21: implemented per plan (no migration — gallery predates the
> Phase 26 type CHECK). `format:check` = pre-existing repo-wide CRLF
> baseline. Not committed — ready for review.

---

# Phase 33 — Profile Builder UX

Premium visual builder on the existing section architecture: live
preview, completion, onboarding, presets. No migration. See ADR-059.

## 33.1 Live preview

- [x] `BuilderPreview`: same section renderer as the public page in a
      phone frame, inert Share/Keep stand-ins (live islands would share
      the dashboard URL), sticky beside the manager on desktop.
- [x] Updates via `router.refresh()` — no full navigation; disabled
      sections drop exactly as publicly.

## 33.2 Completion + onboarding

- [x] `computeCompletion` (required 20pts: name/image/action;
      recommended 10pts: bio/links/location/gallery; levels).
- [x] `onboardingSteps` (identity → contact → sections → publish) derived
      from the same data — checklist agrees with the progress bar.
- [x] `CompletionCard` (progress bar + next actions) on the edit page.
- [x] `OnboardingChecklist` for DRAFT profiles (localStorage dismissal,
      no new tables).

## 33.3 Presets

- [x] Registry `presets` (gallery grid/masonry, actions tiles/buttons,
      menu cards/list); merge-over-current application via preset bar.
- [x] Real render variants: `display: tiles|buttons` (actions),
      `layout: cards|list` (menu); gallery layout already existed.
- [x] Every preset validated against its schema by test.

## 33.4 Tests + verification

- [x] Completion math (full/empty/weights/cover-channel/location-target/
      gallery-photos/disabled ignored) + onboarding states.
- [x] Preset validation across the registry.
- [x] Preview rendering (order, disabled parity, inert islands).
- [x] Onboarding markup (states, done/todo labels, all-done collapse).
- [x] `typecheck`, `lint`, `test` (57 files / 625 tests), `build` green.

### Phase 33 gate

- [x] Builder feels live without navigation.
- [x] No architecture changes (sections/registry/JSONB/security intact).
- [x] Checks pass.

> 2026-09-21: implemented per plan. `format:check` = pre-existing repo-wide
> CRLF baseline. Not committed — ready for review.

---

# Phase 33.1 — Production Regression Audit (existing profile cannot load)

> 2026-09-22: live DB never received 20260925–20260928 (no
> `profile_sections`, no `profiles.template`). Loaders demanding new
> columns answered PGRST204 → phantom "No profile configured yet" +
> "Could not load the profile." Fix = tolerant reads, zero data changes.
> See ADR-060. Not committed — ready for review.

## 33.1.1 Loader tolerance

- [x] `PROFILE_DETAIL_COLUMNS_LEGACY` (no `public_code`) + retry on
      missing-identity-column in `getProfileByClientId`/`getProfileById`.
- [x] Same fallback on create/update/status/template post-write selects.
- [x] `normalizeProfileRow` (`public_code` → `""` when absent, no writes).
- [x] `resolveProfileTemplate` (stored-compatible wins, else type default).
- [x] Edit page feeds resolved template; defensive `public_code`.
- [x] Sections unchanged best-effort (seed false, public defaults,
      manager notice/restore).

## 33.1.2 Creation flow (Case A/B)

- [x] Case A (no profile): creates with template insert-retry + best-effort seed.
- [x] Case B (existing): loader resolves → CONFLICT "Edit it instead" → editor.
- [x] No routing change needed; error path unreachable for schema drift.

## 33.1.3 Regression tests

- [x] `profileRegression.test.ts` rewritten (11 cases: legacy load, editor
      open, pre-public_code `""`, create retry, migration-pending message,
      template derivation, metadata null, Case B conflict, null-data
      completion/onboarding, seed fail-closed, modern unchanged).

### Phase 33.1 gate

- [x] Existing profiles load/edit/build with no data changes.
- [x] `typecheck`, `lint` (0 warnings), `test` (58 files / 636 tests), `build` green.
- [x] Live: 20260925–20260928 applied 2026-09-22 (sections backfilled 6/6,
      template backfilled personal/business, documents bucket private;
      anon matrix green, counts unchanged, flow verified live).

---

# Phase 34 — Unified Visual Profile Builder

One editor flow, one preview, one draft, one save. The flexible section
architecture is preserved and relocated (not removed). No DB model change.
See ADR-061.

## 34.1 Single draft + live preview

- [x] `unifiedDraft.ts`: reducer (fields/links/sections/images/template/
      status/dirty), `buildSavePayload`, `toPreviewData` adapter,
      `FIELD_STEPS` error map, 6-step model.
- [x] Preview reads the same draft the forms write (keystroke-live, no
      save, no `router.refresh()`); hostile settings stripped via
      `sanitizePublicSettings`, hostile accent falls back.
- [x] Exactly ONE preview rendered: real `ProfileSectionRenderer` in the
      `BuilderPreview` phone frame (sticky desktop; Edit/Preview tabs +
      header Preview button + full-screen sheet on mobile).
- [x] Legacy `ProfileEditor.tsx` (wizard + approximation preview) deleted;
      `LinksManager`/`SectionsManager` standalone components replaced by
      draft-first step UIs reusing modal/preset/settings renderer.

## 34.2 Integrated steps

- [x] Identity: type, template (picker new / switcher existing), naming,
      slug, bio, avatar/cover (crop+upload unchanged).
- [x] Contact: contact data + Actions integration (toggles, tiles/buttons
      preset, `maxQuickActions` 1–3 stepper, derived top-action order).
- [x] Links: full manager (add/edit/delete/enable/reorder/subtitles),
      draft-first with shared-schema validation.
- [x] Sections: content cards (drag + up/down + enable + settings +
      presets + delete) + single page order (hero pinned first, core rows
      link to their steps instead of duplicating config).
- [x] Appearance: theme/accent + gallery/menu visual presets only.
- [x] Review: draft-derived completion + onboarding, link panel, status
      control, NFC/QR entry links. Compact header keeps % + dirty/saved.

## 34.3 Unified save + safety

- [x] `saveUnifiedDraftAction`: profile + link/section end-state diffs via
      unchanged services, single revalidate + cache purge, fail-closed
      concurrent-edit detection, orphan asset cleanup preserved.
- [x] Pure `unifiedSavePlan.ts` planner (creates/updates/toggles/deletes/
      order mapping) with unit tests.
- [x] Dirty tracking + `beforeunload` guard; step navigation preserves
      state; new-profile save-once gating kept (links/sections/uploads).
- [x] `maxQuickActions` schema key (default 3 = current look),
      `pickQuickActions(limit)`, renderer honors it; no migration.
- [x] `storagePaths.ts` split keeps sharp out of the browser bundle
      (`storage.ts` re-exports; all importers work).
- [x] Security posture unchanged (ownership checks, RLS, allowlist
      sanitization, admin-isolation test green).

## 34.4 Tests + verification

- [x] `unifiedDraft.test.ts` (init/reducer/payload/adapter/helpers).
- [x] `unifiedSavePlan.test.ts` (diffs, fail-closed paths, order mapping).
- [x] `UnifiedProfileEditor.test.ts` (one preview, six steps, template in
      Identity, actions in Contact, links manager, sections order,
      appearance, review composition, dirty header).
- [x] `maxQuickActions` coverage (schema default, pick limits/clamp,
      renderer cap).
- [x] `typecheck`, `lint` (0 warnings), `test` (61 files / 676 tests),
      `build` green.
- [ ] Operator visual pass: 390 / 768 / 1024 / 1440 + keystroke-live +
      save→reload round-trip + activation from Review (no browser tooling
      here).

### Phase 34 gate

- [x] One editor, one preview, one draft, one save; sections preserved.
- [x] No database model change; no regressions in existing suites.
- [x] Checks pass.

> 2026-09-22: implemented per plan. `format:check` = pre-existing
> repo-wide CRLF baseline (new files pass individually; untouched files
> fail identically at HEAD). Not committed — left ready for review.

---

# Phase 34.1 — Finish Unified Builder UX

Closes the two remaining editor gaps: duplicate mobile preview navigation
and implicit top-action ordering. No new tables, no unrelated features.
See ADR-062.

## 34.1.1 Single mobile preview path

- [x] Edit/Preview tabs removed completely (no `tablist`, no hidden panes).
- [x] Editor is always the screen; header Preview button opens the
      full-screen sheet with the same draft-fed preview.
- [x] Sheet closes via Close/Esc/backdrop; step + form + scroll state
      preserved (nothing unmounts underneath).
- [x] Exactly one preview renderer while the sheet is closed (pinned).

## 34.1.2 Explicit primary actions

- [x] `primaryActions` in actions settings JSONB: built-ins
      (`call|whatsapp|email|website`) + `link:<uuid>` refs, max 20.
- [x] `resolvePrimaryActions` — ONE pure resolver for public page and
      admin preview (explicit order wins, stale refs skipped fail-safe,
      empty/absent = legacy order + cap, always capped at the limit).
- [x] `primaryAvailability` gates selection on live values (built-in only
      with a valid value; links only when enabled + renderable).
- [x] Contact card UI: visible cards (reorder up/down, remove without
      deleting), hidden candidates (+ to feature), unavailable hints,
      segmented Show-first 1–4 control. No implementation IDs shown.
- [x] `maxQuickActions` widened 1–4 (default 3 — existing look unchanged).
- [x] Disabled/deleted links and removed values disappear from effective
      top actions immediately (resolver) and are cleaned on next save
      (payload hygiene + server temp→real remap for pre-save promotions).
- [x] No separate save buttons: draft → instant preview → unified Save.

## 34.1.3 Tests + verification

- [x] Resolver matrix (explicit/mixed order, cap, disabled/deleted/
      missing/malformed refs, dedupe, legacy parity, sanitize).
- [x] Adapter carries `enabled`; Connect list skips disabled.
- [x] Renderer explicit-order + cap tests; legacy suites pass untouched.
- [x] Payload hygiene (stale cleaned, temp kept, legacy rows identical).
- [x] Contact card markup (visible/hidden/unavailable/segmented).
- [x] Preview↔public parity via the shared resolver; rebase preserves
      order across save/reload.
- [x] No-tabs + sheet-button + single-preview assertions.
- [x] `typecheck`, `lint` (0 warnings), `test` (61 files / 694 tests),
      `build` green.
- [ ] Operator visual pass: 390 / 768 / 1024 / 1440 + sheet open/close +
      arrange/save/reload round-trip (no browser tooling here).

### Phase 34.1 gate

- [x] One mobile preview path; explicit primary order everywhere.
- [x] No database model change; no regressions in existing suites.
- [x] Checks pass.

> 2026-09-22: implemented per plan. `format:check` = pre-existing
> repo-wide CRLF baseline (files clean at baseline stay clean; files
> failing at HEAD fail identically). Not committed — left ready for review.

---

# Phase 34.2 — Draft-Native Content Sections + True Live Preview

Every content section is add → configure immediately → preview live →
save unified. No new tables, no unrelated features. See ADR-063.

## 34.2.1 Draft-native editing

- [x] All 11 section editors converted to controlled (`value` from
      settings prop, every edit commits via `onChange`); all Save
      settings buttons removed (one persistence action: Save draft).
- [x] `SectionSettingsProps` += `onChange` + `autoFocus`; renderer
      forwards both plus the upload context.
- [x] Add instantiates registry schema defaults (never bare `{}`).
- [x] New rows auto-expand Configure + focus the first field; existing
      rows stay collapsed; core rows keep order + Go-there links.
- [x] Binary uploads stay immediate (images, CV PDF); paths join the
      draft, unified Save persists the reference.

## 34.2.2 Location + keyless map

- [x] Schema += `mapsUrl` (Google/Apple allowlist, null-tolerant) +
      `mapZoom` 1–19 (blank-tolerant); editor modes address/coords/link.
- [x] `sanitizeMapsLink` / `resolveLocationTarget` (coords → link →
      address) / `osmEmbedUrl` (bbox math, numbers-only, lazy iframe).
- [x] Renderer: OSM map card when coords exist, address card + vendor
      directions otherwise, collapse when empty (public).
- [x] Typing address/coords/toggles updates preview with no save.

## 34.2.3 Admin preview placeholders

- [x] `previewPlaceholders` plumbing (renderer → adapters → 8 content
      sections); `BuilderPreview` sets it, public pages never do.
- [x] Per-type guidance copy; same components, zero public drift.

## 34.2.4 Save behavior + errors

- [x] Unified plan already coherent (adds/updates/deletes/toggles/
      reorder/temp remap/order preserved) — no planner change needed.
- [x] Save errors carry `sectionId`; Sections step expands, scrolls to,
      focuses, and annotates the offending card (banner retained).
- [x] Stale settings never corrupt the draft (sanitizer fallback +
      per-section errors).

## 34.2.5 Tests + verification

- [x] Location validation/embed/target/zoom tests; renderer map tests.
- [x] No-save-buttons across all editors; controlled contract tests.
- [x] Per-type matrix (8 types × live/collapse/placeholder/save/reload).
- [x] Ordering, temp remap, upload/security suites still green.
- [x] `typecheck`, `lint` (0 warnings), `test` (62 files / 755 tests),
      `build` green.
- [ ] Operator visual pass: 390 / 768 / 1024 / 1440 + map load + per-type
      arrange/save/reload (no browser tooling here).

### Phase 34.2 gate

- [x] Content sections configure + preview live; one save persists all.
- [x] No database model change; no regressions in existing suites.
- [x] Checks pass.

> 2026-09-22: implemented per plan. Not committed — left ready for review.

---

# Phase 34.3 — Map-Link-Only Location

Paste one Maps link → Karti resolves exact coordinates → live OSM map.
No manual picker, no coordinate/zoom fields, no paid map services.
See ADR-064.

## 34.3.1 Link resolution

- [x] Pure `mapLinks.ts`: `extractCoordinates` (@pins, q/query pairs,
      Apple ll, OSM #map/mlat-mlon), `resolveMapLink` orchestration.
- [x] SSRF-safe short-link resolution (HTTPS-only, allowlisted hops,
      per-hop DNS verification, private-range blocking, ≤4 hops,
      timeout-guarded, no bodies read) with injected fetch/DNS for tests.
- [x] `resolveMapsLinkAction` (auth-gated, no DB): short hosts resolve,
      others extract directly, shared failure copy, never guesses.
- [x] Allowlist += openstreetmap.org; short hosts goo.gl/maps.app.goo.gl.

## 34.3.2 Link-only editor

- [x] Editor exposes title / address / maps link / show map / button
      only — latitude/longitude/zoom removed (stored, not shown).
- [x] Paste → "Detecting location…" (debounced + blur) → coordinates
      commit to draft → instant map; failure message, no guessing.
- [x] Detection commits merge over latest settings (no stale overwrites);
      clearing the link clears a detected pin, never legacy coordinates.
- [x] Resolver injected via settings context (catalog keeps its
      server-action-free boundary).
- [x] Legacy rows (coords/mapsUrl/mapZoom) render unchanged; new links
      replace the pin without recreating the section.

## 34.3.3 Renderer

- [x] OSM embed from extracted coordinates + © OpenStreetMap attribution.
- [x] Get directions prefers the original safe link (Google→Google,
      Apple→Apple, OSM→OSM), else coordinates-based vendor URLs.

## 34.3.4 Tests + verification

- [x] Extraction matrix (Google/Apple/OSM/encoded/malformed/unsafe).
- [x] SSRF matrix (non-HTTPS, off-allowlist, localhost/IP/private DNS,
      redirect escape, excessive redirects, fetch errors, HEAD→GET).
- [x] Editor markup (Maps link present; lat/lng/zoom absent).
- [x] `typecheck`, `lint` (0 warnings), `test` (63 files / 773 tests),
      `build` green.
- [ ] Operator visual pass + live short-link resolve against real
      Google/Apple/OSM links (no browser/network tooling here).

### Phase 34.3 gate

- [x] Link-only location with safe resolution and live OSM map.
- [x] No database model change; no regressions in existing suites.
- [x] Checks pass.

> 2026-09-22: implemented per plan. Not committed — left ready for review.

---

# Phase 35 — Production Domain Cutover (karti.pro)

Canonical production domain is now `https://karti.pro`
(`www` redirects to apex; `karti-bice.vercel.app` stays attached
temporarily so existing physical cards keep resolving). No feature,
schema, identity, short-code, or resolver-architecture changes — domain
cutover + verification only. No migration created.

## 35.1 Audit (2026-09-25)

- [x] Full runtime search for `karti-bice.vercel.app` / `vercel.app` /
      `localhost` / `127.0.0.1`.
- [x] Result: zero production-logic references to the old hostname. The
      single occurrence was test payload data in
      `ShareProfileButton.test.ts` (host-agnostic helper) — repointed to
      `https://karti.pro/...`.
- [x] `localhost` / `127.0.0.1` occurrences classified legitimate:
      `getAppUrl()` dev fallback, `Request` construction in route tests,
      SSRF localhost/IP blocking (`mapLinks.ts` + tests).
- [x] Verified single canonical source: every absolute public URL
      (`permanentCardUrl`, `qrPayloadForCard`, `publicProfileUrl`,
      `identityUrlForPublicCode`, vCard `profileUrl`, PWA manifest/icons,
      resolver PROFILE target, dashboard panels, metadata canonicals)
      derives from `getAppUrl()` (`NEXT_PUBLIC_APP_URL`). No hardcoded
      production host in feature files; no Host/X-Forwarded-Host reads.
- [x] Stale `karti.app` production-domain comments/examples updated to
      `karti.pro` (`.env.example`, `README.md`, `src/domain/cards.ts`,
      `src/features/profiles/urls.ts`, `src/features/pwa/manifest.ts`,
      `specs/ENVIRONMENT.md`, `specs/DEPLOYMENT.md`,
      `specs/RELEASE_CHECKLIST.md`). Historical spec examples elsewhere
      untouched.

## 35.2 Regression tests

- [x] New `src/features/cards/domain-cutover.test.ts` (15 cases, all
      under `NEXT_PUBLIC_APP_URL=https://karti.pro`): canonical source,
      exact `https://karti.pro/t/{shortCode}` permanent URL, QR/NFC/
      permanent triple parity, profile `/{slug}` + stable `/u/{code}`
      URLs, Share payload, PWA identity + absolute icons, vCard URL
      shape, canonical metadata shape, no old-host/localhost/www in any
      generated URL, evil-Host → canonical target, old-host tap → same
      resolver → same canonical destination.

## 35.3 Verification

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` (64 files / 788 tests),
      `pnpm build` green (2026-09-25).
- [x] Production smoke: `https://karti.pro` 200 (brand page, HTTPS, no
      loop); `https://karti.pro/login` 200 (sign-in renders);
      `https://karti-bice.vercel.app` serves the same app (existing
      `/t/{code}` cards keep resolving).
- [ ] `format:check` — pre-existing repo-wide CRLF baseline (unchanged
      standing note; new test file written with LF).
- [ ] Operator manual: `/{slug}`, `/u/{code}`, `/t/{code}` with existing
      production data; destination-switch invariance on a live card;
      `www.karti.pro → karti.pro` redirect (DNS resolves from here, but
      HTTP fetch times out of this sandbox); Supabase Auth Site URL +
      redirects for karti.pro; Vercel `NEXT_PUBLIC_APP_URL` =
      `https://karti.pro`; first real NFC programming from the dashboard
      panel.

### Phase 35 gate

- [x] All newly generated links/NFC/QR derive from karti.pro via env.
- [x] Old cards keep working (host-independent resolver, same app on
      both hosts).
- [x] No card identities, short codes, destinations, or assignments
      touched.
- [x] Checks pass.

> 2026-09-25: implemented per plan. Not committed — left ready for review.

---

# Phase 34.4 — Google Share-Link Resolution (encoded data + page fallback)

Normal mobile shares (`maps.app.goo.gl/…`) failed detection because final
place URLs carry `!3dLAT!4dLNG` encoded data (no `@lat,lng` pin) or expose
coordinates only in page metadata. See ADR-065. No schema change, no API
key, OSM embed unchanged.

## 34.4.1 Resolver

- [x] `extractCoordinates()`: `!3dLAT!4dLNG` + `ll`/`center`/`destination`
      pairs on Google hosts (validated ranges, numeric normalization).
- [x] `detectMapProvider()` + `resolveGoogleMaps()` / `resolveAppleMaps()` /
      `resolveOpenStreetMap()` dispatch (`resolveMapLocation` alias);
      success carries `{ provider, latitude, longitude, resolvedUrl,
      normalizedUrl }`.
- [x] Google-only bounded page fallback (`fetchPageFn`, injected):
      canonical/og:url → `@` / `!3d!4d` / `q|query|ll|center` /
      `"latitude"|"longitude"` markup scan; HTML-only, 512 KB cap,
      same SSRF envelope, no scripts, no generic scraper.
- [x] `resolveMapsLinkAction`: real bounded page fetch (no-store,
      credentials omitted, content-length pre-check); auth-gated, no DB.
- [x] `googleDirectionsUrl()` pure helper; public `LocationSection`
      directions falls back to normalized Google URL when coords exist
      (original safe link still wins).

## 34.4.2 Tests + verification

- [x] Extraction matrix: `@`, `q` (google.com + maps.google.com), `query`,
      `ll`, `!3d/!4d` (with/without `@`), out-of-range/hostile fail-closed.
- [x] Provider detection matrix (google/apple/osm/evil/unsafe).
- [x] Short → mocked redirect → `!3d/!4d` final URL → coords, no page fetch.
- [x] Page fallback: canonical/`!3d`/JSON scans → coords; non-HTML,
      page-throw, missing fetcher → fail closed; Apple/OSM never page-fetch.
- [x] SSRF matrix still green (redirect chain untouched); `googleDirectionsUrl`
      unit tests (valid + out-of-range/NaN).
- [x] `typecheck`, `lint`, `test` (64 files / 798 tests), `build` green
      (2026-09-25; one pre-existing renderer assertion updated to the
      normalized directions URL, no other regressions).
- [ ] Operator live check: real mobile `maps.app.goo.gl` share → detected
      pin → Save → reload (no re-detect) → public map → Directions.

### Phase 34.4 gate

- [x] Short-link resolution + page fallback implemented with tests.
- [x] No database change; no API key; editor/public rendering unchanged.
- [x] Full verification (`typecheck`/`lint`/`test`/`build`) green.
- [ ] Live share check with a real mobile link (no network tooling here).

> 2026-09-25: implemented + verified per plan. Not committed — left ready
> for review.

---

# Post-MVP Backlog — Do Not Implement Yet

- [ ] Customer/cardholder self-service accounts.
- [ ] Organization/team administration.
- [ ] Company employee templates.
- [ ] Duplicate-profile workflow.
- [ ] Advanced analytics.
- [ ] Lead exchange.
- [ ] Apple Wallet.
- [ ] Google Wallet.
- [ ] Custom domains.
- [ ] Subscription billing.
- [ ] Public API.
- [ ] Native Android app.
- [ ] Native iOS app.
- [ ] AI-generated profiles.
- [ ] Full CRM.
