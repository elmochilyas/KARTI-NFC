# Karti — Product Requirements Document

**Product:** Karti  
**Version:** MVP / v1  
**Product Type:** NFC Digital Contact Card Management Platform  
**Primary Admin:** Karti operator  
**Public Users:** People tapping or scanning a Karti card  

---

## 1. Product Summary

Karti is a web platform for creating, managing, and configuring NFC-enabled digital business cards.

A physical Karti card can open:

- A premium digital contact profile
- Instagram
- Google Reviews
- WhatsApp
- A business website
- A booking page
- Any custom external URL

The platform has two main interfaces:

1. **Public Karti Profile**
   - Opened after a visitor taps an NFC card or scans its QR code.
   - Mobile-first.
   - Premium, minimal, fast, and action-oriented.

2. **Karti Admin Dashboard**
   - Used by the Karti operator to create clients, profiles, cards, links, destinations, and QR/NFC configurations.

The MVP should optimize for fast client onboarding and simple long-term card management.

---

## 2. Product Vision

Karti should feel like a premium digital identity product, not a basic link-in-bio page.

The ideal visitor flow is:

```text
Tap card
→ immediately understand the person/business
→ take an action
```

Primary visitor actions may include:

- Keep the card on the phone (profile PWA install)
- Share the profile
- Call
- WhatsApp
- Email
- Visit website
- Open social profile
- Open location
- Leave a Google review

The card owner should not need technical knowledge.

---

## 3. Core Architecture Principle

### 3.1 Permanent Karti Card URL

The physical NFC card should NOT store the final destination directly.

Instead, every physical card receives one permanent Karti URL:

```text
https://karti.app/t/K7DX29
```

The Karti backend decides where that URL currently leads.

Example:

```text
Physical NFC card
    ↓
https://karti.app/t/K7DX29
    ↓
Karti redirect resolver
    ↓
Destination
```

Possible destinations:

```text
PROFILE
→ https://karti.app/younes-barrag

EXTERNAL_URL
→ https://instagram.com/example

GOOGLE_REVIEW
→ Google review URL

WHATSAPP
→ WhatsApp URL

WEBSITE
→ Company website
```

### 3.2 Why This Matters

The administrator can change the card destination from the dashboard without rewriting the NFC tag.

Example:

```text
Today:
Card → Karti Profile

Later:
Card → Google Reviews

Later:
Card → Instagram
```

The physical card remains unchanged.

This is a core Karti feature.

---

## 4. User Roles

### 4.1 Karti Administrator

The Karti administrator can:

- Log in
- Create clients
- Edit clients
- Create profiles
- Edit profiles
- Upload logos and profile photos
- Add social/contact links
- Create physical card records
- Assign cards to clients
- Configure card destinations
- Generate QR codes
- Write NFC URLs on supported devices
- Copy the NFC URL when direct writing is unavailable
- Preview profiles
- Activate/deactivate profiles
- Disable cards

For MVP, only Karti administrators need accounts.

---

### 4.2 Karti Cardholder

The person or business receiving the physical Karti card.

Examples:

- Freelancer
- Developer
- Doctor
- Restaurant
- Lawyer
- Real-estate agent
- Company employee
- Business owner
- Sales representative

Cardholders do not require an account in the MVP.

---

### 4.3 Visitor

A person who:

- Taps the NFC card
- Scans the QR code
- Opens a public Karti profile

Visitors never need authentication.

---

## 5. Main Admin Workflow

### 5.1 Create a New Client

Admin selects:

```text
+ New Client
```

Recommended flow:

### Step 1 — Basic Client Information

Fields:

```text
Name
Business / Company
Phone
Email
Notes
```

### Step 2 — Profile Type

Choose:

```text
Individual
Business
```

### Step 3 — Public Profile

Configure:

```text
Display name
Job title / category
Company name
Short bio
Profile picture / logo
Cover image
Phone
WhatsApp
Email
Website
Address
Location URL
```

### Step 4 — Public Slug

Generate automatically:

```text
https://karti.app/younes-barrag
```

Slug must be editable.

Slug must be unique.

