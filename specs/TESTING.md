# Karti — Testing & Verification Specification

## Quality gate

Use the repository's actual scripts, with equivalent checks for:

```text
typecheck
lint
test
build
```

User-facing work also requires visual/interaction verification.

## High-value unit tests

Prioritize:

```text
slug normalization
reserved slug detection
safe external URL validation
card short-code generation
card destination resolution
vCard generation
status helpers
```

## Integration tests

Cover:

- create/update client;
- create/update profile;
- slug uniqueness;
- profile-link CRUD/reorder;
- assign card;
- profile destination;
- external URL destination;
- disable card;
- redirect resolution.

## Redirect matrix

| Card state | Destination | Expected |
|---|---|---|
| Missing | — | unavailable/not found |
| UNASSIGNED | — | unavailable |
| DISABLED | valid | unavailable |
| LOST | valid | unavailable |
| REPLACED | valid | unavailable |
| ACTIVE | active PROFILE | redirect to profile |
| ACTIVE | missing PROFILE | unavailable |
| ACTIVE | inactive PROFILE | unavailable |
| ACTIVE | valid EXTERNAL_URL | redirect |
| ACTIVE | unsafe URL scheme | unavailable |

## Public profile

Verify:

- active profile renders;
- inactive/draft does not;
- missing optional fields disappear cleanly;
- Save Contact is wired correctly;
- phone/email/WhatsApp links are correct;
- link order/enabled flags are respected;
- private client notes never appear.

## vCard

Test:

- name;
- organization;
- title;
- phone;
- email;
- URL;
- special-character escaping;
- optional missing fields.

## RLS

Verify actual behavior for:

```text
anonymous
authenticated admin
```

Test reads and writes.

Policy definitions alone are not proof.

## UI/responsive

At minimum verify:

```text
320px
390px
768px
1024px
1440px
```

Critical screens:

- public profile;
- login;
- clients;
- client detail;
- profile editor;
- cards;
- card detail/configuration;
- create-client flow.

Check:

- no horizontal overflow;
- readable typography;
- touch targets;
- visible CTAs;
- loading/empty/error states;
- keyboard/focus behavior.

## NFC

Put Web NFC behind a small adapter so logic can be mocked.

Test states:

```text
supported
unsupported
permission denied/error
success
```

Real hardware verification is required before claiming NFC writing is production-ready.

## QR

QR must encode exactly:

```text
https://karti.app/t/{shortCode}
```

Never the current final destination.

## Regression rule

For a bug:

```text
reproduce
→ add regression test when practical
→ fix
→ run test
→ run related suite
```

## Reporting

Agent must report only checks actually run.

Good:

```text
Typecheck: passed
Lint: passed
Tests: 42 passed
Build: passed
Visual verification: Chrome 390/1440
```

Bad:

```text
Everything should work.
```
