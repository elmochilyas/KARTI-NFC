# Karti — Security Specification

## Goals

Protect:

- admin access;
- client/profile data;
- card-routing integrity;
- uploads/storage;
- redirect behavior;
- Supabase secrets.

Public profiles are intentionally public, but only explicitly public fields should be exposed.

## Authentication

- `/dashboard/**` requires Supabase authentication.
- Server-side enforcement is mandatory.
- Public profiles do not require auth.
- Logout must invalidate the local session correctly.

Hiding UI is not authorization.

## Authorization

Every write operation must be authorized server-side and/or by RLS.

Do not trust IDs from the browser merely because the session is authenticated.

## RLS

RLS remains enabled on exposed tables.

Anonymous users must not read:

- client notes;
- full administrative client records;
- card inventory;
- admin metadata;
- draft/inactive profiles.

Anonymous users must not mutate data.

## Redirect safety

`/t/[code]` is security-sensitive.

Allow only:

```text
https:
http:
```

Reject at minimum:

```text
javascript:
data:
file:
vbscript:
```

Use `URL` parsing, not simple string-prefix checks.

Revalidate external destinations at redirect time, not only when saved.

## Slugs

Validate:

- allowed chars;
- length;
- reserved routes;
- uniqueness.

Slugs are public IDs, not secrets.

## Card codes

- random;
- non-sequential;
- public but not authorization secrets;
- must never contain privileged data.

Possessing a card code must not grant dashboard access.

## Uploads

For avatars/covers:

- restrict file size;
- restrict safe image MIME types;
- validate on trusted boundary;
- generate safe storage names/paths;
- avoid executable uploads;
- do not trust extension alone.

Prefer disallowing SVG in MVP unless intentionally secured.

## Secrets

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
DB password
private API keys
auth tokens
```

Do not commit secrets.

## Input validation

Validate:

- form fields;
- slugs;
- URLs;
- UUIDs;
- short codes;
- statuses;
- uploaded files.

Client validation is for UX; server/database validation is authoritative.

## XSS

Do not render arbitrary HTML from:

- bio;
- labels;
- company name;
- notes.

Use plain text unless sanitized rich text is explicitly introduced later.

## Errors/logging

Do not return stack traces or DB internals to public users.

Never log passwords, tokens, service keys, or complete secret payloads.

## NFC

NFC payload contains only the public permanent URL.

Never write:

- admin tokens;
- privileged URLs;
- secrets;
- service keys.

## Production security gate

Before release verify:

- dashboard auth;
- mutation authorization;
- RLS matrix;
- unsafe redirects rejected;
- uploads restricted;
- private data absent from public output;
- service-role key absent from browser bundle;
- disabled cards stop resolving.
