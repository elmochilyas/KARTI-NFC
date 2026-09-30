/**
 * Analytics tracking islands (client, tiny). Content is always
 * server-rendered; these only emit privacy-safe events.
 */
"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsPayload } from "../analytics";

/** Fires once on mount (page-view style events). */
export function PageView({
  event,
  payload,
}: {
  event: AnalyticsEventName;
  payload?: AnalyticsPayload;
}) {
  useEffect(() => {
    trackEvent(event, payload ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Link with a click event. Use for product/order CTAs. */
export function TrackLink({
  href,
  event,
  payload,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: AnalyticsEventName;
  payload?: AnalyticsPayload;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      onClick={() => trackEvent(event, payload ?? {})}
    >
      {children}
    </Link>
  );
}

/** External anchor with a click event (WhatsApp continuations). */
export function WhatsappCta({
  href,
  className,
  children,
  context,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  context: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackEvent("whatsapp_clicked", { context })}
    >
      {children}
    </a>
  );
}

/**
 * Delegated faq_open tracking for a server-rendered <details> block.
 * Attaches one toggle listener scoped to the section id; content and
 * behavior stay server-side.
 */
export function FaqOpenTracker({ sectionId, page }: { sectionId: string; page: string }) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const onToggle = (event: Event) => {
      const details = event.target as HTMLElement;
      if (details.tagName !== "DETAILS") return;
      if (!(details as HTMLDetailsElement).open) return;
      const summary = details.querySelector("summary")?.textContent?.trim().slice(0, 120);
      trackEvent("faq_open", { page, question: summary ?? null });
    };
    section.addEventListener("toggle", onToggle, true);
    return () => section.removeEventListener("toggle", onToggle, true);
  }, [sectionId, page]);
  return null;
}
