# 03 — Order Domain, Database & Server API

## 1. Purpose

This specification defines the persistent order model, server-side contracts, idempotency, pricing snapshot rules, lifecycle state changes, and required database relationships.

---

## 2. Core entities

New commercial domain:

```text
orders
order_items
order_item_cards
order_events
inquiries
```

Existing Karti domain remains:

```text
clients
profiles
profile_links
cards
```

The new model must be additive and must not destructively redesign existing tables.

---

## 3. Database enums

### `marketing_product_type`

```text
PERSONAL_CARD
CAREER_CARD
BUSINESS_CARD
GOOGLE_REVIEW_CARD
WHATSAPP_CARD
INSTAGRAM_CARD
CONTACT_CARD
CUSTOM_LINK_CARD
```

### `order_status`

```text
NEW
CONTACTED
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

### `payment_status`

```text
NOT_REQUIRED
PENDING
PARTIALLY_PAID
PAID
REFUNDED
```

### `fulfillment_status`

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

### `preferred_contact`

```text
WHATSAPP
PHONE
EMAIL
```

### `pricing_status`

```text
PRICED
QUOTE_REQUIRED
```

### `acquisition_source`

```text
DIRECT
ORGANIC_SEARCH
PAID_SEARCH
ORGANIC_SOCIAL
PAID_SOCIAL
REFERRAL
OTHER
UNKNOWN
```

### `order_channel`

```text
WEBSITE
DASHBOARD
OTHER
```

### `order_actor_type`

```text
SYSTEM
CUSTOMER
ADMIN
```

---

## 4. `orders`

Conceptual schema:

```sql
orders
-----------------------------------------
id uuid primary key

order_number text unique not null
idempotency_key uuid unique

channel order_channel not null default WEBSITE

customer_name text not null

phone text not null
phone_normalized text not null

whatsapp text
whatsapp_normalized text

email text
email_normalized text

preferred_contact preferred_contact not null

city text not null
delivery_address text not null
delivery_notes text

status order_status not null default NEW
payment_status payment_status not null default PENDING
fulfillment_status fulfillment_status not null default NOT_STARTED

pricing_status pricing_status not null

subtotal_minor bigint
delivery_fee_minor bigint
discount_minor bigint not null default 0
total_minor bigint
currency text not null default 'MAD'

client_id uuid null references clients(id) on delete set null

customer_notes text
internal_notes text

locale text not null

first_touch_source acquisition_source
first_landing_path text
first_referrer text
first_utm_source text
first_utm_medium text
first_utm_campaign text
first_utm_content text
first_utm_term text

last_touch_source acquisition_source
conversion_path text
last_referrer text
last_utm_source text
last_utm_medium text
last_utm_campaign text
last_utm_content text
last_utm_term text

receipt_token_hash text

created_at timestamptz not null
updated_at timestamptz not null
```

---

## 5. Orders checks

At minimum:

```text
discount_minor >= 0
subtotal_minor >= 0 when non-null
delivery_fee_minor >= 0 when non-null
total_minor >= 0 when non-null
currency length = 3
```

When:

```text
pricing_status = PRICED
```

require valid priced totals according to the approved pricing implementation.

Quote-required orders may initially have null monetary totals.

---

## 6. Human order numbers

Use an atomic Postgres sequence.

Never implement:

```text
MAX(existing_number) + 1
```

Expected display:

```text
KARTI-000001
KARTI-000002
...
```

UUID remains the primary key.

Order number is not a security credential.

---

## 7. `order_items`

```sql
order_items
-----------------------------------------
id uuid primary key

order_id uuid not null
  references orders(id)
  on delete cascade

product_type marketing_product_type not null

quantity integer not null
  check (quantity > 0)

unit_price_minor bigint
line_total_minor bigint

configuration jsonb not null default '{}'

profile_id uuid null
  references profiles(id)
  on delete set null

created_at timestamptz not null
updated_at timestamptz not null
```

V1 public checkout creates one OrderItem, but the schema remains multi-item capable.

---

## 8. `order_item_cards`

Required because quantity can exceed one:

```sql
order_item_cards
-----------------------------------------
order_item_id uuid not null
  references order_items(id)
  on delete cascade

card_id uuid not null
  references cards(id)
  on delete restrict

created_at timestamptz not null

primary key (order_item_id, card_id)
```

Never replace this relation with one `card_id` column on `order_items`.

---

## 9. `order_events`

```sql
order_events
-----------------------------------------
id uuid primary key

order_id uuid not null
  references orders(id)
  on delete cascade

event_type text not null

actor_type order_actor_type not null

actor_user_id uuid null

from_value text null
to_value text null

metadata jsonb not null default '{}'

created_at timestamptz not null
```

Events are append-only application history.

Current state remains on `orders`.

---

## 10. Required event types

At minimum:

```text
ORDER_CREATED

CUSTOMER_CONTACTED
ORDER_CONFIRMED
ORDER_CANCELLED
ORDER_COMPLETED

PAYMENT_STATUS_CHANGED
PRICE_SET

FULFILLMENT_STATUS_CHANGED

CLIENT_LINKED
CLIENT_CREATED

PROFILE_CREATED
PROFILE_LINKED

CARD_LINKED
CARD_CONFIGURED

