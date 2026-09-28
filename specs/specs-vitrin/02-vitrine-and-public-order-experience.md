# 02 — Vitrine & Public Order Experience

## 1. Purpose

This document defines how visitors move from Karti's marketing site into a completed public order or inquiry.

The public experience must support both:

- visitors arriving from social media with high product awareness;
- visitors arriving from organic/AI search who need education before buying.

The public site is a conversion system, not simply a brochure.

---

## 2. Marketing information architecture

Localized public routes follow:

```text
/fr/...
/ar/...
/en/...
```

French is the initial primary locale.

Only expose a localized page in site navigation when its content is actually complete.

Core route structure:

```text
/[locale]/
├── products/
│   ├── personal-card
│   ├── career-card
│   ├── business-card
│   ├── google-review-card
│   ├── whatsapp-card
│   ├── instagram-card
│   ├── contact-card
│   └── custom-link-card
├── solutions/
│   ├── professionals
│   ├── students-job-seekers
│   └── businesses
├── how-it-works
├── pricing
├── examples
├── resources or guides
├── faq
├── contact
└── order
```

Public Karti profiles remain at:

```text
/{slug}
```

Do not move profiles under locale routes.

---

## 3. Reserved profile slugs

All marketing/system routes must be reserved case-insensitively.

At minimum:

```text
fr
ar
en
products
solutions
pricing
examples
resources
guides
faq
contact
order
orders
about
delivery
returns
privacy
terms
how-it-works
```

Preserve all existing reserved slugs.

---

## 4. Homepage conversion model

The homepage must answer these questions in order:

```text
What is Karti?
↓
What can it do for me?
↓
Show me what happens after a tap
↓
Is it easy?
↓
Which product fits me?
↓
Is this useful for someone like me?
↓
Why Karti?
↓
What does it look like?
↓
How much?
↓
What questions remain?
↓
Order
```

Recommended section order:

1. Header/navigation.
2. Hero.
3. Fast trust strip.
4. Goal selector.
5. Interactive tap demo.
6. How it works.
7. Smart Profile products.
8. Direct Action products.
9. Audience/use cases.
10. Why Karti.
11. Examples.
12. Pricing preview.
13. FAQ.
14. Final CTA.
15. Footer.

The homepage must remain understandable in the first viewport for social visitors.

---

## 5. Goal selector

Homepage must present customer outcomes rather than technical NFC categories.

Required choices:

```text
Share my professional profile → PERSONAL_CARD
Share my CV & career → CAREER_CARD
Present my business → BUSINESS_CARD
Get Google reviews → GOOGLE_REVIEW_CARD
Open WhatsApp → WHATSAPP_CARD
Open Instagram → INSTAGRAM_CARD
Share my contact → CONTACT_CARD
Open another link → CUSTOM_LINK_CARD
```

The selector may expand inline with a short product explanation before navigation.

---

## 6. Product pages

Every product page must be independently understandable because organic/social visitors may land there directly.

Reusable information architecture:

1. Hero.
2. Product outcome.
3. Tap demonstration.
4. Who it is for.
5. What the buyer gets.
6. How it works.
7. Product-specific benefits.
8. Real-life use cases.
9. Customization.
10. Pricing.
11. Examples.
12. Why Karti.
13. FAQ.
14. Related products.
15. Final CTA.

A product page must always make these clear:

- what the product does;
- what happens when the card is tapped;
- who it is for;
- whether a profile is involved;
- price/quote state;
- how to order.

---

## 7. Order entry

Product CTA:

```text
/[locale]/order?product=<public-product-slug>
```

When a valid product is supplied:

- load that product immediately;
- do not ask the visitor to select it again.

When `/order` is opened without a valid product:

- show product selection as the first step.

Invalid product query:

- must not crash;
- fall back to product selector or a safe not-found experience.

---

## 8. Public order wizard

Four visible steps:

```text
1. Your card
2. Your details
3. Delivery
4. Review
```

Do not create an Order database record until final submission.

Going backward between steps must preserve in-memory form state.

Browser Back from success must not resubmit the order.

---

## 9. Step 1 — Your Card

Common UI:

- selected product;
- product visual;
- short outcome;
- quantity;
- product-specific configuration;
- pricing/quote state;
- Continue.

Default quantity:

```text
1
```

Minimum:

```text
1
```

Any bulk threshold must come from approved product configuration, not agent invention.

---

## 10. Product-specific public configuration

### PERSONAL_CARD

```ts
{
  fullName: string;
  professionalTitle?: string;
}
```

### CAREER_CARD

```ts
{
  fullName: string;
  professionalTitle?: string;
  fieldOfStudyOrWork?: string;
  hasCv: boolean;
}
```

Do not require CV upload.

### BUSINESS_CARD

```ts
{
  businessName: string;
  businessCategory?: string;
  hasLogo?: boolean;
}
```

Do not require logo upload.

### GOOGLE_REVIEW_CARD

