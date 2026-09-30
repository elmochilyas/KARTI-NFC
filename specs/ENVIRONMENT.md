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
KARTI_SALES_WHATSAPP=
RECEIPT_TOKEN_SECRET=
RATE_LIMIT_SECRET=
NEXT_PUBLIC_GTM_ID=
```

Exact names may vary if the existing project already has conventions.

## 2b. Production environment contract (Phase 6)

| Variable | Required in prod | Visibility | Purpose / behavior when missing |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | App cannot connect; fail clearly at startup. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | App cannot connect; fail clearly at startup. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only | Public reads (profiles/resolver/vCard/receipt), order writer RPCs fail closed; never `NEXT_PUBLIC_`, never logged. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public | Canonical base for NFC/QR/profile/vCard URLs. Prod: `https://karti.pro`. |
| `RECEIPT_TOKEN_SECRET` | Yes (min 16 chars) | Server-only | Binds receipt tokens to idempotency keys; public order creation fails closed without it. |
| `RATE_LIMIT_SECRET` | Yes (min 16 chars) | Server-only | Derives non-reversible rate-limit abuse keys; public submission fails closed without it. |
| `KARTI_SALES_WHATSAPP` | Optional | Server-only | Sales CTA number; when unset the success-page CTA hides and ordering still works. |
| `NEXT_PUBLIC_GTM_ID` | Optional | Public | GTM container (`GTM-PCXTLTM7` in production). GA4 is configured INSIDE GTM — never add a direct `gtag.js` script. When unset, GTM does not load and the app keeps working. |

Rules: service-role, receipt, and rate-limit secrets are server-only
(`src/lib/env-server.ts`, `server-only` guarded); never `NEXT_PUBLIC_`
prefixed, never serialized, never logged. See
`specs/specs-vitrin/PRODUCTION_CHECKLIST.md` for the full release gate.

## 3. Exposure rules

May be browser-visible:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GTM_ID
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
