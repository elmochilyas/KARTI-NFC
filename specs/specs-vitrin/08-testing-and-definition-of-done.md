# 08 — Testing & Definition of Done

## 1. Purpose

The order pipeline is complete only when the whole visitor → order → operator → client → card lifecycle works reliably.

Testing must cover domain rules, RLS/security, database integrity, and mobile UX.

---

## 2. Unit tests

### Product configuration

Required coverage for all eight products:

- valid payload;
- missing required fields;
- invalid field length;
- unknown fields;
- wrong configuration for product.

### URL normalization

- HTTPS custom links;
- rejected unsafe protocols;
- Instagram username normalization;
- Instagram URL normalization;
- rejected non-Instagram URL;
- WhatsApp destination generation;
- predefined message encoding;
- Google Review help/no-help behavior.

### Pricing

- fixed pricing;
- quantity calculation;
- quote-required product;
- delivery price when configured;
- integer minor units;
- client-submitted amount ignored.

### Attribution

- organic search;
- paid search;
- organic social;
- paid social;
- referral;
- direct;
- unknown.

### State transitions

- valid order lifecycle transitions;
- invalid transitions;
- cancellation;
- terminal state behavior;
- payment transitions;
- fulfillment transitions;
- automatic overall-state synchronization.

### Normalization

- phone;
- WhatsApp;
- email;
- URL trimming/normalization.

---

## 3. Integration/database tests

Required:

1. Public order creation produces exactly:
   - one Order;
   - one OrderItem;
   - one `ORDER_CREATED` event.

2. Anonymous user cannot select Orders.

3. Anonymous user cannot update Orders.

4. Anonymous user cannot directly insert commercial rows.

5. Duplicate idempotency key returns/reuses same Order.

6. Concurrent human order-number generation remains unique.

7. Priced Order stores server-approved price snapshot.

8. Quote-required Order supports nullable amounts.

9. Authorized dashboard operator can read Orders.

10. Unauthorized authenticated user cannot read Orders.

11. Status transition writes correct event.

12. Payment transition writes event.

13. Fulfillment transition writes event.

14. Conversion creates exactly one Client.

15. Repeated conversion is idempotent.

16. Existing-Client linking does not create duplicate Client.

17. Profile products create/reuse valid Profile according to mapping.

18. Direct-action products do not create unnecessary Profile.

19. Multi-quantity Order supports several `order_item_cards`.

20. Cancellation preserves Order and history.

21. Internal notes never appear in public receipt.

22. Reserved-slug protection continues passing.

23. Direct-action card provisioning uses existing `/t/{short_code}` system.

24. Profile cards continue resolving correctly after profile slug/info change.

---

## 4. E2E scenarios

### E2E-01 — Google Review with URL

```text
Product page
→ Order
→ configuration
→ customer details
→ delivery
→ review
→ submit
→ success
→ dashboard
```

Verify correct product/configuration/attribution.

### E2E-02 — Google Review needing URL help

No review URL.

`needsUrlHelp = true`.

Order succeeds.

Dashboard highlights unresolved destination.

Card configuration cannot finish until URL is resolved.

### E2E-03 — Career Card without CV

Customer selects `hasCv = false`.

Order succeeds.

Operator converts to Client + PERSON Profile.

### E2E-04 — WhatsApp Card

Phone + predefined message.

Verify canonical generated destination.

### E2E-05 — Duplicate submit

Double-submit final CTA.

Exactly one Order.

### E2E-06 — Existing Client

Order matches known customer.

Operator deliberately chooses existing Client.

No duplicate Client/Profile.

### E2E-07 — Multi-quantity

Quantity 3.

Provision three physical Cards.

Verify three `order_item_cards` rows.

### E2E-08 — Cancellation

Cancel from allowed state.

Order/history remains.

### E2E-09 — Mobile checkout

Complete on narrow viewport.

No clipping, inaccessible CTA, lost state, or horizontal overflow.

### E2E-10 — Unauthorized dashboard access

Unauthenticated user cannot access Orders dashboard.

### E2E-11 — Concurrency

Two sessions attempt incompatible transitions.

One succeeds; stale session receives conflict.

### E2E-12 — Receipt privacy

Public receipt shows minimal safe summary only.

---

## 5. Manual QA matrix

At minimum manually verify:

