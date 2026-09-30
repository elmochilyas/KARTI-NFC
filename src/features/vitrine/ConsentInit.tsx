/**
 * Blocking Consent Mode init (public vitrine only — rendered first in
 * `VitrineShell`, before `GtmBootstrap`).
 *
 * Server-rendered inline `<script>`: the browser executes it synchronously
 * while parsing the document, so `gtag('consent', 'default', … denied)`
 * always runs BEFORE the GTM container (`gtm.js`, loaded `afterInteractive`
 * by `GtmBootstrap`) executes. That pre-container default is exactly what
 * Tag Assistant's Consent tab requires — a `useEffect`-only push races
 * hydration against the container load and reads as "non configuré".
 *
 * No `window` access here: the JS runs from `buildConsentInitScript()`
 * (pure/testable in `./gtm`). Receipt routes bail out inside the script
 * itself (pathname check before touching dataLayer), and dashboard/login
 * never render `VitrineShell`, so this script loads nowhere else.
 */

import { buildConsentInitScript, CONSENT_SCRIPT_ID } from "./gtm";

export function ConsentInit() {
  return (
    <script id={CONSENT_SCRIPT_ID} dangerouslySetInnerHTML={{ __html: buildConsentInitScript() }} />
  );
}