### Step 5 — Links

Add configurable links such as:

```text
Instagram
Facebook
LinkedIn
TikTok
YouTube
X
Snapchat
Google Reviews
Website
Booking
WhatsApp
Custom URL
```

### Step 6 — Configure NFC Card

From the client workspace, the operator opens **Configure NFC Card** and
chooses what the card should open:

```text
Karti Profile
Google Reviews
Instagram
WhatsApp
Website
Custom Link
```

The backend card record (number, short code, assignment, destination,
activation) is prepared **automatically** — the operator never manually
creates cards, assigns inventory, or flips card statuses in the normal flow.
Manual card inventory remains available as advanced tooling.

### Step 7 — Preview

Show live mobile preview (profile editor + public page).

### Step 8 — Activate

Publish the profile, then configure the NFC card. Card activation is part
of the automatic configuration once the destination is valid.

---

## 6. Public Profile Requirements

The public profile is the primary customer-facing experience.

### 6.1 Design Goals

The profile must be:

- Mobile-first
- Fast
- Premium
- Minimal
- Clear
- Accessible
- Visually consistent
- Easy to scan
- Action-oriented

Avoid:

- Excessive animations
- Long text blocks
- Busy interfaces
- Too many cards/components
- Hidden contact information
- Complicated navigation

---

## 7. Public Profile Layout

Recommended hierarchy:

```text
Profile photo / logo

Display name

Job title / category
Company name

Short description

Keep this Card (profile PWA install)

Secondary CTAs
Call | WhatsApp | Email

Social links

Website / booking / review links

Location

Share Profile

Karti branding
```

---

## 8. Profile Information

### 8.1 Personal Profile Fields

```text
Profile photo
Display name
Job title
Company
Short bio
Phone
WhatsApp
Email
Website
Address
Location URL
Social links
```

### 8.2 Business Profile Fields

```text
Logo
Business name
Business category
Description
Phone
WhatsApp
Email
Website
Address
Google Maps URL
Opening hours
Google Review URL
Instagram
Facebook
Booking URL
Custom links
```

The same core data model should support both profile types.

---

## 9. Keep this Card (Profile PWA Install)

The profile must provide a prominent:

```text
Keep Profile
```

button (section heading: "Keep this Card").

Tapping it installs THAT profile as a phone home-screen app via a
profile-specific PWA manifest (`/u/{publicCode}/manifest.webmanifest`,
`start_url: /u/{publicCode}`). Android fires the native install prompt
where available; iOS gets a guided Add-to-Home-Screen modal; desktop
shows a phone-only note. There is no generic Karti app and no
Apple/Google Wallet dependency.

The backend vCard endpoint (`/api/vcard/[slug]`) is retained for later
reuse but is no longer presented as the primary action.

Possible vCard fields:

```text
First name
Last name
Display name
Company
Job title
Phone
Email
Website
Address
Profile URL
```

Goal:

- Work reliably on Android
- Work reliably on iOS
- Use the standard vCard format

---

## 10. Link System

Links should be flexible and reusable.

Each profile link contains:

```text
id
profile_id
type
label
url
icon
sort_order
enabled
```

Supported types can include:

```text
instagram
facebook
linkedin
tiktok
youtube
x
snapchat
whatsapp
phone
email
website
google_review
booking
maps
custom
```

Admin capabilities:

- Add link
- Edit link
- Delete link
- Enable/disable link
- Reorder links

---

## 11. Profile Customization

MVP customization should remain controlled.

Allow:

```text
Profile image / logo
Cover image
Accent color
Light or dark visual theme
Button style
Optional background image
```

Do not build a drag-and-drop page builder for MVP.

Karti should preserve a recognizable design system across profiles.

---

## 12. Direct Link Mode

A Karti physical card does not require a public Karti profile.

Admin can choose:

```text
Destination Type: EXTERNAL_URL
```

Examples:

```text
Instagram
Google Reviews
WhatsApp
Website
Booking page
Menu
Custom URL
```

The permanent card URL remains:

```text
https://karti.app/t/K7DX29
```

The backend handles the redirect.

---

