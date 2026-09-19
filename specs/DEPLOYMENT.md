# Karti — Deployment Specification

## 1. Production architecture

```text
Vercel
  → Next.js application

Supabase
  → PostgreSQL
  → Auth
  → Storage
```

Production domain:

```text
https://karti.app
```

or the final domain explicitly chosen by the user.

## 2. Deployment order

For changes requiring database migration:

```text
1. Verify migration on development/staging
2. Apply production-safe database migration
3. Deploy compatible application version
4. Smoke test
```

For breaking schema changes, design an expand/migrate/contract approach rather than creating downtime.

## 3. Vercel variables

Configure the correct environment variables for:

- Preview
- Production

Never copy production service-role secrets into client-exposed variables.

## 4. Supabase production checks

Before launch:

- migrations applied;
- RLS enabled;
- policies verified;
- Auth redirect URLs correct;
- Storage policy correct;
- production admin created securely.

## 5. Domain

Verify:

```text
https://karti.app/
https://karti.app/{profile-slug}
https://karti.app/t/{shortCode}
```

NFC and QR payloads should always use HTTPS production URLs for delivered cards.

## 6. Preview deployments

Vercel preview URLs may be used for development verification.

Do not encode preview URLs into production physical cards.

## 7. Smoke test

After production deployment:

```text
login
create/update test client
active profile opens
vCard downloads
card resolver redirects
destination changes remotely
disabled card stops redirect
QR resolves
```

If appropriate, clean up explicit test records afterward.

## 8. Rollback

Application rollback must not assume the database automatically rolls back.

Before production migrations, understand compatibility with the prior deployed application.

Avoid destructive one-way schema changes where possible.
