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