## 13. Card Data Model

Each physical card should exist independently from the client.

Recommended fields:

```text
id
card_number
short_code
client_id
destination_type
destination_profile_id
destination_url
status
created_at
updated_at
```

Example:

```text
card_number:
KARTI-000124

short_code:
K7DX29

client_id:
client_123

destination_type:
PROFILE

destination_profile_id:
profile_123

status:
ACTIVE
```

---

## 14. Card Statuses

Possible statuses:

```text
UNASSIGNED
ASSIGNED
ACTIVE
DISABLED
LOST
REPLACED
```

This makes card inventory manageable as Karti grows.

---

## 15. Card URL Resolver

Route:

```text
/t/[code]
```

Example:

```text
/t/K7DX29
```

Resolver logic:

```text
1. Receive short code
2. Find card
3. Validate card status
4. Read destination_type
5. Resolve destination
6. Redirect
```

Pseudo behavior:

```text
if card.status !== ACTIVE
    show unavailable page

if destination_type === PROFILE
    redirect to profile slug

if destination_type === EXTERNAL_URL
    redirect to validated external URL
```

---

## 16. QR Code

Every physical card should have a QR code containing the same permanent Karti card URL.

Example:

```text
https://karti.app/t/K7DX29
```

Never encode the final external destination directly into the QR.

Benefits:

- NFC and QR always behave the same
- Destination can be changed remotely
- No reprinting required when destination changes

---

## 17. NFC Configuration

The dashboard needs a dedicated NFC configuration screen.

Example:

```text
Configure NFC Card

Client:
Younes Barrag

Card:
KARTI-000124

Permanent URL:
https://karti.app/t/K7DX29
```

Actions:

```text
Write to NFC
Copy URL
Generate QR Code
Test Link
```

### 17.1 Supported Device Flow

On browsers with Web NFC support (capability-detected, e.g. Chrome on
Android):

```text
Open card configuration
→ Tap "Write to NFC"
→ Hold physical NFC card near phone
→ Write permanent Karti URL (standard NDEF URL record, tag left unlocked)
→ Confirm success (local success state; Test Card opens the URL)
```

### 17.2 Unsupported Device Flow

If browser/device NFC writing is unavailable:

```text
Copy NFC URL
```

The administrator can write the copied URL with an external NFC writing app.

The Karti public profile itself remains a standard web page and is not dependent on Web NFC.

---

## 18. Admin Dashboard

Recommended main navigation:

```text
Dashboard
Clients
Profiles
Cards
Analytics
Settings
```

Analytics can be limited or deferred for MVP.

---

## 19. Dashboard Home

Display high-level metrics:

```text
Total Clients
Active Cards
Profiles
Direct-Link Cards
```

"Active Cards" is operationalized as Configured Cards: clients whose primary
card (existing primary-card rule) is ACTIVE. LOST/REPLACED history never
counts. The direct-link count covers ACTIVE cards opening an external URL.

Primary action:

```text
+ New Client
```

The home page additionally guides the operator with Quick Actions, a Needs
Attention list (one direct next step per client, in human language), and
recent clients with profile/NFC status. An ACTIVE profile without a card is
shown as optional setup, never as an error.

Optional recent activity:

```text
Client created
Card assigned
Destination changed
Profile updated
Card disabled
```

---

## 20. Clients Screen

Recommended table:

| Client | Business | Card | Destination | Status |
|---|---|---|---|---|
| Younes Barrag | Karti | KARTI-001 | Profile | Active |
| Café Atlas | Restaurant | KARTI-002 | Google Review | Active |

Search fields:

```text
Name
Business
Phone
Email
Card ID
```

Actions:

```text
Open
Edit
Preview
Configure Card
Deactivate
```

---

## 21. Client Detail Page

One page should centralize everything.

Example structure:

```text
Client
Younes Barrag

Profile
Public URL:
karti.app/younes-barrag

Contact
Phone
Email
WhatsApp

Links
Instagram
LinkedIn
Website

Card
KARTI-000124

Destination
Karti Profile

Status
Active
```

Actions:

