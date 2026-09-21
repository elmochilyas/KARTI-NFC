"use client";

import { useEffect, useState } from "react";
import { detectInstallEnvironment } from "./KeepProfileButton";

/**
 * Development-only PWA diagnostic panel (Phase 23).
 *
 * Renders nothing unless BOTH hold: a development build AND the
 * `?pwa-debug=1` query flag. Validates the install surface live in the
 * browser: manifest fetch + shape, icon fetch, Apple meta tags, secure
 * context, display-mode, and the parsed install environment. Never ships
 * meaningful UI in production (early null) and touches no privileged
 * modules — pure DOM reads plus same-origin fetches of public assets.
 */

type Check = { label: string; ok: boolean | null; detail: string };

function metaContent(name: string): string | null {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? (el.getAttribute("content") ?? "") : null;
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // 1. Manifest link + body.
  const manifestHref = document.querySelector('link[rel="manifest"]')?.getAttribute("href");
  if (!manifestHref) {
    checks.push({ label: "manifest link", ok: false, detail: "no <link rel=manifest>" });
  } else {
    try {
      const res = await fetch(manifestHref, { cache: "no-store" });
      const ctype = res.headers.get("content-type") ?? "";
      const body = (await res.json()) as Record<string, unknown>;
      const icons = Array.isArray(body.icons) ? body.icons : [];
      const fieldsOk =
        typeof body.name === "string" &&
        typeof body.short_name === "string" &&
        typeof body.start_url === "string" &&
        typeof body.scope === "string" &&
        body.display === "standalone" &&
        icons.length >= 3;
      const ctypeOk = ctype.includes("application/manifest+json");
      checks.push({
        label: "manifest body",
        ok: res.ok && ctypeOk && fieldsOk,
        detail: `${res.status} ${ctype || "?"} · start=${String(body.start_url)} scope=${String(body.scope)} icons=${icons.length}`,
      });
    } catch (error) {
      checks.push({
        label: "manifest body",
        ok: false,
        detail: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }

  // 2. Apple touch icon.
  const iconHref = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href");
  if (!iconHref) {
    checks.push({ label: "apple-touch-icon", ok: false, detail: "no link tag" });
  } else {
    try {
      const res = await fetch(iconHref, { cache: "no-store" });
      const ctype = res.headers.get("content-type") ?? "";
      const bytes = (await res.arrayBuffer()).byteLength;
      checks.push({
        label: "apple-touch-icon",
        ok: res.ok && ctype.includes("image/png") && bytes > 0,
        detail: `${res.status} ${ctype || "?"} ${bytes}B`,
      });
    } catch (error) {
      checks.push({
        label: "apple-touch-icon",
        ok: false,
        detail: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }

  // 3. Meta tags.
  const theme = metaContent("theme-color");
  const capable = metaContent("apple-mobile-web-app-capable");
  const title = metaContent("apple-mobile-web-app-title");
  checks.push({
    label: "meta tags",
    ok: theme !== null && capable === "yes" && title !== null,
    detail: `theme=${theme ?? "—"} capable=${capable ?? "—"} title=${title ?? "—"}`,
  });

  // 4. Runtime context.
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  checks.push({
    label: "secure context",
    ok: window.isSecureContext,
    detail: String(window.isSecureContext),
  });
  checks.push({
    label: "display-mode",
    ok: null,
    detail: standalone ? "standalone (installed)" : "browser tab",
  });
  checks.push({
    label: "install environment",
    ok: null,
    detail: detectInstallEnvironment(window.navigator.userAgent),
  });

  return checks;
}

export function PwaDiagnostics() {
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!window.location.search.includes("pwa-debug=1")) return;
    let cancelled = false;
    runChecks()
      .then((result) => {
        if (!cancelled) setChecks(result);
      })
      .catch(() => {
        if (!cancelled) setChecks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || checks === null) return null;

  const failures = checks.filter((c) => c.ok === false).length;
  return (
    <details
      className="mx-4 mb-4 rounded-[16px] border border-dashed border-amber-500/60 bg-amber-50 px-4 py-3 text-left text-[13px] text-amber-900"
      aria-label="PWA diagnostics (development only)"
    >
      <summary className="cursor-pointer font-bold">
        PWA check{" "}
        {checks.length === 0
          ? "(running…)"
          : failures === 0
            ? "✓ all pass"
            : `✗ ${failures} failing`}
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {checks.map((c) => (
          <li key={c.label} className="break-words">
            <strong>
              {c.ok === null ? "•" : c.ok ? "✓" : "✗"} {c.label}
            </strong>
            : {c.detail}
          </li>
        ))}
      </ul>
    </details>
  );
}
