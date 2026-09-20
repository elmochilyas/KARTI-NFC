# Karti — NFC & QR Specification

## 1. Objective

Karti physical cards must remain reconfigurable after delivery.

The physical NFC card and its QR code therefore point to one permanent Karti resolver URL.

```text
https://karti.app/t/{shortCode}
```

## 2. NFC payload

Write an NDEF URI record containing only the permanent Karti URL.

Do not write:

- direct Instagram URL;
- direct Google Review URL;
- public profile slug URL;
- phone number;
- secret/token;
- admin URL.

## 3. NFC configuration screen

The normal configuration screen is client-centric (`Configure NFC Card`
from the client workspace). It shows destination choices (Karti Profile,
Google Reviews, Instagram, WhatsApp, Website, Custom Link) and prepares
the backend card record automatically — no manual card creation,
assignment, or status handling in the normal flow.

The underlying card identity is still shown on success:

```text
Card number
Assigned client
Card status (human-friendly wording)
Permanent Karti URL
Current destination
```

Actions:

```text
Write to NFC (live: isolated adapter, explicit tap, hold-card writing
state, success with Test Card, retry states, unsupported fallback)
Copy URL
Test Link (live since Phase 8 — opens the current destination)
Generate/View QR (live since Phase 9)
Change Destination
```

## 4. Web NFC adapter

Browser-specific NFC code must be isolated behind a small adapter.

Suggested conceptual interface:

```ts
type NfcWriteResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "permission" | "cancelled" | "write_failed" };

interface NfcWriter {
  isSupported(): boolean;
  writeUrl(url: string): Promise<NfcWriteResult>;
}
```

The rest of the application should not depend directly on `NDEFReader`.

## 5. Supported flow

```text
Admin opens card
→ Write to NFC
→ app confirms permanent URL
→ browser requests scan/write
→ "Hold card near phone"
→ success
```

After success offer:

```text
Test Link
```

## 6. Unsupported flow

When browser NFC writing is unavailable:

```text
NFC writing isn't supported in this browser.
Copy the permanent Karti URL and write it with an NFC writer app.
```

`Copy URL` must remain available.

## 7. Errors

Handle:

- unsupported browser;
- permission denied;
- scan cancelled;
- write failed;
- invalid card state;
- missing short code.

Never leave the admin in a permanent loading state.

## 8. QR

The QR code payload is identical to the NFC URL:

```text
https://karti.app/t/{shortCode}
```

Single payload helper `qrPayloadForCard()` (= `permanentCardUrl()`); never
a slug or destination. Shared `CardQrCode` component (client NFC section,
configure-success state, advanced card detail): 240px black-on-white
display, quiet-zone margins, EC level M, no decorative branding inside the
code; Download QR renders a fresh 1024px white-background PNG
(`karti-{number}-{code}-qr.png`). Physical camera scan confirmation remains
a human check.

## 9. Destination change test

This is a mandatory acceptance test:

```text
1. Card NFC/QR points to /t/ABC123
2. Dashboard destination = Karti profile
3. Tap/scan → profile
4. Dashboard destination changed to Google Reviews
5. Tap/scan the same physical card / same QR
6. Google Reviews opens
```

No tag rewrite and no QR regeneration.

## 10. Physical-card preparation

Card records may be created in advance as inventory:

```text
KARTI-000001
KARTI-000002
...
```

Each receives a random short code.

This allows Karti to pre-program batches if desired.

## 11. Security

NFC and QR are public surfaces.

They must contain no secret information.

A short code identifies a public routing resource only and never authenticates the admin.