```text
Edit Client
Edit Profile
Preview Profile
Configure Card
Change Destination
Generate QR
Disable Card
```

---

## 22. Quick Add Flow

Karti should support ultra-fast onboarding from a phone.

Quick Add minimum fields:

```text
Name
Phone
Card destination
```

Then:

```text
Create
```

All additional fields can be added later.

Goal:

> Allow the Karti operator to create a client in under a minute when needed.

---

## 23. Profile URL System

Public profile example:

```text
https://karti.app/younes-barrag
```

Slug requirements:

- Unique
- Lowercase
- Human-readable
- Hyphen-separated
- Editable
- Validated

Example conflict handling:

```text
younes-barrag
younes-barrag-2
```

Reserved slugs:

```text
admin
dashboard
login
logout
api
auth
cards
clients
profiles
settings
new
t
```

Dashboard visibility: a profile receives its public URL immediately when
created. The dashboard surfaces this URL directly on client detail and on
the profile editor. The URL can be copied before activation, but only
ACTIVE profiles are publicly accessible.

---

## 24. Recommended Technology Stack

### Frontend

```text
Next.js
TypeScript
React
Tailwind CSS
```

Optional UI primitives:

```text
shadcn/ui
```

Use custom styling for public Karti profiles.

### Backend

```text
Supabase
```

Use:

```text
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
```

### Hosting

```text
Vercel
```

### NFC

```text
Web NFC where supported
Manual copy/write fallback elsewhere
```

### Contact Export

```text
vCard / .vcf
```

### QR

Generate from the permanent Karti card URL.

---

## 25. High-Level System Architecture

```text
                    ┌──────────────────────┐
                    │        Vercel        │
                    │                      │
                    │       Next.js        │
                    └───────────┬──────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
      Public Experience                   Admin Dashboard
              │                                   │
      /[profile-slug]                    /dashboard/*
      /t/[card-code]                     Supabase Auth
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │      Supabase        │
                    │                      │
                    │ PostgreSQL           │
                    │ Auth                 │
                    │ Storage              │
                    │ RLS                  │
                    └──────────────────────┘
```

---

## 26. Recommended Database Schema

### 26.1 admins

```text
id
email
name
created_at
```

### 26.2 clients

```text
id
name
company
phone
email
notes
created_at
updated_at
```

### 26.3 profiles

```text
id
client_id
profile_type
slug

display_name
job_title
company_name
bio

avatar_url
cover_url

phone
whatsapp
email
website

address
maps_url

accent_color
theme

status

created_at
updated_at
```

### 26.4 profile_links

```text
id
profile_id
type
label
url
icon
sort_order
enabled
created_at
updated_at
```

### 26.5 cards

```text
id
card_number
short_code
client_id
destination_type
destination_profile_id
destination_url
status
created_at
updated_at
```

### 26.6 card_events

Optional for MVP.

```text
id
card_id
event_type
timestamp
device_type
referrer
country
```

Avoid collecting unnecessary personal or precise location data.

---

## 27. Suggested Routes

### Public

```text
/
```

Marketing / Karti homepage.

```text
/[slug]
```

Public Karti profile.

```text
/t/[code]
```

Permanent card redirect resolver.

```text
/api/vcard/[slug]
```

Generate vCard.

### Authentication

```text
/login
```

### Dashboard

```text
/dashboard
/dashboard/clients
/dashboard/clients/new
/dashboard/clients/[id]
/dashboard/profiles/[id]
/dashboard/cards
/dashboard/cards/[id]
/dashboard/settings
```

---

## 28. Authentication

Only the dashboard requires authentication.

Flow:

```text
Admin
→ Supabase Auth
→ Protected Dashboard
```

Public routes remain accessible without login.

The application must:

- Protect admin pages
- Protect mutations
- Keep privileged credentials server-side
- Use Supabase Row Level Security

---

## 29. Storage

Use Supabase Storage for:

```text
avatars/
logos/
covers/
```

Suggested structure:

```text
profiles/
    profile_123/
        avatar.webp
        cover.webp
```

Upload rules:

- Validate MIME type
- Restrict file size
- Compress large images
- Use optimized formats where practical
- Apply storage access policies