```ts
{
  businessName: string;
  reviewUrl?: string;
  needsUrlHelp: boolean;
}
```

Rules:

- if `needsUrlHelp = false`, review URL required;
- if `needsUrlHelp = true`, URL may be absent;
- absence of URL must not block ordering when help is requested.

### WHATSAPP_CARD

```ts
{
  whatsappNumber: string;
  predefinedMessage?: string;
}
```

The browser does not supply an arbitrary destination URL.

The server creates the canonical WhatsApp URL.

### INSTAGRAM_CARD

```ts
{
  instagram: string;
}
```

Accept:

- username;
- `@username`;
- valid Instagram profile URL.

Normalize server-side.

### CONTACT_CARD

```ts
{
  fullName: string;
  professionalTitle?: string;
  company?: string;
  phone: string;
  email?: string;
}
```

### CUSTOM_LINK_CARD

```ts
{
  destinationUrl: string;
  purpose?: string;
}
```

Only safe web destinations are accepted.

---

## 11. Step 2 — Customer details

Fields:

```text
Full name *
Phone *
Use this number for WhatsApp
WhatsApp
Email
Preferred contact *
```

Preferred contact:

```text
WHATSAPP
PHONE
EMAIL
```

If `EMAIL` is selected, valid email becomes required.

Phone UI should default to Morocco without preventing international numbers.

---

## 12. Step 3 — Delivery

Fields:

```text
City *
Delivery address *
Delivery instructions
```

V1 does not integrate a shipping provider.

If delivery price cannot be calculated from approved configuration, clearly show that final delivery price is confirmed later.

Do not fabricate delivery promises or prices.

---

## 13. Step 4 — Review

Show:

- product;
- quantity;
- readable configuration summary;
- customer details;
- delivery details;
- subtotal if known;
- delivery fee if known;
- total if known;
- pricing state;
- edit controls for previous steps.

CTA:

```text
Place order
```

for priced orders.

CTA:

```text
Send request
```

for quote-required orders.

---

## 14. Public submit behavior

Final submission must use controlled server-side application logic.

The browser must not insert directly into commercial Supabase tables.

Expected logical mutation:

```text
createPublicOrder(...)
```

The server:

1. validates product;
2. validates product-specific schema;
3. normalizes fields;
4. recalculates approved pricing;
5. derives attribution;
6. checks idempotency;
7. creates Order + OrderItem + ORDER_CREATED event atomically;
8. returns a minimal receipt.

---

## 15. Success route

Suggested:

```text
/[locale]/order/success
```

Display:

```text
Order received ✓

KARTI-000124

Google Review Card × 2

We will contact you to confirm the details before production.

[ Continue on WhatsApp ]
```

This page is not an order portal.

---

## 16. Receipt behavior

The public order number is a human reference, not authorization.

If receipt details survive refresh/navigation, use a high-entropy receipt token.

Public receipt may show only minimal information such as:

- order number;
- product;
- quantity;
- pricing summary;
- next step.

Never publicly expose:

- delivery address;
- internal notes;
- admin events;
- linked client ID;
- profile ID;
- card IDs;
- private attribution internals.

---

## 17. WhatsApp continuation

Use a centralized sales WhatsApp configuration.

Do not hardcode the number in individual components.

Generated message should include the order reference, for example:

```text
Hello, I just placed order KARTI-000124 for 2 Google Review Cards.
```

Localize copy appropriately.

WhatsApp opening is optional after order creation.

If WhatsApp fails, the order remains valid.

---

## 18. Contact / inquiry flow

General questions must not create fake Orders.

Contact route:

```text
/[locale]/contact
```

Fields:

```text
Name *
Phone
Email
Company
Inquiry type
Message *
```

Suggested inquiry types:

```text
GENERAL
BULK_ORDER
CORPORATE
PARTNERSHIP
CUSTOM_REQUEST
OTHER
```

Submissions create `inquiries`, not `orders`.

---

## 19. Responsive behavior

Public checkout is mobile-first.

Requirements:

- no horizontal page overflow;
- large touch targets;
- primary CTA visible without awkward scrolling;
- no desktop-only two-column dependency;
- readable progress indicator;
- form values preserved when navigating between steps;
- sticky product-order CTA allowed on commercial pages after hero;
- Arabic RTL must work correctly.

---

## 20. Accessibility

Minimum requirements:

- semantic form labels;
- no placeholder-only labels;
- keyboard operability;
- progress communicated in text;
- visible validation messages;
- focus first invalid field after failed step submit;
- appropriate `aria-describedby`;
- live region for asynchronous success/error messages;
- primary touch targets approximately 44px or greater;
- status never communicated by color alone.

---

## 21. No fake marketing proof

Do not fabricate:

- reviews;
- customer counts;
- ratings;
- customer logos;
- sales volume;
- delivery promises;
- stock availability;
- prices.

Development fixtures must remain clearly isolated from production content.
