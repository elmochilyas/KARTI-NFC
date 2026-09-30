# 01 — Product & Business Rules

## 1. Scope

This document defines the fixed commercial model for Karti's vitrine and ordering system.

It is authoritative for:

- product identifiers;
- product families;
- profile/direct-destination mapping;
- order lifecycle;
- payment lifecycle;
- fulfillment lifecycle;
- pricing principles;
- client/profile/card separation;
- rules that must not be reinterpreted by the implementation agent.

---

## 2. Existing Karti invariants

These rules are non-negotiable.

### 2.1 Domain separation

```text
Order != Client != Profile != Card
```

An **Order** is a commercial transaction/request.

A **Client** is a confirmed Karti customer.

A **Profile** is a digital identity/destination when required.

A **Card** is the physical NFC object.

### 2.2 Permanent NFC URL

Physical NFC cards and their QR equivalent must continue using the permanent Karti redirect:

```text
<configured Karti public base>/t/{short_code}
```

Do not write final destinations such as Instagram, WhatsApp, Google Reviews, or a profile slug directly onto the NFC chip.

The redirect route remains responsible for resolving:

```text
PROFILE
or
EXTERNAL_URL
```

This is what allows destinations to change without rewriting the card.

### 2.3 Existing public routes

The implementation must preserve:

```text
/{slug}
/t/{short_code}
/api/vcard/{slug}
```

### 2.4 Existing orchestration

Any card created or configured because of an order must use the existing client-centric card orchestration rather than a new parallel provisioning system.

---

## 3. Commercial product catalog

Karti V1 exposes eight canonical commercial products.

### Smart Profile Cards

```text
PERSONAL_CARD
CAREER_CARD
BUSINESS_CARD
```

### Direct / Focused Action Cards

```text
GOOGLE_REVIEW_CARD
WHATSAPP_CARD
INSTAGRAM_CARD
CONTACT_CARD
CUSTOM_LINK_CARD
```

Canonical identifiers are stable technical IDs and are never translated.

Suggested TypeScript contract:

```ts
type ProductType =
  | "PERSONAL_CARD"
  | "CAREER_CARD"
  | "BUSINESS_CARD"
  | "GOOGLE_REVIEW_CARD"
  | "WHATSAPP_CARD"
  | "INSTAGRAM_CARD"
  | "CONTACT_CARD"
  | "CUSTOM_LINK_CARD";
```

---

## 4. Product → domain mapping

| Product | Requires Karti profile | Profile type | Final card destination |
|---|---:|---|---|
| PERSONAL_CARD | Yes | PERSON | PROFILE |
| CAREER_CARD | Yes | PERSON | PROFILE |
| BUSINESS_CARD | Yes | BUSINESS | PROFILE |
| GOOGLE_REVIEW_CARD | No | — | EXTERNAL_URL |
| WHATSAPP_CARD | No | — | EXTERNAL_URL |
| INSTAGRAM_CARD | No | — | EXTERNAL_URL |
| CONTACT_CARD | Yes | PERSON | PROFILE |
| CUSTOM_LINK_CARD | No | — | EXTERNAL_URL |

### Career Card

Career Card is a commercial specialization of a `PERSON` profile.

Do not introduce `CAREER` as a third `profiles.type`.

Career-specific presentation can be implemented separately without breaking the existing domain model.

### Contact Card

Contact Card uses a minimal `PERSON` profile and the existing contact/vCard flow.

Do not promise or implement unsupported native-address-book auto-save hacks.

---

## 5. Product intent

### PERSONAL_CARD

Customer goal:

> Share my professional identity and contact/social information.

Core content may later include:

- name;
- photo/logo;
- title;
- company;
- bio;
- phone;
- email;
- WhatsApp;
- LinkedIn;
- Instagram;
- website;
- location;
- Save Contact.

### CAREER_CARD

Customer goal:

> Share my CV and professional career identity with recruiters and professional contacts.

Core content may include:

- full name;
- professional/target title;
- short introduction;
- CV;
- LinkedIn;
- portfolio;
- GitHub;
- email;
- phone;
- projects;
- location.

Checkout must not require the final CV or all professional links.

### BUSINESS_CARD

Customer goal:

> Present my business and give customers one place to act.

Core actions may include:

- Call;
- WhatsApp;
- Directions;
- Website;
- social links;
- business description;
- location;
- business information.

### GOOGLE_REVIEW_CARD

Customer goal:

> Reduce the steps required for a customer to reach the business's Google review destination.

Do not guarantee that the card causes more reviews.

### WHATSAPP_CARD

Customer goal:

> Start a WhatsApp conversation without manually entering the number.

### INSTAGRAM_CARD

Customer goal:

> Open a specific Instagram profile from a physical touch point.

Do not guarantee follower growth.

### CONTACT_CARD

Customer goal:

> Open a focused contact experience and make Save Contact easy.

### CUSTOM_LINK_CARD

Customer goal:

> Open any approved HTTPS destination while keeping the physical Karti card reusable.

