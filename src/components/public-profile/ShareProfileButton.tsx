"use client";

import { useEffect, useRef, useState } from "react";
import { LuChevronRight, LuShare2 } from "react-icons/lu";

/**
 * Share my profile action — the strong final CTA of the public page.
 * Uses the Web Share API where available, otherwise copies the public
 * profile URL. Tiny client island — the rest of the public page stays
 * server-rendered with zero JS.
 *
 * Security: only the public display name + current public page URL are
 * ever shared. No client/card IDs, dashboard URLs, notes, or private data.
 */

export const SHARE_COPIED_MESSAGE = "Profile link copied";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

/**
 * Build the Web Share payload from public-only inputs.
 * Personalized per operator choice: "Check out {Name} on Karti".
 * Exported for unit tests.
 */
export function buildSharePayload(displayName: string, url: string): SharePayload {
  const name = displayName.trim();
  return {
    title: name === "" ? "Karti Profile" : name,
    text: name === "" ? "Check out this profile on Karti" : `Check out ${name} on Karti`,
    url,
  };
}

/**
 * Legacy copy for contexts without the async clipboard API. Best-effort.
 * Exported for unit tests (takes the document so tests can inject a fake).
 */
export function legacyCopy(text: string, doc: Document = document): boolean {
  try {
    const area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    doc.body.appendChild(area);
    area.select();
    const ok = doc.execCommand("copy");
    doc.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function ShareProfileButton({
  title,
  dark,
  accent = null,
}: {
  title: string;
  dark: boolean;
  accent?: string | null;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function flash(message: string) {
    setFeedback(message);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), 2500);
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(buildSharePayload(title, url));
        return;
      }
      throw new Error("no-web-share");
    } catch (error) {
      // User dismissal is not an error worth surfacing.
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof Error && error.name === "AbortError") return;
      try {
        if (
          typeof navigator.clipboard !== "undefined" &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          await navigator.clipboard.writeText(url);
          flash(SHARE_COPIED_MESSAGE);
          return;
        }
        throw new Error("no-clipboard");
      } catch {
        if (legacyCopy(url)) {
          flash(SHARE_COPIED_MESSAGE);
        } else {
          flash("Copy this page URL to share");
        }
      }
    }
  }

  const accentValue = accent ?? null;
  void dark;
  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share my profile"
      aria-live="polite"
      title="Share my profile — Send my digital card"
      className="flex min-h-[68px] w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_18px_40px_-14px_var(--karti-accent)] transition duration-150 hover:-translate-y-px hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.98]"
      style={{
        backgroundColor: accentValue ?? "var(--karti-accent, #0e7c5b)",
        color: "#ffffff",
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
      >
        <LuShare2 size={23} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[16px] leading-tight font-extrabold break-words">
          {feedback ?? "Share my profile"}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug font-medium break-words text-white/85">
          {feedback ? "Done" : "Send my digital card"}
        </span>
      </span>
      <LuChevronRight size={20} aria-hidden="true" className="shrink-0 text-white/80" />
    </button>
  );
}
