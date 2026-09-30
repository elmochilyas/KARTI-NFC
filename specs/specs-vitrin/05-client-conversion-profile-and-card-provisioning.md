# 05 — Client Conversion, Profiles & Card Provisioning

## 1. Purpose

This specification defines how a confirmed website Order becomes operational Karti domain records.

The conversion system must preserve the existing Karti domain and avoid duplicate Clients, Profiles, or Card infrastructure.

---

## 2. Conversion eligibility

Normal conversion begins only once:

```text
order.status = CONFIRMED
```

A cancelled Order cannot be converted.

An already-converted Order must return/reuse its existing Client relation rather than creating duplicates.

---

## 3. Existing-client detection

When operator chooses conversion, show candidate existing Clients based on normalized:

```text
phone
email
```

Name/company may support the display/ranking of candidates but must not be the sole automatic matching key.

Example UX:

```text
Possible existing client

Ahmed B.
+212...

[ Use this client ]
[ Create new client ]
```

The operator decides.

Never auto-merge fuzzy matches.

---

## 4. Atomic conversion

Conversion is a logical transaction.

Preferred implementation:

- Postgres RPC/function, or
- another truly atomic DB transaction mechanism already used in the repository.

Do not implement conversion as a series of unrelated browser calls.

Atomic conversion must:

1. authenticate authorized operator;
2. lock/read Order;
3. verify valid state;
4. return existing `orders.client_id` if already converted;
5. create or link selected Client;
6. create/reuse Profile only if product requires one;
7. link `orders.client_id`;
8. link `order_items.profile_id` where applicable;
9. append relevant events;
10. commit as one logical unit.

If using `SECURITY DEFINER`:

- use explicit safe `search_path`;
- perform authorization inside the function;
- grant execution only to intended roles.

---

## 5. Client creation mapping

At minimum:

```text
client.name = order.customer_name
client.phone = order.phone
client.email = order.email
```

Use product configuration for company/business data where appropriate.

Do not copy arbitrary Order JSON into `clients`.

Preserve existing Client validation/constraints.

---

## 6. Profile mapping

### PERSONAL_CARD

Create/reuse:

```text
profiles.type = PERSON
```

Use available name/title information.

Missing profile information remains incomplete for operator follow-up.

### CAREER_CARD

Create/reuse:

```text
profiles.type = PERSON
```

No third profile type.

Career-specific links/CV are populated later through the profile workflow.

### BUSINESS_CARD

Create/reuse:

```text
profiles.type = BUSINESS
```

Use business name where available.

### CONTACT_CARD

Create/reuse:

```text
profiles.type = PERSON
```

Minimal contact-focused profile.

---

## 7. Existing one-profile-per-client constraint

Current Karti enforces one profile per Client.

Conversion must respect that rule.

If an existing Client already has a compatible Profile:

- reuse it when valid.

If the existing Profile conflicts with requested product semantics:

- do not silently overwrite;
- do not bypass constraints;
- surface an operator conflict requiring deliberate resolution.

Example:

```text
Existing Client has BUSINESS profile.
New Personal Card order expects PERSON profile.
```

This must not silently mutate the Business profile into Person.

---

## 8. Direct-action products

Direct products do not create Profiles:

```text
GOOGLE_REVIEW_CARD
WHATSAPP_CARD
INSTAGRAM_CARD
CUSTOM_LINK_CARD
```

Their future physical cards use:

```text
destination = EXTERNAL_URL
```

---

## 9. Destination rules

### GOOGLE_REVIEW_CARD

If a review URL was supplied and validated:

```text
destination = review URL
```

If:

```text
needsUrlHelp = true
```

Client conversion may still happen, but final card configuration is blocked until the operator resolves a valid destination.

### WHATSAPP_CARD

Server generates canonical destination from normalized number:

```text
https://wa.me/{digits}
```

Append URL-encoded text only when predefined message exists.

Do not accept arbitrary customer-provided WhatsApp destination URLs.

### INSTAGRAM_CARD

Normalize to canonical Instagram profile URL.

Reject arbitrary non-Instagram destinations for this product.

### CUSTOM_LINK_CARD

Use validated HTTPS destination.

---

## 10. Card provisioning timing

Converting to a Client does not create/provision physical Cards.

Cards are provisioned later when fulfillment reaches the relevant stage.

Typical point:

```text
NFC_CONFIGURATION
```

or immediately before it according to existing Karti workflows.

---

## 11. Reuse existing card orchestration

When physical Card provisioning occurs, reuse existing Karti logic.

Expected result:

```text
Client
↓
Card
↓
PROFILE or EXTERNAL_URL
↓
ACTIVE
↓
permanent /t/{short_code}
```

Do not introduce:

- a new short-link system;
- direct NFC destinations;
- an Order-specific redirect format.

---

## 12. Multi-card fulfillment

If OrderItem quantity = 3:

- provision/link three physical Card records;
- each Card has its own card number/short code;
- each relation is stored in `order_item_cards`.

For a Profile product:

- all cards normally point to the same Profile.

For a Direct product:

- all cards normally point to the same external destination.

Any future per-card customization is outside V1 unless already supported by current card orchestration.

---

## 13. Order relation events

Expected conversion/provisioning events:

```text
CLIENT_CREATED
CLIENT_LINKED

PROFILE_CREATED
PROFILE_LINKED

CARD_LINKED
CARD_CONFIGURED
```

These events are historical/audit records.

They do not replace the real foreign-key relationships.

---

## 14. Repeat customer example

Existing restaurant has:

```text
Client
Business Profile
Business Card
```

Later orders:

```text
Google Review Card
```

Flow:

```text
Order
↓
candidate existing Client shown
↓
operator selects restaurant Client
↓
orders.client_id = existing Client
↓
no duplicate Business Profile
↓
new physical Card later provisioned
↓
EXTERNAL_URL → review destination
```

---

## 15. Career Card example

```text
NEW order
↓
CONTACTED
↓
CONFIRMED
↓
convert to new Client
↓
PERSON profile created
↓
collect CV / LinkedIn / portfolio later
↓
profile completed
↓
design/production
↓
physical Card provisioned
↓
Card destination = PROFILE
↓
NFC written with /t/{short_code}
```

---

## 16. Google Review example

```text
NEW order
↓
CONTACTED
↓
CONFIRMED
↓
convert/link Client
↓
resolve Google review URL if missing
↓
design/production
↓
physical Card provisioned
↓
Card destination = EXTERNAL_URL
↓
NFC written with /t/{short_code}
```

---

## 17. Idempotency

Conversion and provisioning operations must be safe against repeated operator clicks.

Repeated conversion:

- must not duplicate Client;
- must not duplicate Profile;
- must return existing linked result.

Repeated card provisioning action:

- must detect already-linked quantity and avoid accidental extra Cards;
- if only some quantity is provisioned, UI/domain logic should clearly show remaining quantity.

---

## 18. Cancellation after domain creation

If Order is cancelled after Client/Profile/Card records exist:

- do not automatically delete Client;
- do not automatically delete Profile;
- do not automatically delete Card;
- preserve Order history.

Any resource retirement/deactivation must follow existing Karti domain rules and be an explicit operator action.

---

## 19. Lost/replaced/retired Cards

Order history remains historically linked through `order_item_cards`.

Existing Card lifecycle statuses remain authoritative.

Do not delete Order relationships merely because a Card becomes LOST, REPLACED, RETIRED, or DISABLED.
