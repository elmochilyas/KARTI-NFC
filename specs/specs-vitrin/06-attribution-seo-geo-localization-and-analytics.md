# 06 — Attribution, SEO/GEO, Localization & Analytics

## 1. Purpose

The vitrine must serve two acquisition paths:

1. Social/direct visitors who already understand the product and need a short path to purchase.
2. Organic/AI-search visitors who first need a complete answer before converting.

The site must also preserve source information through order submission so Karti can measure what actually produces customers.

---

## 2. Attribution fields

Capture first-touch:

```text
first_touch_source
first_landing_path
first_referrer
first_utm_source
first_utm_medium
first_utm_campaign
first_utm_content
first_utm_term
```

Capture last/conversion touch:

```text
last_touch_source
conversion_path
last_referrer
last_utm_source
last_utm_medium
last_utm_campaign
last_utm_content
last_utm_term
```

Do not persist sensitive full URLs unnecessarily.

Prefer sanitized paths and approved marketing parameters.

---

## 3. First-touch behavior

Once a legitimate first-touch source is established, internal navigation must not overwrite it.

Example:

```text
First touch = Google Organic
```

remains Google Organic even after visiting several internal pages.

---

## 4. Last-touch behavior

Last-touch may change when the visitor arrives through a new meaningful external source/campaign before conversion.

Both values are stored.

---

## 5. Acquisition source derivation

Canonical source values:

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

Source must be derived server-side from sanitized referrer/UTM context.

Do not trust arbitrary browser-submitted enum values.

Deterministic rules should distinguish:

- paid UTM campaigns;
- organic search referrers;
- social referrers;
- referrals;
- direct;
- unknown.

Unit-test the classifier.

---

## 6. Suggested social UTMs

Example organic Instagram:

```text
utm_source=instagram
utm_medium=organic_social
utm_campaign=google_review_launch
utm_content=reel_03
```

TikTok:

```text
utm_source=tiktok
utm_medium=organic_social
...
```

Campaign naming should stay consistent over time.

---

## 7. Analytics abstraction

Create a centralized analytics adapter.

Do not scatter vendor-specific code across React components.

Canonical events:

```text
product_page_view

order_started
order_step_viewed
order_step_completed
order_product_selected
order_quantity_changed

order_submit_attempted
order_submitted
order_submit_failed

whatsapp_clicked

contact_inquiry_submitted
```

Never send phone/email/address into marketing analytics.

---

## 8. Organic traffic architecture

Prioritize:

1. transactional product pages;
2. commercial solution/comparison pages;
3. problem-aware guides;
4. broad educational guides.

Every informational page should have a logical path to the appropriate commercial product.

Do not create content solely to increase page count.

---

## 9. Core product SEO hubs

Commercial pages:

```text
personal-card
career-card
business-card
google-review-card
whatsapp-card
instagram-card
contact-card
custom-link-card
```

These should receive strong internal links from:

- homepage;
- Products navigation;
- solution pages;
- relevant guides;
- examples;
- related product sections.

---

## 10. Content clusters

Priority clusters:

```text
NFC basics
Digital business cards
Career networking
Digital business presence
Google reviews
WhatsApp customer contact
NFC vs QR
```

Initial guide ideas include:

- What is an NFC business card and how does it work?
- NFC business card vs QR code.
- What information belongs on a digital business card?
- How to use a digital card when looking for a job.
- What should a student put on a professional digital profile?
- How does an NFC Google Review card work?
- How to get your Google review link.
- Where should a Google Review card be placed?
- How does a WhatsApp NFC card work?
- Can an NFC destination change after printing?

Do not mass-generate hundreds of near-duplicate articles.

---

## 11. GEO content principles

Content should be easy for humans and answer engines to understand.

Important pages should explicitly answer:

```text
What is it?
Who is it for?
How does it work?
What happens after the tap?
Does it require an app?
Can information/destination change?
What is included?
How does ordering work?
How much does it cost?
```

Important facts should exist as visible HTML text, not only inside images/video.

Do not implement fake GEO mechanisms such as invisible answer blocks or special unsupported schema.

---

## 12. Localization

Localized marketing URLs:

```text
/fr/...
/ar/...
/en/...
```

Canonical DB/product enums remain language-independent.

Copy belongs in a translation/content layer, not inside business logic.

Arabic must support RTL.

Avoid mixing full French/Arabic translations on one canonical page.

---

## 13. `hreflang`

Equivalent localized pages should reference each other correctly.

Language switcher must use crawlable links.

Avoid JavaScript-only locale switching.

---

## 14. Canonical/indexing rules

Index:

- homepage;
- product pages;
- solution pages;
- substantive guides;
- substantive examples;
- pricing;
- public informational pages.

Noindex:

```text
order
order success
dashboard
login
/t/{short_code}
internal APIs
```

Customer profile indexing:

- Personal profiles: noindex by default.
- Career profiles: noindex by default initially.
- Business profiles: index only if a deliberate future opt-in/quality policy is implemented.

Do not let thousands of thin customer profiles become Karti's main indexed surface.

---

## 15. Sitemap

XML sitemap includes only canonical indexable marketing content.

Do not include:

- Dashboard;
- Order routes;
- redirect URLs;
- APIs;
- noindex profiles;
- temporary/filter URLs.

---

## 16. Structured data

Where accurate and visible:

### Homepage

`Organization`

### Product pages

`Product` / appropriate Offer information once the purchase/offer experience matches it.

### Deep pages

`BreadcrumbList`

### Guides/articles

Appropriate `Article` markup when applicable.

Structured data must match visible page content.

---

## 17. Technical SEO

Important marketing content should be server-rendered/indexable where practical.

Interactive demos may be client components, but core content should not depend on client-side JavaScript to exist:

```text
H1
description
features
price/quote state
FAQ
internal links
```

---

## 18. Image/visual search

Karti is a visual physical product.

Prioritize original imagery:

- front;
- back;
- card + phone;
- tap interaction;
- phone destination;
- business counter;
- restaurant/reception;
- career/networking use;
- packaging.

Use meaningful filenames, alt text, and nearby explanatory copy.

Do not rely on generic stock imagery as the primary product evidence.

---

## 19. City/location pages

Do not create templated city pages that differ only by city name.

Create a local page only when it contains genuine local value such as:

- specific service availability;
- delivery/pickup information;
- real local examples;
- meaningful local business details.

---

## 20. Conversion measurement

Core funnel:

```text
Non-branded impressions
↓
Organic/social visits
↓
Relevant landing-page visits
↓
Product views
↓
Order starts / WhatsApp leads
↓
Submitted Orders
↓
Confirmed Orders
↓
Delivered Orders
↓
Revenue
```

Traffic alone is not the main KPI.

The order system must make source-to-revenue analysis possible later.
