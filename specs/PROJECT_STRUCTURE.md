# Karti — Project Structure

The exact implementation may evolve, but module ownership should stay clear.

## Recommended layout

```text
.
├── specs/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   ├── (public)/
│   │   │   └── [slug]/
│   │   ├── t/
│   │   │   └── [code]/
│   │   ├── login/
│   │   ├── dashboard/
│   │   │   ├── clients/
│   │   │   ├── profiles/
│   │   │   ├── cards/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── vcard/
│   │       └── qr/
│   │
│   ├── components/
│   │   ├── public-profile/
│   │   ├── dashboard/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── profiles/
│   │   ├── profile-links/
│   │   ├── cards/
│   │   ├── nfc/
│   │   └── qr/
│   │
│   ├── domain/
│   │   ├── cards/
│   │   ├── profiles/
│   │   ├── urls/
│   │   ├── slugs/
│   │   └── vcard/
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   ├── validation/
│   │   ├── env/
│   │   └── logging/
│   │
│   └── types/
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
│
└── tests/
```

Do not reorganize working code solely to match this tree.

## Module ownership

### `app/`

Route composition and framework boundaries.

Should not contain large amounts of business logic.

### `features/`

Feature-specific UI, actions, schemas and application logic.

### `domain/`

Framework-independent product rules.

Examples:

```text
normalizeSlug
validateSafeUrl
resolveDestination
buildVCard
generateShortCode
```

### `lib/supabase/`

Supabase client creation and infrastructure-specific helpers.

Never scatter service-role initialization around the codebase.

### `components/ui/`

Reusable primitives only.

Do not put Karti-specific business logic in generic UI components.

## Dependency direction

Preferred:

```text
app
↓
features
↓
domain

features
↓
lib/infrastructure
```

Avoid domain modules importing React/Next.js/Supabase-specific APIs.

## Public/admin separation

Public profile components must not import dashboard-only code.

This prevents:

- unnecessary client bundles;
- accidental private data coupling;
- poor performance.

## Generated code

Generated Supabase types may live under:

```text
src/types/database.generated.ts
```

or another clearly named location.

Generated code must not be hand-edited.