```text
Google Review Card
Career Card
Business Card
WhatsApp Card
Instagram Card
Contact Card
Custom Link Card
Personal Card

repeat customer
multi-card quantity
cancelled order
quote-required order
mobile checkout
Arabic RTL
French locale
invalid URLs
invalid product query
receipt refresh
```

---

## 6. Accessibility QA

Verify:

- full keyboard checkout;
- visible labels;
- screen-reader-friendly errors;
- focus management;
- progress semantics;
- 44px-class touch targets;
- RTL correctness;
- non-color-only status indicators.

---

## 7. Security QA

Verify:

- RLS enabled on every new table;
- anonymous SQL/API access cannot read Orders;
- public browser cannot access service role;
- order numbers cannot enumerate private data;
- public mutation rejects tampered prices;
- URL protocols are constrained;
- rate limits function;
- honeypot is honored;
- personal data does not appear in analytics events;
- internal notes do not appear in public responses.

---

## 8. Performance QA

Verify:

- Order list is server-paginated;
- no full history is loaded for each Order row;
- no obvious N+1 Profile/Card queries;
- public marketing/order bundle does not import dashboard-only code;
- public order route remains responsive on mobile.

---

## 9. Migration QA

Verify:

- migration is additive;
- existing Clients work;
- existing Profiles work;
- existing Cards work;
- public profile routes work;
- `/t/{short_code}` works;
- existing RLS continues working;
- generated DB TypeScript types are updated.

---

## 10. Acceptance criteria — public ordering

Complete only when:

- all eight products have typed configuration;
- product context carries into checkout;
- four-step checkout works;
- no customer account is required;
- price cannot be manipulated client-side;
- server validates every submission;
- order creation is idempotent;
- order reference is generated safely;
- WhatsApp continuation works;
- receipt does not leak private data;
- mobile flow works;
- order route is noindex;
- recoverable failures behave correctly.

---

## 11. Acceptance criteria — Dashboard

Complete only when:

- Orders nav exists;
- server pagination works;
- search works;
- filters work;
- Needs Action logic works;
- Order detail contains all required sections;
- lifecycle actions are state-aware;
- payment updates work;
- fulfillment transitions work;
- notes work;
- timeline works;
- attribution is visible;
- Client/Profile/Card relations are visible;
- cancellation works.

---

## 12. Acceptance criteria — conversion

Complete only when:

- confirmed Order can create a new Client;
- operator can choose existing Client;
- repeated conversion cannot duplicate Client/Profile;
- product/profile mapping follows spec;
- direct-action products do not create useless Profiles;
- multi-card relations work;
- existing Karti Card orchestration is reused;
- permanent `/t/{short_code}` contract remains intact;
- atomic conversion failures do not leave partial records.

---

## 13. Required implementation report after each phase

The agent must report:

### Files changed

Exact file paths.

### Database changes

Migrations, tables, enums, functions, indexes, policies.

### Routes/screens

Exact routes.

### Business logic implemented

Explain what now works.

### Tests

Commands and results.

### Manual QA

What was manually verified.

### Known limitations

Anything not implemented.

### Progress

Update `specs/tasks.md` by checking completed tasks and leaving incomplete tasks unchecked.

Never report unfinished work as complete.

---

## 14. Final Definition of Done

The full feature is DONE only when this workflow succeeds:

```text
Visitor lands on relevant Karti page
↓
Visitor starts Order
↓
Product context carries into checkout
↓
Visitor completes 4-step Order without account
↓
Server validates and prices
↓
Exactly one Order is created
↓
Order appears as NEW in dashboard
↓
Operator contacts customer
↓
Order becomes CONTACTED
↓
Operator confirms
↓
Order becomes CONFIRMED
↓
Operator chooses existing Client or creates new Client
↓
Required Profile is created/reused only when applicable
↓
Operator progresses fulfillment
↓
Physical Card is provisioned through existing Karti Card system
↓
OrderItem links to Card(s)
↓
Card uses permanent Karti /t/{short_code}
↓
Card resolves correctly to PROFILE or EXTERNAL_URL
↓
Order reaches READY
↓
Order reaches DELIVERED
↓
Order becomes COMPLETED
↓
Timeline, attribution, pricing snapshot, and relationships remain intact
```

If that complete chain is not reliable, the project phase is not finished.
