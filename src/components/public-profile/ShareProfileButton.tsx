"use client";

import { useState } from "react";
import { LuShare2 } from "react-icons/lu";
import { LuChevronRight } from "react-icons/lu";

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
        setFeedback("Shared");
        return;
      }
      throw new Error("no-web-share");
    } catch (error) {
      // User dismissal is not an error worth surfacing.
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setFeedback("Link copied");
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
      className={`flex min-h-14 w-full items-center gap-3 rounded-[20px] border px-5 py-3.5 text-left transition hover:-translate-y-px active:scale-[0.99] ${
        dark
          ? "border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.1]"
          : "border-[#D8E6F7] bg-[#EAF2FB] text-[#0B4EA2] hover:bg-[#e0edfa]"
      }`}
    >
      <LuShare2 size={22} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 text-[15px] font-bold">{feedback ?? "Share Profile"}</span>
      <LuChevronRight size={18} aria-hidden="true" className="shrink-0 opacity-60" />
    </button>
  );
}
