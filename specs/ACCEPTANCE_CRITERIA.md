# Karti — Functional Acceptance Criteria

These scenarios define what "working" means for the MVP.

## AC-01 — Admin authentication

Given an unauthenticated visitor  
When they request `/dashboard`  
Then they are denied dashboard access and routed to authentication.

Given an authenticated Karti admin  
When they log in successfully  
Then they can access the dashboard.

## AC-02 — Create client

Given an authenticated admin  
When they submit valid client data  
Then a client record is created and visible in the dashboard.

Invalid inputs must show errors and must not create a partial client.

## AC-03 — Quick Add

Given an admin using a phone  
When they enter the minimum required Quick Add fields  
Then they can create the client without completing the entire profile setup.

## AC-04 — Create profile

Given a client  
When the admin creates a PERSON or BUSINESS profile with a unique slug  
Then the profile saves in DRAFT state by default unless the UI explicitly activates it.

## AC-05 — Public activation

Given a DRAFT or INACTIVE profile  
When a public visitor requests its slug  
Then it is not rendered as a normal public profile.

Given an ACTIVE profile  
Then its public page is accessible.

## AC-06 — Links

Given a profile with multiple links  
When links are reordered/disabled  
Then the public page reflects the configured order and excludes disabled links.

## AC-07 — Save Contact

Given an active public profile  
When a visitor selects Save Contact  
Then a valid `.vcf` containing available public contact fields is returned.

## AC-08 — Create card

Given an authenticated admin  
When a card is created  
Then it receives:

- a unique internal ID;
- unique human-friendly card number;
- unique random short code;
- a permanent URL.

## AC-09 — Assign card

Given an unassigned card and a client  
When the admin assigns the card  
Then the assignment is visible on both card/client management views as applicable.

## AC-10 — Profile destination

Given an ACTIVE card configured to an ACTIVE profile  
When `/t/{shortCode}` is opened  
Then the visitor reaches that profile.

## AC-11 — External destination

Given an ACTIVE card configured to a valid HTTPS external URL  
When `/t/{shortCode}` is opened  
Then the visitor is redirected to the configured URL.

## AC-12 — Unsafe external URL

Given an attempted external destination such as:

```text
javascript:alert(1)
```

Then the system rejects it and does not persist/use it as a redirect.

## AC-13 — Dynamic destination

Given the same physical card URL  
When the admin changes destination from profile to external URL  
Then the same `/t/{shortCode}` begins resolving to the new destination.

No NFC rewrite is required.

## AC-14 — Disabled/lost/replaced cards

Given a card with status:

```text
DISABLED
LOST
REPLACED
```

When `/t/{shortCode}` is opened  
Then it must not resolve to the normal configured destination.

## AC-15 — QR

Given a card  
When a QR is generated  
Then it encodes the permanent Karti URL, not the current final destination.

Changing destination must change scan outcome without changing the QR.

## AC-16 — NFC

On a supported Web NFC device/browser:

When the admin chooses Write to NFC  
Then the permanent Karti URL is written to a compatible NFC tag.

On an unsupported device:

Then the UI explains the limitation and allows copying the permanent URL.

## AC-17 — Public privacy

Given an anonymous visitor  
Then they cannot retrieve internal client notes, card inventory or admin metadata from public pages/APIs.

## AC-18 — Mobile public UX

At 320px and 390px widths:

- no horizontal overflow;
- primary identity visible;
- Save Contact visible/accessible;
- contact actions usable.

## AC-19 — Mobile dashboard

At approximately 390px:

- New Client/Quick Add usable;
- client detail usable;
- card configuration usable;
- profile editing/preview accessible.

## AC-20 — Production build

The release candidate must:

- typecheck;
- lint;
- pass required tests;
- build successfully.