---

## 30. Public Profile Performance

Performance is critical because many visitors arrive directly from an NFC tap.

Requirements:

- Mobile-first
- Fast first load
- Optimized images
- Minimal client-side JavaScript
- No unnecessary dashboard code on public routes
- Fast redirect resolver
- Appropriate caching
- Server rendering where beneficial

Avoid blocking loading screens.

---

## 31. Live Profile Preview

During editing, show a phone preview.

Example:

```text
EDITOR                     PREVIEW

Display Name               ┌───────────────┐
Job Title                  │     Avatar    │
Company                    │               │
Bio                        │ Younes Barrag │
Phone                      │ Developer     │
WhatsApp                   │               │
Instagram                  │ Save Contact  │
Website                    │               │
                           └───────────────┘
```

Changes should update the preview immediately.

---

## 32. Analytics

Analytics are optional for MVP.

Future useful metrics:

```text
Total card taps
Profile visits
QR visits
Save Contact clicks
WhatsApp clicks
Phone clicks
Email clicks
External link clicks
```

Possible periods:

```text
Today
7 Days
30 Days
All Time
```

---

## 33. Security Requirements

The application must:

- Keep service credentials server-side
- Use Row Level Security
- Validate all input
- Sanitize URLs
- Only allow safe HTTP/HTTPS redirects
- Protect admin routes
- Validate uploads
- Restrict file types
- Rate-limit sensitive endpoints where needed
- Use non-trivial public card codes
- Prevent open redirect abuse
- Prevent unauthorized profile edits
- Prevent unauthorized card destination changes

Good short code:

```text
K7DX29P4
```

Avoid predictable codes:

```text
card-12
```

---

## 34. MVP Scope

### 34.1 Required Public Features

- Individual profile
- Business profile
- Profile photo/logo
- Short bio
- Phone
- WhatsApp
- Email
- Website
- Social links
- Location
- Keep this Card (profile PWA install)
- Share Profile
- Responsive design
- Public profile slug

### 34.2 Required Dashboard Features

- Admin login
- Dashboard home
- Create client
- Edit client
- Client list
- Client detail
- Create profile
- Edit profile
- Live profile preview
- Create/edit links
- Generate slug
- Activate/deactivate profile

### 34.3 Required Card Features

- Create card
- Unique card ID
- Unique short code
- Assign card to client
- Permanent Karti card URL
- Profile destination
- External URL destination
- Change destination remotely
- Generate QR code
- NFC writing where supported
- Copy URL fallback
- Disable card

---

## 35. Explicitly Out of Scope for MVP

Do not build yet:

- Customer accounts
- Client self-service dashboard
- Subscription billing
- Multi-admin organizations
- Advanced CRM
- Email marketing
- Full analytics dashboard
- Native Android app
- Native iOS app
- Drag-and-drop page builder
- Apple Wallet integration
- Google Wallet integration
- Appointment platform
- AI-generated profiles
- Full lead management
- API for external companies

---

## 36. Future Features

Possible later features:

### Customer Dashboard

Allow card owners to update their own profiles.

### Teams

Businesses manage cards for multiple employees.

### Company Templates

Shared branding across employee profiles.

### Duplicate Profile

Copy company branding and edit only:

```text
Name
Photo
Job title
Phone
Email
```

### Lead Exchange

Visitor can send their own contact details back to the card owner.

### Advanced Analytics

Track profile and CTA engagement.

### Wallet Integration

Apple Wallet / Google Wallet.

### Custom Domains

Example:

```text
contact.company.ma
```

### Billing

Subscriptions or annual Karti management plans.

### Public API

Allow companies to synchronize employees.

---

## 37. Product Success Criteria

The main admin flow must work smoothly:

```text
Open Karti
→ New Client
→ Add information
→ Create profile
→ Assign card
→ Generate permanent card URL
→ Write URL to NFC
→ Activate
```

Visitor flow:

```text
Tap NFC card
→ Karti opens quickly
→ Visitor identifies person/business
→ Visitor takes desired action
```

Remote destination flow:

