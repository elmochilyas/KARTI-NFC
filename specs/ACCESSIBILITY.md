# Karti — Accessibility Specification

## 1. Target

Karti should meet practical WCAG 2.1 AA-level expectations for core flows.

## 2. Semantic HTML

Use native semantics:

```text
button → actions
a → navigation/external links
label → form fields
nav → navigation
main → page content
```

Do not create clickable `div` controls.

## 3. Keyboard

Dashboard must support keyboard navigation.

Requirements:

- visible focus;
- logical tab order;
- no keyboard trap;
- menus/dialogs return focus appropriately.

## 4. Touch targets

Important mobile controls should have comfortable touch targets.

Avoid tiny icon buttons for key actions.

## 5. Color

Do not communicate status solely through color.

Maintain readable contrast, especially when admins choose accent colors.

If user-selected accent produces poor contrast, adapt text/button treatment automatically.

## 6. Forms

Every input:

- has a visible or accessible label;
- associates error text properly;
- does not use placeholder as the only label.

## 7. Icons

Icon-only actions need accessible names.

Social links should expose meaningful labels such as:

```text
Open Instagram
Call Younes
Open location
```

## 8. Images

Profile image/logo:

- appropriate alt text when meaningful;
- decorative images use empty alt where appropriate.

## 9. Status feedback

Async actions should communicate:

- saving;
- success;
- failure.

Do not rely only on color changes.

## 10. Motion

Respect reduced-motion preference for non-essential animations.

## 11. Verification

Before release verify:

- keyboard-only navigation;
- focus visibility;
- forms;
- contrast;
- screen-reader-friendly action names;
- responsive zoom/layout.
