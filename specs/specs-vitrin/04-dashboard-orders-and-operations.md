# 04 — Dashboard Orders & Operations

## 1. Purpose

The Orders area is the operational bridge between website demand and the existing Karti Client/Profile/Card workflow.

The operator must be able to answer, from one place:

- who ordered;
- what they ordered;
- where the order came from;
- what is missing;
- what stage it is in;
- what action must happen next;
- which Client/Profile/Card records are connected.

---

## 2. Navigation

Existing dashboard adds:

```text
Home
Orders
Clients
Cards
Settings
```

Do not remove existing sections.

Orders should appear before Clients because commercial demand occurs before client conversion.

---

## 3. `/dashboard/orders`

Desktop uses a table.

Mobile uses a responsive list/card representation.

Header:

```text
Orders
```

Operational summary:

```text
New
Needs action
In progress
Ready
```

Counts must be real DB-derived values.

---

## 4. Main tabs

```text
Orders
Inquiries
```

Inquiry management may remain simpler than Order management in V1.

---

## 5. Order views/filters

Required:

```text
All
New
Needs action
In progress
Ready
Completed
Cancelled
```

Additional filters:

- product;
- payment state;
- fulfillment state;
- acquisition source;
- date range where practical.

Filters must use server-side queries.

---

## 6. Pagination

Server-side.

Recommended initial page size:

```text
25
```

State should be represented in URL query parameters.

Example:

```text
/dashboard/orders?status=NEW&page=2&q=ahmed
```

Back/forward navigation must preserve the operator's view.

---

## 7. Search

Search should support:

- order number;
- customer name;
- phone;
- WhatsApp;
- email.

Where practical, include business name/product configuration search without unbounded client-side scans.

Do not load all Orders into the browser just to filter them.

---

## 8. Orders table

Recommended columns:

```text
Order
Customer
Product
Qty
Total
Payment
Stage
Source
Created
```

Default sort should prioritize unresolved work and otherwise newest first.

Do not overload rows with full Order detail.

---

## 9. Needs Action logic

Do not persist a fragile `needs_action` boolean.

Derive operational state.

Examples:

```text
NEW
→ operator action: contact customer

CONTACTED + QUOTE_REQUIRED + no price
→ operator action: set price

CHANGES_REQUESTED
→ operator action: revise design

READY
→ operator action: ship/deliver

AWAITING_APPROVAL
→ waiting on customer, not operator
```

Dashboard may distinguish:

```text
Needs action
Waiting on customer
```

The derivation must be centralized/tested.

---

## 10. Order detail route

```text
/dashboard/orders/[id]
```

This screen is the operational command center.

Header example:

```text
← Orders

KARTI-000124                    CONFIRMED
Google Review Card ×2
Created Sep 28, 2026
```

Actions are state-aware.

Do not show every possible workflow button simultaneously.

---

## 11. Customer section

Show:

```text
Name
Phone
WhatsApp
Email
Preferred contact
```

Quick actions when available:

```text
WhatsApp
Call
Email
```

WhatsApp action should include the order number where useful.

---

## 12. Product section

For each OrderItem show:

- product display name;
- quantity;
- human-readable configuration;
- unit price if applicable;
- line total if applicable.

Never render raw configuration JSON as the main operator UX.

---

## 13. Delivery section

Show:

```text
City
Address
Delivery instructions
```

No shipping-provider integration in V1.

---

## 14. Payment section

Show:

```text
Pricing status
Subtotal
Delivery
Discount
Total
Payment status
```

Allow authorized operator to:

- set approved quote price;
- update payment status.

Every material change writes an event.

---

## 15. Attribution section

Operator-friendly fields:

```text
First source
First landing page
First campaign
First referrer

Conversion page
Last source
Last campaign
```

Hide empty fields.

Do not display raw tracking noise unnecessarily.

---

## 16. Related Karti resources

Show linked:

```text
Client
Profile(s)
Card(s)
```

Each entity should link to the existing appropriate dashboard view.

---

## 17. Notes

Keep separate:

```text
Customer notes
Internal notes
```

Customer notes describe customer-supplied requirements.

Internal notes are operator-only.

Internal notes must never appear in public receipt/API output.

---

## 18. Timeline

Use `order_events`.

Show:

- event;
- actor type/user where appropriate;
- timestamp;
- useful metadata.

Event history is append-only.

Current state comes from the Order record.

---

## 19. State-aware actions

### NEW

Primary:

```text
WhatsApp / Call
Mark contacted
```

Secondary:

```text
Cancel
```

### CONTACTED

Primary:

```text
Confirm order
```

Where applicable:

```text
Set price
Cancel
```

### CONFIRMED

If no Client:

```text
Convert to client
Use existing client
```

If Client already linked:

```text
Start fulfillment / next appropriate step
```

### IN_PROGRESS

Primary action depends on fulfillment state:

```text
Collect missing info
Mark design sent
Mark approved
Start production
Configure NFC
Mark ready
Ship
Mark delivered
```

### COMPLETED/CANCELLED

Read-only by default for lifecycle state.

No reopen workflow in V1.

---

## 20. Mark contacted

Changing:

```text
NEW → CONTACTED
```

must write:

```text
CUSTOMER_CONTACTED
```

Do not mark contacted simply because the operator opened the page.

An explicit action is required.

---

## 21. Confirm order

Changing:

```text
CONTACTED → CONFIRMED
```

means the customer has confirmed the commercial order.

It does not imply payment.

Write:

```text
ORDER_CONFIRMED
```

---

## 22. Payment changes

Every payment transition writes:

```text
PAYMENT_STATUS_CHANGED
```

with `from_value` and `to_value`.

---

## 23. Fulfillment changes

Every fulfillment transition writes:

```text
FULFILLMENT_STATUS_CHANGED
```

Central domain logic must also update overall Order status when required.

---

## 24. Cancellation

Operator action must:

- validate cancellation is allowed from current state;
- collect optional reason/note;
- set `CANCELLED`;
- write `ORDER_CANCELLED`;
- preserve linked domain resources.

No hard-delete UI.

---

## 25. Inquiry tab

Show:

- status;
- name/company;
- contact;
- type;
- source;
- created time;
- message preview.

Allowed simple statuses:

```text
NEW
CONTACTED
CLOSED
SPAM
```

Inquiries do not automatically become Clients.

If future conversion from inquiry to order is added, that is a separate feature.

---

## 26. Dashboard Home integration

Existing dashboard Home may add:

```text
New Orders
Orders Needing Action
Ready for Delivery
```

and a small urgent-order list.

Do not remove or replace existing Client/Profile/Card operational summaries.

---

## 27. Performance

Order list queries must not:

- load full event history;
- load every related Card/Profile object;
- cause N+1 relationship queries;
- retrieve all Orders for client-side filtering.

Order detail may fetch expanded relationships.

---

## 28. Empty states

Examples:

### No orders

Explain that website Orders will appear here once visitors submit them.

### No search results

Offer clear filter reset.

### No inquiries

Simple neutral empty state.

Do not use fake/demo Orders in production.

---

## 29. Error/conflict UX

If another admin/session changes the Order before current mutation:

```text
This order was updated in another session. Refresh to see its current status.
```

Do not silently overwrite.

Technical database errors must not expose stack traces in the UI.
