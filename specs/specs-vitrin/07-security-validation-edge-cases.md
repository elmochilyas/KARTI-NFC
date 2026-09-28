# 07 — Security, Validation & Edge Cases

## 1. Purpose

Public ordering creates a new anonymous write surface against Karti's private operational system.

Security must be designed explicitly.

---

## 2. RLS

Enable RLS for all new commercial tables:

```text
orders
order_items
order_item_cards
order_events
inquiries
```

Anonymous users receive no direct general table access.

Public order/inquiry creation happens through controlled server-side application logic.

---

## 3. Anonymous access matrix

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|---|---:|---:|---:|---:|
| orders | No | No direct | No | No |
| order_items | No | No direct | No | No |
| order_item_cards | No | No | No | No |
| order_events | No | No direct | No | No |
| inquiries | No | No direct | No | No |

Authenticated dashboard access must reuse the existing Karti authorization predicate/mechanism.

Do not create weaker parallel admin rules.

---

## 4. Service role

Supabase service-role credentials must be:

- server-only;
- never `NEXT_PUBLIC_*`;
- never imported by Client Components;
- never serialized;
- never logged;
- never returned to the browser.

---

## 5. Validation authority

Client validation exists for UX.

Server validation is authoritative.

Never trust:

- product type;
- quantity;
- product configuration;
- pricing;
- destination;
- phone;
- email;
- attribution source enum;
- totals.

---

## 6. Product configuration validation

Use typed schemas, preferably Zod if consistent with repo standards.

Unknown fields should be stripped or rejected.

Reject configurations that do not match product type.

Example:

```text
WHATSAPP_CARD + reviewUrl
```

must not silently persist arbitrary keys.

---

## 7. Text limits

Recommended limits:

```text
full names: <= 120
professional titles/categories: <= 120
city: <= 120
address: <= 500
delivery notes: <= 1000
customer/internal notes: bounded
purpose/message: bounded
```

Actual exact values should be centralized and tested.

---

## 8. Phone normalization

Store:

```text
phone
phone_normalized
```

and similarly for WhatsApp.

Default UI country may be Morocco.

Support valid international numbers.

Do not deduplicate based on formatted phone strings.

---

## 9. Email normalization

Store:

```text
email
email_normalized
```

Normalize with:

```text
trim + lowercase
```

Do not remove Gmail dots or apply provider-specific rewriting.

---

## 10. URL rules

General external destinations:

- validate URL syntax;
- production uses HTTPS;
- reject non-web protocols;
- trim surrounding whitespace;
- enforce max length;
- never execute/fetch arbitrary destination merely to validate syntax.

Reject:

```text
javascript:
data:
file:
vbscript:
```

### WhatsApp

Build server-side from normalized number.

### Instagram

Accept username/@username/Instagram URL and normalize to canonical profile URL.

Reject unrelated domains.

### Google Review

Allow valid HTTPS URL.

Do not use an overly narrow hard-coded Google host list in V1.

---

## 11. Anti-spam

Minimum protection for public order/inquiry actions:

- server validation;
- honeypot;
- reasonable submission-time check;
- rate limiting;
- strict field limits;
- idempotency.

Do not permanently store raw IP address in Order business records.

CAPTCHA should not be shown to all legitimate users by default.

---

## 12. Public receipt security

Order number is not authorization.

If success information is retrievable after redirect/refresh, use a high-entropy receipt token.

Public receipt must never reveal:

- address;
- internal notes;
- full event timeline;
- payment administration;
- linked domain IDs;
- other customer data.

No public endpoint may allow enumeration of Orders by sequential order number.

---

## 13. Logging

Avoid logging full public payloads containing personal data.

Prefer:

```text
operation
order UUID/order number
product type
error code
```

Never log service-role credentials or receipt secrets.

---

## 14. Concurrency

State transitions must use expected-current-state guards.

If Order changed in another session:

- mutation returns conflict;
- UI asks operator to refresh;
- do not silently overwrite.

---

## 15. Double submit

Public final submit must be idempotent.

Repeated submission of the same idempotency key creates exactly one Order.

---

## 16. Failure scenarios

### Network fails before DB commit

- show retry;
- do not claim success.

### DB commits but response is lost

- retry with same idempotency key;
- return existing receipt.

### WhatsApp cannot open

- Order remains successfully created.

### Attribution unavailable

- use appropriate `DIRECT` or `UNKNOWN`;
- never block checkout.

### Notification provider fails

- Order remains valid;
- notification is secondary.

---

## 17. Required edge cases

### Invalid product query

Safe fallback; no crash.

### Reserved profile slug

Reject `order`, `pricing`, `fr`, etc.

### Quantity <= 0

Reject server-side.

### Browser price manipulation

Ignore browser amount.

### Wrong product configuration shape

Reject.

### Google Review URL missing while help=false

Reject.

### Google Review URL missing while help=true

Accept.

### Invalid Custom Link protocol

Reject.

### Malformed WhatsApp number

Reject.

### Arbitrary Instagram URL

Reject.

### Preferred contact EMAIL without email

Reject.

### Direct order converted before external destination resolved

Client conversion may proceed where valid, but Card configuration must remain blocked until destination exists.

### Conversion clicked twice

No duplicate Client/Profile.

### Existing Client selected

No new Client.

### Existing compatible Profile

Reuse where allowed.

### Existing incompatible Profile

Surface explicit operator conflict; never overwrite silently.

### Quantity > 1

Allow several Card links.

### Cancelled Order with Client already created

Preserve Client.

### Refunded Order

Preserve Order/history.

### Lost/replaced Card later

Preserve historical Order relation.

### Invalid/expired receipt token

Do not expose Order detail.

---

## 18. Hard deletion

No normal UI to hard-delete Orders.

If data-retention/legal deletion is later required, implement a separate deliberate administrative process.

---

## 19. Privacy

Public or analytics output must never expose:

- customer phone/email unnecessarily;
- delivery address;
- internal notes;
- service-role credentials;
- other customers' Orders;
- raw sensitive tracking context.

Marketing analytics events must not include raw contact details.
