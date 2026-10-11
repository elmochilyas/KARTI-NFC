import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsentInit } from "./ConsentInit";
import { CONSENT_SCRIPT_ID } from "./gtm";

/**
 * Regression guard for the React 19 / Next 16 "Encountered a script tag
 * while rendering React component" error.
 *
 * ConsentInit must STILL render the blocking consent script into the
 * server HTML (that is what makes `gtag('consent','default',…)` run before
 * gtm.js), while rendering nothing on the client snapshot. This test pins
 * the SSR half — the half that carries the consent behavior. The client
 * half (`useSyncExternalStore` snapshot `false`) is what removes the
 * warning and needs a DOM renderer, which this repo's node-only Vitest
 * environment intentionally does not have.
 */
describe("ConsentInit (blocking script, SSR contract)", () => {
  it("renders the consent script into server markup", () => {
    const html = renderToStaticMarkup(createElement(ConsentInit));
    expect(html).toContain(`id="${CONSENT_SCRIPT_ID}"`);
    // The default-denied consent command is present in the server HTML.
    expect(html).toContain('"consent","default"');
    expect(html).toContain('analytics_storage:"denied"');
  });
});