```text
Admin opens existing card
→ Changes destination
→ Saves
→ Same physical card now opens new destination
```

No NFC rewrite should be required.

---

## 38. Implementation Phases

### Phase 1 — Foundation

Build:

- Next.js application
- TypeScript setup
- Supabase project
- Authentication
- Database schema
- Storage setup
- RLS policies
- Dashboard shell
- Base design system

### Phase 2 — Public Profiles

Build:

- Client model
- Profile model
- Link model
- Create/edit profile
- Personal profile
- Business profile
- Public slug
- Public profile page
- Save Contact
- Location
- Social links
- Image uploads
- Live preview

### Phase 3 — Card Management

Build:

- Card model
- Card inventory
- Assignment
- Permanent short codes
- `/t/[code]` resolver
- Profile destination
- External URL destination
- Destination editing
- Card statuses

### Phase 4 — QR + NFC

Build:

- QR generation
- NFC support detection
- Write-to-NFC flow where supported
- Copy URL fallback
- Test-card action
- Success/error states

### Phase 5 — Admin Operations

Build:

- Search clients
- Search cards
- Filters
- Client detail page
- Card detail page
- Activation/deactivation
- Better error states
- Audit-sensitive operations
- Security hardening

### Phase 6 — Polish

Build:

- Premium public UI
- Responsive dashboard
- Better mobile admin experience
- Micro-interactions
- Performance optimization
- Accessibility improvements
- Optional basic analytics

---

## 39. AI Agent Implementation Rules

An AI coding agent working on Karti should follow these principles:

1. **Do not over-engineer the MVP.**
2. **Prefer simple relational models over unnecessary abstractions.**
3. **Preserve the permanent-card-URL architecture.**
4. **Never couple the physical NFC card directly to the final destination.**
5. **Public profiles must remain fast and mobile-first.**
6. **Admin operations must work well from a phone.**
7. **Use TypeScript strictly.**
8. **Keep dashboard and public-profile concerns separated.**
9. **Validate all external URLs before redirecting.**
10. **Do not expose Supabase service-role credentials to the client.**
11. **Use RLS for database protection.**
12. **Avoid adding features listed as out of scope unless explicitly requested.**
13. **Use reusable components, but do not create abstractions before they are needed.**
14. **Prioritize usability over decorative complexity.**
15. **Maintain a consistent Karti visual system across profiles.**

---

## 40. Suggested Project Structure

```text
src/
├── app/
│   ├── (public)/
│   │   ├── [slug]/
│   │   └── t/
│   │       └── [code]/
│   │
│   ├── dashboard/
│   │   ├── clients/
│   │   ├── profiles/
│   │   ├── cards/
│   │   └── settings/
│   │
│   ├── api/
│   │   └── vcard/
│   │
│   └── login/
│
├── components/
│   ├── public-profile/
│   ├── dashboard/
│   └── ui/
│
├── features/
│   ├── clients/
│   ├── profiles/
│   ├── cards/
│   ├── links/
│   ├── nfc/
│   └── qr/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   ├── urls/
│   └── vcard/
│
├── types/
│
└── styles/
```

Exact folder structure can evolve as implementation progresses.

---

## 41. Core Domain Model

```text
Client
├── Profile
│   └── Profile Links
│
└── Cards
    └── Destination
```

Important distinction:

```text
Client != Profile != Card
```

A client can exist before having a profile.

A profile can be edited independently.

A physical card has its own identity and destination.

This separation must remain intact.

---

## 42. Core Product Definition

Karti is not simply:

> An NFC card that opens a website.

Karti is:

> A physical NFC card connected to a remotely manageable digital identity and destination.

Its core system consists of:

```text
KARTI

├── Digital Identity
│   └── Premium public profiles
│
├── Smart Card Infrastructure
│   ├── NFC
│   ├── QR
│   └── Dynamic destinations
│
└── Management Platform
    ├── Clients
    ├── Profiles
    ├── Cards
    └── Future analytics
```

The physical card remains useful even when the cardholder changes:

- Phone number
- Company
- Social account
- Website
- Profile information
- Intended destination