---

## 6. Public checkout scope

V1 uses:

```text
one checkout = one product type
```

A customer may choose quantity but does not have a multi-product shopping cart in V1.

The database still uses `order_items` so multi-product orders and bundles can be added later without redesigning the order model.

---

## 7. Order business lifecycle

Primary order status:

```text
NEW
↓
CONTACTED
↓
CONFIRMED
↓
IN_PROGRESS
↓
COMPLETED
```

Cancellation may happen from:

```text
NEW
CONTACTED
CONFIRMED
IN_PROGRESS
```

and results in:

```text
CANCELLED
```

`COMPLETED` and `CANCELLED` are terminal in V1.

### Meaning

- `NEW`: public order received and not yet handled.
- `CONTACTED`: operator has actually attempted/completed first customer contact.
- `CONFIRMED`: customer has confirmed the commercial order.
- `IN_PROGRESS`: fulfillment work has begun.
- `COMPLETED`: fulfillment has reached delivery/completion.
- `CANCELLED`: order will not continue.

Order status does not represent payment or detailed production state.

---

## 8. Payment lifecycle

```text
NOT_REQUIRED
PENDING
PARTIALLY_PAID
PAID
REFUNDED
```

Normal paths:

```text
PENDING → PARTIALLY_PAID → PAID
PENDING → PAID
PAID → REFUNDED
```

Refunding never deletes an order.

Payment provider integration is out of scope for V1.

---

## 9. Fulfillment lifecycle

Supported states:

```text
NOT_STARTED
AWAITING_CUSTOMER_INFO
DESIGN
AWAITING_APPROVAL
CHANGES_REQUESTED
APPROVED
PRODUCTION
NFC_CONFIGURATION
READY
SHIPPED
DELIVERED
```

General progression:

```text
NOT_STARTED
  → AWAITING_CUSTOMER_INFO
  → DESIGN
  → AWAITING_APPROVAL
  → CHANGES_REQUESTED → DESIGN
  → APPROVED
  → PRODUCTION
  → NFC_CONFIGURATION
  → READY
  → SHIPPED
  → DELIVERED
```

Not every order must pass through every state.

Examples:

- a simple direct-action card may skip design approval;
- a hand-delivered order may move `READY → DELIVERED`;
- an order may need customer information before design or NFC configuration.

### Automatic synchronization

If a confirmed order begins fulfillment, overall `status` should become `IN_PROGRESS`.

If fulfillment becomes `DELIVERED`, overall status should become `COMPLETED` unless the order is already cancelled.

These rules must live in centralized domain logic.

---

## 10. Pricing rules

### 10.1 No invented prices

The implementation must never choose or fabricate Karti prices.

Prices come from approved product configuration.

If no approved price exists:

```text
pricingMode = QUOTE
```

### 10.2 Pricing modes

```text
FIXED
FROM
QUOTE
```

### 10.3 Money storage

Never store monetary values as floating point.

Store integer minor units.

Example:

```text
199.00 MAD → 19900
```

Default currency:

```text
MAD
```

Presentation may display `DH`/`MAD`; database values must not embed formatted currency strings.

### 10.4 Server authority

The browser never controls:

- unit price;
- subtotal;
- delivery fee;
- discount;
- total.

Server-side pricing logic is authoritative.

### 10.5 Historical snapshot

The order stores its pricing snapshot.

Changing catalog pricing later must not recalculate old orders.

---

## 11. Client conversion rule

Order submission does **not** create a Client.

The relationship is:

```text
Visitor
↓
Order
↓
Customer confirms
↓
Client
```

Only the operator converts or links the order after confirmation.

---

## 12. Repeat customer rule

One Client may have many Orders and many Cards.

If the same business/customer returns later:

```text
existing Client
← new Order
```

Do not create duplicate Clients when the operator deliberately selects an existing match.

Automatic fuzzy merging is forbidden.

---

## 13. Card creation timing

Do not create physical Card rows when:

- the order is merely submitted;
- the operator only converts the order to a Client.

Card provisioning happens later in fulfillment when the actual physical card is being prepared/configured.

This avoids unused inventory/card records.

---

## 14. Multiple-card rule

If:

```text
quantity = 5
```

one `order_item` may relate to five physical Card records.

Never model this as one nullable `card_id` on `order_items`.

Use a relation table.

---

## 15. Cancellation rule

Cancelling an order:

- changes order status to `CANCELLED`;
- writes an immutable event;
- may capture a cancellation reason;
- never deletes the order;
- never automatically deletes already-created Clients, Profiles, or Cards.

---

## 16. Out-of-scope business capabilities

V1 must not silently introduce:

- customer accounts;
- customer order portal;
- cart/multi-product checkout;
- online payment provider;
- coupons;
- subscription pricing;
- automatic refunds;
- shipping-provider integrations;
- loyalty/referral system;
- AI sales agent;
- alternate NFC URL system;
- dynamic CMS-managed product catalog.
