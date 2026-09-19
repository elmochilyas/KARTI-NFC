# Karti — UI/UX Specification

## Design direction

Karti should feel:

- premium;
- modern;
- calm;
- clear;
- trustworthy;
- fast;
- business-oriented.

Avoid generic link-in-bio clutter and excessive card-based UI.

# Public profile

## Goal

Within seconds, a visitor should understand:

- who/what this is;
- what they do;
- how to save/contact them;
- which important action to take.

## Mobile first

Design from ~320px width upward.

Recommended hierarchy:

```text
Avatar / Logo
Display Name
Role / Category
Company
Short Bio

Primary CTA: Save Contact

Fast actions:
Call | WhatsApp | Email

Important links / social
Location
Subtle Karti branding
```

Hide missing fields completely. Never show empty placeholders.

## Visual language (premium hero card)

The public page is a mobile-first hero card (`max-w-[480px]`, full-screen
feel on phones, centered on desktop). Section order is fixed:

```text
Hero → quick tiles → Save Contact → information → about →
more links → share → footer
```

- Hero (~300–360px at 390px wide): full-bleed cover (`object-fit:
  cover`) with dark overlay; accent-gradient fallback when no cover.
  BUSINESS gets a white rounded-square logo; PERSON a circular avatar;
  polished initials fallbacks. White 32px name, uppercase
  letter-spaced category, tagline (bio, clamped).
- Quick tiles: up to 3 (Instagram → WhatsApp → Call → Email → Website →
  other links), navy glass tiles bridging the hero→sheet transition,
  large brand marks + visible labels.
- Brand icons keep official colors (Instagram gradient tile, WhatsApp
  green, Facebook/LinkedIn/YouTube/Telegram reds/blues, X black/white);
  system actions use one Lucide outline set. No monochrome placeholders.
- Save Contact: full-width ~64px accent-gradient CTA with person-plus
  icon — the strongest element on the page.
- Information card: white 22px-radius card, 48px icon circles, rows only
  for data that exists; address row carries a Get Directions link when a
  maps URL exists. No faked "Open Now" badge (no hours data in MVP).
  All public sections are edge-to-edge: full-bleed quick-tile strip,
  full-width Save band, full-bleed `border-y` information/about/link/share
  groups. Only text (titles, footer) carries side insets — no card ever
  floats with side gutters.
- About card (bio only), brand link rows, Share Profile (Web Share API
  with copy-URL fallback), understated Karti footer.
- Content-driven: missing phone/website/address/bio/links collapse
  cleanly; reference content is never hard-coded.

The dashboard editor preview keeps its earlier compact card as an editing
aid; the public page is the premium hero design above.

## Person profile

Emphasize:

- photo;
- name;
- title;
- company;
- save contact;
- direct contact;
- social links.

## Business profile

Emphasize:

- logo;
- name/category;
- reviews;
- phone/WhatsApp;
- website/booking;
- address/location.

Use one consistent Karti visual language.

## Customization

MVP can support:

```text
accent color
light/dark theme
avatar/logo
cover image
controlled button styling
```

Do not build a full page builder.

Customization must preserve contrast/readability.

# Dashboard

Navigation:

```text
Dashboard
Clients
Profiles (optional separate nav)
Cards
Settings
```

## Dashboard home

Primary CTA:

```text
+ New Client
```

Useful metrics:

- total clients;
- active cards;
- profiles;
- direct-link cards.

Do not create decorative metrics with no operational value.

## Client list

Show useful scanning info:

```text
Client | Business | Card | Destination | Status
```

Support search and good empty/loading/error states.

Mobile must not become an unusable wide table.

## Client detail

One central workspace with:

```text
Client
Profile
Contact
Links
Card(s)
Destination
Status
```

Primary actions remain visible:

```text
Edit
Preview
Configure Card
Change Destination
Generate QR
```

A profile receives its public URL immediately when created. The dashboard
surfaces this URL directly: on the profile editor (top, above the form)
and on client detail (inside the Profile section). The URL can be copied
before activation, but only ACTIVE profiles are publicly accessible —
DRAFT/INACTIVE states show the URL with not-public guidance and no working
Open link. Slug edits update the displayed URL right after save (derived
fresh every render, never stored). Long URLs wrap safely; Copy/Open stay
reachable at 390px.

## Profile editor

Desktop:

```text
Editor               Phone Preview
```

Mobile:

```text
Editor
Preview tab/button
```

Preview should update from unsaved editor state.

## New client

Support fast onboarding.

Quick Add minimum:

```text
Name
Phone (optional if product permits)
Destination/setup next step
```

Full setup can guide:

```text
Client
→ Profile (+ Links)
→ Preview
→ Activate Profile
→ Configure NFC Card (destination choice; card record auto-prepared)
```

Normal workflow is client-centric. Manual card inventory (create/assign/
status) remains as advanced tooling, not everyday onboarding.

## Card detail (advanced)

The card detail screen is advanced tooling (inventory, support,
replacement, diagnostics) — not everyday onboarding.

Show:

```text
Card number
Short code
Permanent URL
Assigned client
Current destination
Status
```

Actions:

```text
Write to NFC (Phase 10)
Copy URL
QR Code + Download QR (240px display, 1024px PNG export)
Test Link (Phase 8+)
Change Destination
```

The client NFC section and the configure-success state show the same QR
(identical permanent-URL payload) with Copy/Test actions beside it. QR fits
without horizontal overflow at 390px and never replaces the text URL.

## NFC UX

The Physical NFC block (client NFC section, configure-success state,
advanced card detail) shows:

```text
Write to NFC (explicit tap only; locked while writing)
→ "Writing NFC card…" + hold-card instructions
→ success: "NFC card programmed ✓" + Test Card + Done
→ permission/cancel/failure: friendly message + Try Again + Copy URL
```

Unsupported (capability-detected, no device-name assumptions):

```text
NFC writing isn't available here + Copy URL
```

Fallback is a first-class path, not an error dead-end. Success state is
local only — no durable "written" flag is stored.

## Required states

Consider:

```text
loading
empty
success
validation error
server error
unauthorized
not found
disabled/inactive
```

## Accessibility

At minimum:

- semantic HTML;
- form labels;
- keyboard operation;
- visible focus;
- accessible icon labels;
- large touch targets;
- contrast;
- no information conveyed by color alone.

## Responsive verification

Test at least:

```text
320
390
768
1024
1440
```

Public profile must be excellent at 320/390.

Dashboard must remain usable at 390.

## Avoid

- grids of cards for every section;
- giant gradients everywhere;
- excessive glassmorphism;
- long entrance animations;
- tiny icon-only critical actions;
- hiding primary actions in menus;
- visual complexity that slows NFC visitors.
