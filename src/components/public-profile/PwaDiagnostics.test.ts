import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PwaDiagnostics } from "./PwaDiagnostics";

describe("PwaDiagnostics", () => {
  it("renders nothing outside a development ?pwa-debug=1 session", () => {
    // NODE_ENV=test here: the panel must never leak into production markup.
    const html = renderToStaticMarkup(createElement(PwaDiagnostics));
    expect(html).toBe("");
  });
});
