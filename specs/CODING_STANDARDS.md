# Karti — Coding Standards

## TypeScript

Use strict TypeScript.

Avoid `any`; prefer `unknown` at untrusted boundaries and narrow after validation.

Centralize domain values/types:

```text
ProfileType
ProfileStatus
CardStatus
DestinationType
```

## Validation

Use one shared validation approach, preferably Zod if compatible with the project.

Validate server boundaries even if the form validates client-side.

## Next.js

Prefer Server Components by default.

Use Client Components for genuine browser interaction such as:

- live preview;
- reorder controls;
- NFC;
- browser APIs;
- interactive forms where needed.

Avoid unnecessary broad `"use client"` boundaries.

## Components

Prefer purposeful components:

```text
ProfileHeader
SaveContactButton
ContactActions
ProfileLinks
CardDestinationForm
```

Avoid giant all-purpose components.

## Business logic

Keep business rules outside JSX.

Examples:

```text
normalizeProfileSlug
validateExternalDestination
resolveCardDestination
generateCardShortCode
buildVCard
```

## Data fetching

Privileged fetching stays server-side.

Public routes select only fields they need.

Do not pass full DB records with private fields into client components.

## Naming

Use domain names such as:

```text
shortCode
cardNumber
destinationType
profileSlug
```

Avoid vague `value`, `type`, `data`, `code` where context is ambiguous.

## Errors

Do not swallow errors.

Distinguish:

- validation;
- unauthorized;
- not found;
- conflict;
- infrastructure failure.

## Styling

Use Tailwind consistently if it is the project standard.

Public Karti profiles should use custom visual composition instead of looking like default component-library demos.

## Accessibility

Use actual semantic controls:

- `<button>` for actions;
- `<a>` for navigation;
- labels for form controls.

Do not use clickable `div`s for core interactions.

## Generated code/types

Do not hand-edit generated Supabase types.

Regenerate after migrations.

## Dependencies

Before adding a dependency:

1. confirm platform/framework cannot solve it simply;
2. check it is maintained;
3. avoid a large dependency for a tiny utility.

## Performance

Public profile performance has priority.

- optimize images;
- minimize client JS;
- avoid unnecessary animation libraries;
- avoid third-party scripts unless required.

## Formatting

Use project formatter.

Do not mass-format unrelated code.
