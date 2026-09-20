# Karti — Routes & Server Contracts

## Public routes

### `/`

Marketing/home page. MVP can be minimal.

### `/[slug]`

Public profile.

Behavior:

```text
ACTIVE profile → render
missing → 404/unavailable
DRAFT/INACTIVE → not publicly rendered
```

### `/t/[code]`

Permanent card resolver.

Flow:

```text
validate code
→ find card
→ require ACTIVE
→ resolve destination
→ validate target
→ redirect
```

Failure states include:

- missing card;
- unassigned;
- disabled;
- lost;
- replaced;
- missing/inactive target profile;
- unsafe/malformed external URL.

All failures share one generic unavailable page (no status/existence leaks).
Successful resolution responds `307 Temporary Redirect` with
`Cache-Control: no-store` — never 301/308, so remote destination changes
take effect immediately (ADR-024). Short codes are case-normalized.

### `/api/vcard/[slug]`

`GET`

Loads active profile, builds `.vcf`, returns appropriate download/content headers.

Alias `GET /api/vcard/[slug].vcf` (ADR-038) serves the byte-identical
`inline` `text/vcard` response so OS sniffers that key off the extension
hand it to Contacts; the suffix is stripped before the normalized-slug
lookup and the disposition filename comes from the stored slug.

No private client notes/admin data.

## Dashboard routes

Recommended:

```text
/login
/dashboard

/dashboard/clients
/dashboard/clients/new
/dashboard/clients/[id]

/dashboard/profiles/[id]

/dashboard/cards
/dashboard/cards/[id]

/dashboard/settings
```

## Dashboard operations

Prefer Server Actions where appropriate.

### Client

```text
createClient
updateClient
```

### Profile

```text
createProfile
updateProfile
setProfileStatus
changeProfileSlug
```

Changing a profile slug must not require rewriting a physical card.

### Profile links

```text
createProfileLink
updateProfileLink
deleteProfileLink
toggleProfileLink
reorderProfileLinks
```

### Cards

```text
createCard
assignCardToClient
unassignCard
setDestinationToProfile
setDestinationToExternalUrl
setCardStatus
```

## External URL safety

Allowed schemes:

```text
https:
http:
```

Reject:

```text
javascript:
data:
file:
vbscript:
```

Use a real URL parser.

Instagram, Google Reviews, WhatsApp, booking, menus and websites can all use `EXTERNAL_URL` in MVP.

## Error contract

Use predictable results.

Example:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

Exact syntax may differ; consistency matters.

## Resolver pseudocode

```ts
const card = await getCardByShortCode(code);

if (!card || card.status !== "ACTIVE") {
  return unavailable();
}

if (card.destinationType === "PROFILE") {
  const profile = await getActiveProfile(card.destinationProfileId);
  if (!profile) return unavailable();
  return redirect(`/${profile.slug}`);
}

if (card.destinationType === "EXTERNAL_URL") {
  const target = validateSafeExternalUrl(card.destinationUrl);
  if (!target) return unavailable();
  return redirect(target);
}

return unavailable();
```

## Metadata

Public profiles should generate:

- title;
- description;
- Open Graph metadata where useful.

Never include private notes in metadata.

## Rate limits

Consider rate limiting for login and future public-write endpoints.

Do not add limits that make normal NFC taps unreliable.
