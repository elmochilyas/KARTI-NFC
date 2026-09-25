# Karti — Environment & Configuration

## 1. Environments

Preferred:

```text
local
preview/staging
production
```

Do not treat production as a development database.

## 2. Required environment values

Typical Next.js/Supabase setup:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Exact names may vary if the existing project already has conventions.

## 3. Exposure rules

May be browser-visible:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

Must remain server-only:

```text
SUPABASE_SERVICE_ROLE_KEY
database passwords
private API credentials
```

## 4. `.env.example`

Repository should contain a safe `.env.example` with empty/example values.

It must not contain real secrets.

## 5. App URL

The application must have one canonical base URL helper.

Examples:

Development:

```text
http://localhost:3000
```

Production:

```text
https://karti.pro
```

Use the canonical app URL when generating:

- permanent NFC URLs;
- QR content;
- public profile URLs;
- vCard profile URLs.

Do not hard-code production domain across random files.

## 6. Environment validation

Validate required values at startup/server initialization where practical.

Fail clearly when required configuration is absent.

## 7. Local Supabase

If local Supabase CLI is used, document:

```text
supabase start
supabase db reset
supabase migration up
```

Use repository scripts if configured.

## 8. Testing environment

Automated tests must not require destructive writes to production.

Use:

- mocks for pure unit tests;
- local/test DB for database integration;
- dedicated preview/staging environment for E2E where needed.
