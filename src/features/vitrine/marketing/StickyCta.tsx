/**
 * Restrained sticky commercial CTA (client island): appears only after
 * the hero scrolls out of view, and hides again when the page footer or
 * the closing CTA is visible — so it never obstructs the footer or
 * duplicates an action already on screen. Safe-area aware.
 * No scroll libraries.
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function StickyCta({
  href,
  title,
  action,
}: {
  href: string;
  title: string;
  action: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const [bottomVisible, setBottomVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const heroObserver = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), {
      threshold: 0,
    });
    heroObserver.observe(sentinel);
    const bottomObserver = new IntersectionObserver(
      (entries) => setBottomVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0 },
    );
    const targets: Element[] = Array.from(document.querySelectorAll("footer, [data-final-cta]"));
    for (const target of targets) bottomObserver.observe(target);
    return () => {
      heroObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, []);

  const visible = pastHero && !bottomVisible;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {visible ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-16px_rgb(11_27_22/0.25)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-sm font-semibold text-text">{title}</p>
            <Link
              href={href}
              className="inline-flex min-h-12 shrink-0 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-contrast shadow-[0_8px_20px_-8px_rgb(14_124_91/0.6)] hover:bg-accent-strong"
            >
              {action}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