CUSTOMER_NOTE_UPDATED
INTERNAL_NOTE_UPDATED
```

Do not build UI to rewrite or delete event history.

---

## 11. `inquiries`

```sql
inquiries
-----------------------------------------
id uuid primary key

name text not null
phone text
phone_normalized text
email text
email_normalized text
company text

inquiry_type text
message text not null

status text not null default 'NEW'

locale text

source acquisition_source
landing_path text
referrer text
utm_source text
utm_medium text
utm_campaign text
utm_content text
utm_term text

created_at timestamptz not null
updated_at timestamptz not null
```

Suggested inquiry status:

```text
NEW
CONTACTED
CLOSED
SPAM
```

---

## 12. Recommended indexes

At minimum:

```text
orders(order_number) UNIQUE
orders(idempotency_key) UNIQUE

orders(status, created_at DESC)
orders(fulfillment_status, created_at DESC)
orders(payment_status, created_at DESC)
orders(client_id)
orders(phone_normalized)
orders(email_normalized)
orders(created_at DESC)

order_items(order_id)
order_items(product_type)

order_events(order_id, created_at)

order_item_cards(card_id)
```

Do not add heavyweight search infrastructure unless simple indexed search proves insufficient.

---

## 13. `updated_at`

Use the repository's standard database trigger/convention.

Material updates to Orders and OrderItems refresh `updated_at`.

Events keep independent immutable `created_at`.

---

## 14. Public order mutation

Expected domain operation:

```text
createPublicOrder
```

Server sequence:

1. parse request;
2. validate locale/product/quantity;
3. validate discriminated product configuration;
4. normalize customer contact fields;
5. normalize product-specific fields;
6. derive approved pricing;
7. derive attribution;
8. validate delivery;
9. check idempotency key;
10. atomically create Order;
11. atomically create OrderItem;
12. atomically create `ORDER_CREATED`;
13. generate/store receipt token hash when used;
14. return minimal public receipt.

A provider notification failure must not roll back a valid order.

---

## 15. Idempotency

Wizard generates an opaque UUID idempotency key before final submission.

Database:

```text
orders.idempotency_key UNIQUE
```

Repeated submission with the same key returns the already-created order receipt.

Required scenarios:

- double click;
- retry after timeout;
- server response lost after DB commit;
- browser repeats action.

---

## 16. Pricing engine contract

Suggested application responsibilities:

```text
lib/orders/pricing.ts
```

Input:

```text
product type
quantity
approved product configuration
approved delivery configuration
```

Output:

```ts
{
  pricingStatus: "PRICED" | "QUOTE_REQUIRED";
  unitPriceMinor?: number;
  subtotalMinor?: number;
  deliveryFeeMinor?: number;
  discountMinor: number;
  totalMinor?: number;
  currency: "MAD";
}
```

Client-provided amounts are ignored.

---

## 17. Product catalog contract

Suggested typed app configuration:

```ts
type MarketingProductDefinition = {
  id: ProductType;
  family: "PROFILE" | "DIRECT";
  requiresProfile: boolean;
  profileType?: "PERSON" | "BUSINESS";
  pricingMode: "FIXED" | "FROM" | "QUOTE";
  priceMinor?: number;
  minQuantity: number;
  maxDirectQuantity?: number;
};
```

Do not build a products CMS/database in V1.

---

## 18. Product configuration typing

Use a discriminated union or equivalent strict typing.

Example:

```ts
type OrderProductConfiguration =
  | {
      productType: "GOOGLE_REVIEW_CARD";
      configuration: GoogleReviewConfiguration;
    }
  | {
      productType: "WHATSAPP_CARD";
      configuration: WhatsAppConfiguration;
    }
  | ...;
```

Unknown fields must not silently pass to persistence.

---

## 19. Server mutations

Expected domain operations:

```text
createPublicOrder
createPublicInquiry

markOrderContacted
confirmOrder
cancelOrder
setOrderPrice

updatePaymentStatus
updateFulfillmentStatus

updateCustomerNotes
updateInternalNotes

linkExistingClient
convertOrderToNewClient

provisionOrderItemCard
```

Each authenticated mutation must:

- authenticate operator;
- validate input;
- verify allowed current state;
- perform mutation atomically where required;
- append relevant event;
- return a typed result.

---

## 20. State transition concurrency

Mutations must guard against stale dashboard sessions.

Conceptually:

```sql
UPDATE orders
SET ...
WHERE id = :id
AND status = :expected_current_status;
```

If nothing updates because state changed elsewhere:

- return a conflict;
- tell UI to refresh;
- do not silently overwrite newer state.

---

## 21. Cancellation metadata

Suggested structured reasons:

```text
CUSTOMER_CHANGED_MIND
UNREACHABLE
DUPLICATE
INVALID_SUBMISSION
PRICE
OTHER
```

Store event metadata and optional operator note.

Do not delete the Order.

---

## 22. Database migration safety

All schema changes must be additive.

Do not destructively alter:

```text
clients
profiles
profile_links
cards
```

unless a separate explicit migration requirement is approved.

Foreign-key delete behavior must preserve historical order integrity.

---

## 23. Supabase generated types

After schema changes:

- regenerate/update database TypeScript types using the project's existing workflow;
- do not maintain hand-written row types that drift from actual DB schema.
