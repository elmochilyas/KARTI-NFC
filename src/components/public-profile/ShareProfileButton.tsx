"use client";

import { useState } from "react";
import { LuChevronRight, LuShare2 } from "react-icons/lu";

/**
 * Share Profile action. Uses the Web Share API where available, otherwise
 * copies the public profile URL. Tiny client island — the rest of the
 * public page stays server-rendered with zero JS.
 */
export function ShareProfileButton({ title, dark }: { title: string; dark: boolean }) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onShare() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        setFeedback("Shared ✓");
        return;
      }
      throw new Error("no-web-share");
    } catch (error) {
      // User dismissal is not an error worth surfacing.
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setFeedback("Link copied ✓");
      } catch {
        setFeedback("Copy this page URL to share");
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
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
        <span className="block truncate text-[15px] font-bold">{feedback ?? "Share Profile"}</span>
        <span
          className={`block truncate text-xs font-medium ${dark ? "text-neutral-400" : "text-muted"}`}
        >
          {feedback ? "Done" : "Send this page to someone"}
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
