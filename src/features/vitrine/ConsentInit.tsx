/**
 * Blocking Consent Mode init (public vitrine only — rendered first in
 * `VitrineShell`, before `GtmBootstrap`).
 *
 * WHY A RAW SERVER-RENDERED SCRIPT: the browser must execute
 * `gtag('consent', 'default', … denied)` synchronously while parsing the
 * document, so it runs BEFORE the GTM container (`gtm.js`, loaded
 * `lazyOnload` — and only after analytics consent — by `GtmBootstrap`). That pre-container default is
 * exactly what Tag Assistant's Consent tab requires; a `useEffect`-only
 * push races hydration against the container and reads as "non configuré".
 *
 * WHY useSyncExternalStore: React 19 (shipped with Next 16) raises a dev
 * console error whenever a `<script>` is created during a fresh CLIENT
 * render, because such a script would never execute there:
 *   "Encountered a script tag while rendering React component. Scripts
 *    inside React components are never executed when rendering on the
 *    client."
 * Rendering the script only via the SERVER snapshot (and `null` on every
 * post-hydration client render) keeps the blocking server-injected script
 * — it still executes during HTML parsing, before hydration and before
 * gtm.js — while never triggering that warning. `getServerSnapshot` is
 * used by SSR *and* the hydration render (React adopts the existing node,
 * so there is no mismatch); `getSnapshot` is used by every fresh client
 * mount, which therefore renders nothing. Net behavior is unchanged: the
 * script only ever runs on a full document load, never on an SPA
 * navigation — exactly as before. (Same pattern Material-UI shipped for
 * `InitColorSchemeScript` on React 19.3.)
 *
 * `dangerouslySetInnerHTML` is BOTH required and controlled here: the
 * content is the static, framework-generated string from
 * `buildConsentInitScript()` (a pure function, no user input), and it must
 * be a real inline script to run pre-hydration/pre-GTM — a React element
 * or `<template>` cannot do that.
 *
 * No `window` access here: the JS runs from `buildConsentInitScript()`
 * (pure/testable in `./gtm`). Receipt routes bail out inside the script
 * itself (pathname check before touching dataLayer), and dashboard/login
 * never render `VitrineShell`, so this script loads nowhere else.
 */
"use client";

import { useSyncExternalStore } from "react";
import { buildConsentInitScript, CONSENT_SCRIPT_ID } from "./gtm";

/** No external store to subscribe to — the snapshot is a constant. */
const subscribe = () => () => {};
const getClientSnapshot = () => false;
const getServerSnapshot = () => true;

export function ConsentInit() {
  const renderScript = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  if (!renderScript) return null;
  return (
    <script id={CONSENT_SCRIPT_ID} dangerouslySetInnerHTML={{ __html: buildConsentInitScript() }} />
  );
}
