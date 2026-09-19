# Karti — Architecture Specification

## Architecture style

Use a modular monolith.

```text
Browser
  ↓
Next.js on Vercel
  ├── Public profile pages
  ├── /t/[code] redirect resolver
  ├── Admin dashboard
  ├── Server Actions / Route Handlers
  ├── vCard endpoint
  └── QR functionality
  ↓
Supabase
  ├── PostgreSQL
  ├── Auth
  └── Storage
```

No separate backend service is required for MVP.

## Application areas

### Public

Responsibilities:

- render active public profiles;
- resolve permanent card URLs;
- provide vCard downloads;
- show safe unavailable/not-found states.

Public routes must not depend on dashboard UI bundles.

### Dashboard

Responsibilities:

- admin authentication;
- clients;
- profiles;
- profile links;
- cards;
- destination switching;
- NFC setup;
- QR generation;
- search/filtering.

### Domain logic

Business rules belong outside JSX when practical.

Examples:

```text
normalizeSlug()
validateExternalUrl()
generateCardShortCode()
resolveCardDestination()
buildVCard()
```

## Suggested structure

```text
src/
├── app/
│   ├── (public)/
│   │   └── [slug]/
│   ├── t/[code]/
│   ├── login/
│   ├── dashboard/
│   │   ├── clients/
│   │   ├── profiles/
│   │   ├── cards/
│   │   └── settings/
│   └── api/
│       └── vcard/
├── components/
│   ├── public-profile/
│   ├── dashboard/
│   └── ui/
├── features/
│   ├── auth/
│   ├── clients/
│   ├── profiles/
│   ├── links/
│   ├── cards/
│   ├── nfc/
│   └── qr/
├── domain/
│   ├── cards/
│   ├── profiles/
│   ├── urls/
│   └── vcard/
├── lib/
│   ├── supabase/
│   ├── validation/
│   └── env/
└── types/
```

Do not reorganize working code merely to match this tree.

## Rendering

### Public profile

Prefer Server Components/server rendering.

Use client components only for genuine browser interaction.

Goals:

- useful HTML quickly;
- minimal client JS;
- good metadata;
- optimized images.

### Dashboard

Use Server Components for data boundaries where practical and Client Components for interactive editing/live preview.

### Redirect resolver

`/t/[code]` runs server-side.

Flow:

```text
validate code
→ find card
→ verify ACTIVE
→ resolve destination
→ validate target
→ redirect
```

## Data access

Separate:

```text
browser Supabase client
server user-scoped Supabase client
server privileged client only where necessary
```

Never expose service-role credentials.

RLS remains part of the security model.

## Mutation flow

```text
UI
→ schema validation
→ authenticated server boundary
→ authorization
→ database mutation
→ normalized result
→ UI feedback
```

Hidden fields are not authorization.

## Domain rules

### Client
- administrative/customer relationship record;
- may exist without profile/card.

### Profile
- belongs to client;
- has unique slug;
- contains public identity information;
- owns ordered links;
- can be DRAFT, ACTIVE, INACTIVE.

### Card
- independent physical asset;
- has permanent random short code;
- may be unassigned;
- can be disabled/lost/replaced;
- resolves to profile or external URL.

Do not force one-card-per-client at the architecture level.

## Destination types

MVP:

```text
PROFILE
EXTERNAL_URL
```

Instagram, Google Reviews, WhatsApp, websites, booking links, etc. are external URLs unless their behavior later requires a separate type.

## Caching

Public profiles may be cached if invalidation is reliable.

Redirect resolution must reflect admin destination changes quickly. Correctness is more important than aggressive caching for `/t/[code]`.

## Errors

Use explicit domain outcomes such as:

```text
CARD_NOT_FOUND
CARD_DISABLED
PROFILE_NOT_FOUND
PROFILE_INACTIVE
INVALID_DESTINATION
SLUG_TAKEN
UNAUTHORIZED
VALIDATION_ERROR
```

Do not expose DB internals to visitors.

## Future compatibility

Leave room for:

- client self-service;
- organizations;
- teams;
- custom domains;
- analytics;
- billing.

Do not implement them in MVP.
