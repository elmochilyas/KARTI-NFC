# Karti — Error Handling Specification

## 1. Goals

Errors should be:

- predictable for code;
- understandable for users;
- actionable for admins;
- safe for public visitors.

## 2. Domain error codes

Use stable codes for important failures.

Suggested:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT

CLIENT_NOT_FOUND
PROFILE_NOT_FOUND
PROFILE_INACTIVE
SLUG_TAKEN

CARD_NOT_FOUND
CARD_NOT_ACTIVE
CARD_UNASSIGNED
INVALID_CARD_DESTINATION

INVALID_EXTERNAL_URL
UPLOAD_INVALID_TYPE
UPLOAD_TOO_LARGE
NFC_UNSUPPORTED
NFC_WRITE_FAILED
```

## 3. Server action result

Use one consistent pattern.

Example:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

The implementation may differ, but callers should not need to parse random exception strings.

## 4. Forms

Validation errors:

- appear near the relevant field;
- preserve entered values where possible;
- do not clear the entire form;
- use plain language.

## 5. Public profile errors

For unknown/inactive profiles:

- do not reveal internal status details;
- return a clean not-found/unavailable experience.

## 6. Card resolver errors

For missing/disabled/lost/invalid destination:

- never expose database details;
- show a branded unavailable page or safe status response;
- do not redirect to a guessed destination.

## 7. Operational dashboard errors

For failed mutation:

- show error feedback;
- keep existing data visible;
- allow retry;
- do not optimistically claim success.

## 8. Logging

Log technical context server-side:

```text
operation
resource type/id where safe
error code
request correlation context if available
```

Do not log secrets/tokens.

## 9. Unknown failures

Unexpected failures should map to a generic safe message:

```text
Something went wrong. Please try again.
```

Technical details stay in logs/development output.
