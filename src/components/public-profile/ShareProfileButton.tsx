"use client";

import { useEffect, useRef, useState } from "react";
import { LuChevronRight, LuShare2 } from "react-icons/lu";

/**
 * Share Profile action. Uses the Web Share API where available, otherwise
 * copies the public profile URL. Tiny client island — the rest of the
 * public page stays server-rendered with zero JS.
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

export function ShareProfileButton({ title, dark }: { title: string; dark: boolean }) {
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

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share this profile"
      aria-live="polite"
      className={`flex min-h-[60px] w-full items-center gap-3 rounded-[18px] border px-3.5 py-2 text-left transition hover:-translate-y-px active:scale-[0.99] ${
        dark
          ? "border-white/10 bg-white/[0.06] text-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)] hover:bg-white/[0.09]"
          : "border-[#E7EDF4] bg-white text-text shadow-[0_8px_24px_rgba(15,35,60,0.08)] hover:bg-[#F8FAFD]"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: "color-mix(in srgb, var(--karti-accent) 12%, transparent)",
          color: "var(--karti-accent)",
        }}
      >
        <LuShare2 size={22} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-bold">
          {feedback ?? "Share Profile"}
        </span>
        <span
          className={`block truncate text-xs font-medium ${dark ? "text-neutral-400" : "text-muted"}`}
        >
          {feedback ? "Done" : "Share this profile with someone"}
        </span>
      </span>
      <LuChevronRight
        size={18}
        aria-hidden="true"
        className={`shrink-0 ${dark ? "text-neutral-500" : "text-muted"}`}
      />
    </button>
  );
}
