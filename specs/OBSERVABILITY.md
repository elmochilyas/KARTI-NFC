# Karti — Observability & Auditability

## 1. MVP objective

Provide enough diagnostics to understand failures without building a full observability platform.

## 2. Log server-side failures

Important operations:

- authentication failures;
- client/profile/card mutation failures;
- redirect resolution failures;
- invalid destination attempts;
- upload errors;
- vCard generation failures;
- NFC UI errors where reportable.

## 3. Structured context

Prefer structured logging fields:

```text
operation
error_code
resource_type
resource_id
environment
```

Never include:

- passwords;
- service-role key;
- auth token;
- full secret payloads.

## 4. Audit-sensitive operations

At minimum, important state changes should be diagnosable:

- card assigned;
- card destination changed;
- card disabled;
- profile activated/deactivated.

For MVP, database timestamps and normal logs may be sufficient.

A dedicated audit log table is not required unless implementation/user needs justify it.

## 5. Public analytics distinction

Product analytics such as card taps are not the same as operational logs.

Do not mix private debugging data into public analytics.

## 6. Error monitoring

If an error-monitoring service is later added, document it in `DECISIONS.md` and avoid exposing personal data unnecessarily.
