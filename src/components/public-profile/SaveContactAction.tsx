"use client";

import { useEffect, useRef, useState } from "react";
import { LuUserPlus } from "react-icons/lu";
import { foregroundOnAccent } from "./ProfilePreview";

/**
 * Save Contact action — direct navigation to the canonical vCard endpoint.
 *
 * The anchor is a real same-tab link (`/api/vcard/{slug}`, no `download`
 * attribute, no JS Blob fetch) so iOS Safari / Android Chrome receive a
 * genuine `text/vcard` response and open the native contact/import flow.
 * The client state is progressive enhancement only:
 *
 * idle → opening → (browser leaves for the native flow)
 *            ↘ still here after timeout → gentle fallback
 *
 * The fallback reuses the same canonical endpoint — never a second contact
 * system, never an `intent://` URL.
 */

/** How long to wait before concluding the native flow did not open. */
export const SAVE_CONTACT_OPENING_TIMEOUT_MS = 4000;

type SaveContactState = "idle" | "opening" | "failed";

const ACCENT_GRADIENT =
  "linear-gradient(135deg, var(--karti-accent), color-mix(in srgb, var(--karti-accent) 58%, black))";

/** Graceful fallback shown only when the native flow did not open. */
export function SaveContactFallback({ href }: { href: string }) {
  return (
    <p className="mt-2 text-center text-[13px] font-medium" role="status">
      Couldn&apos;t open Contacts.{" "}
      <a href={href} className="font-bold underline underline-offset-2">
        Download contact
      </a>
    </p>
  );
}

export function SaveContactAction({
  href,
  accent,
  variant,
}: {
  /** Canonical vCard endpoint, e.g. `/api/vcard/ahmed-benali`. */
  href: string;
  accent: string | null;
  /** `cta` = in-flow button, `sticky` = bottom sticky bar. */
  variant: "cta" | "sticky";
}) {
  const [state, setState] = useState<SaveContactState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function handleClick() {
    if (state === "failed") return;
    setState("opening");
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // A successful tap leaves this page for the native contact preview.
      // If we are still visible, the navigation was blocked — offer fallback.
      if (document.visibilityState === "visible") setState("failed");
    }, SAVE_CONTACT_OPENING_TIMEOUT_MS);
  }

  const label = state === "opening" ? "Opening…" : "Save Contact";

  if (variant === "sticky") {
    return (
      <div aria-live="polite">
        <a
          href={href}
          onClick={handleClick}
          aria-label="Save contact"
          className="pointer-events-auto flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[16px] font-extrabold shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-110 active:scale-[0.99]"
          style={{
            backgroundImage: ACCENT_GRADIENT,
            color: foregroundOnAccent(accent),
          }}
        >
          <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
          {label}
        </a>
        {state === "failed" ? <SaveContactFallback href={href} /> : null}
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <a
        href={href}
        onClick={handleClick}
        className="karti-rise flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[18px] px-6 text-[16px] font-extrabold transition hover:brightness-110 active:scale-[0.99]"
        style={{
          animationDelay: "60ms",
          backgroundImage: ACCENT_GRADIENT,
          color: foregroundOnAccent(accent),
          boxShadow: "0 14px 28px -12px color-mix(in srgb, var(--karti-accent) 65%, transparent)",
        }}
      >
        <LuUserPlus size={22} aria-hidden="true" className="shrink-0" />
        {label}
      </a>
      {state === "failed" ? <SaveContactFallback href={href} /> : null}
    </div>
  );
}
