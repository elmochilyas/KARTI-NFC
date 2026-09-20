# Karti — Performance Specification

## 1. Priority

The public Karti profile and card redirect are performance-critical.

A visitor often arrives by tapping a physical card in a real-world interaction.

Delay makes the physical product feel broken.

## 2. Public profile principles

Prefer:

- server components;
- server rendering;
- optimized images;
- minimal JavaScript;
- no unnecessary third-party scripts;
- lazy loading below-the-fold media;
- small icon strategy.

Avoid shipping dashboard libraries to public routes.

## 3. Redirect resolver

`/t/[code]` should perform the minimum required work:

```text
validate code
query card/destination
verify state
redirect
```

Do not perform unrelated profile analytics or heavy computation before redirecting.

If event logging is added later, it should not make the redirect fragile.

## 4. Images

Use Next.js image optimization where appropriate.

Requirements:

- constrain upload dimensions/size;
- avoid serving multi-megabyte avatars;
- provide sizes;
- use efficient formats.

## 5. Fonts

Avoid excessive font files/weights.

Public profile should remain fast on mobile networks.

## 6. Client components

Keep `"use client"` boundaries narrow.

Live editor preview can be interactive; public profile does not need to inherit that client-side architecture.

## 7. Caching

Public profile data can use caching/revalidation if changes become visible promptly.

Redirect destination must update quickly after an admin changes it.

Do not cache resolver decisions for long periods.

## 8. Performance verification

Before MVP release inspect:

- public-profile JS payload;
- image sizes;
- network requests;
- redirect latency;
- layout shift;
- unnecessary third-party code.

Performance regressions on public profile are release blockers when severe.
