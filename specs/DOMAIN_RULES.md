# Karti — Domain Rules

This file contains the business rules that must remain true regardless of UI or database implementation.

## 1. Core entities

```text
Client
Profile
ProfileLink
Card
Destination
```

These concepts must remain logically separate.

### Client

Represents the customer/business relationship managed by Karti.

A client may exist:

- without a profile;
- without a card;
- with one or more cards over time.

### Profile

Represents the public digital identity.

A profile:

- belongs to one client;
- has one public slug;
- has a status;
- contains public contact/profile information;
- owns zero or more ordered links.

### Card

Represents one physical NFC/QR asset.

A card:

- has its own internal ID;
- has a human-friendly card number;
- has one random public short code;
- may be assigned or unassigned;
- can be activated/disabled/lost/replaced;
- stores current destination configuration.

## 2. Permanent card URL

Every physical card has exactly one permanent public URL:

```text
https://karti.app/t/{shortCode}
```

The NFC tag and printed QR code use this URL.

The final destination must not be written directly into the physical card.

## 3. Destination types

MVP supports:

```text
PROFILE
EXTERNAL_URL
```

`EXTERNAL_URL` covers:

- Instagram;
- Google Reviews;
- WhatsApp;
- websites;
- booking pages;
- menus;
- any other validated web URL.

Do not create a new destination database type for every social platform unless the behavior becomes materially different.

## 4. Redirect conditions

A card may redirect only when:

```text
card.status == ACTIVE
```

For a profile destination:

```text
profile exists
AND profile.status == ACTIVE
```

For an external destination:

```text
URL exists
AND URL passes safe URL validation
```

Otherwise show an unavailable state rather than redirecting.

## 5. Public profiles

Only `ACTIVE` profiles are public.

`DRAFT` and `INACTIVE` profiles must not be discoverable as normal public profiles.

## 6. Slugs

A public profile slug:

- is unique;
- is lowercase;
- is normalized;
- cannot use a reserved application route;
- can change without requiring the NFC tag or QR code to change.

This works because cards reference the profile entity, not a hard-coded profile URL stored on the physical card.

## 7. Card short codes

A card short code:

- is random;
- is public;
- is not an authorization secret;
- is not sequential;
- does not contain client identity or private data;
- is never recycled casually.

## 8. Card statuses

MVP statuses:

```text
UNASSIGNED
ASSIGNED
ACTIVE
DISABLED
LOST
REPLACED
```

Recommended semantics:

### UNASSIGNED
Physical card exists in inventory but is not assigned.

### ASSIGNED
Assigned to a client but not currently active for public redirect.

### ACTIVE
Public redirect is enabled.

### DISABLED
Temporarily or intentionally disabled.

### LOST
Card reported lost; redirect must stop.

### REPLACED
Old card replaced by another card; redirect must stop unless product rules later define a replacement landing page.

## 9. Profile types

MVP:

```text
PERSON
BUSINESS
```

The types change presentation and relevant fields, not the underlying platform architecture.

## 10. Links

Profile links:

- belong to one profile;
- are ordered;
- may be enabled/disabled;
- must use validated URLs;
- must not contain raw executable HTML.

## 11. Save Contact

Save Contact uses a generated vCard.

It must include only public profile data.

Internal client notes must never appear in vCards.

## 12. NFC writing

Web NFC is an operational convenience, not a dependency of the core product.

If browser NFC writing is unavailable:

```text
Copy permanent Karti URL
→ write it using another NFC utility
```

The public Karti experience must work regardless of how the tag was written.

## 13. QR behavior

QR and NFC must point to the same permanent card URL.

Changing card destination must affect both immediately without:

- rewriting NFC;
- reprinting QR.

## 14. Client deletion

Do not automatically destroy physical-card history when deleting/archiving a client.

A physical card is an operational asset and should be handled deliberately.

## 15. Authorization

Knowing:

- a profile slug;
- a card short code;
- a client ID;

must never grant administrative rights.

Administrative actions always require authenticated authorization.
