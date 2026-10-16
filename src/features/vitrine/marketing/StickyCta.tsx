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
  meta,
  shortAction,
}: {
  href: string;
  title: string;
  action: string;
  /** Optional compact meta (e.g. the PDP price line) shown under the title. */
  meta?: string | null;
  /** Optional compact label (e.g. nav.orderCtaShort) shown on small screens. */
  shortAction?: string | null;
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-16px_rgb(11_27_22/0.25)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-text">{title}</p>
              {meta ? (
                <p className="truncate text-[13px] font-semibold text-muted tabular-nums">{meta}</p>
              ) : null}
            </div>
            <Link
              href={href}
              className="font-display inline-flex min-h-12 shrink-0 items-center rounded-full bg-accent px-6 text-[15px] font-bold text-accent-contrast shadow-[0_8px_20px_-8px_rgb(14_124_91/0.6)] transition-colors hover:bg-accent-strong sm:px-7"
            >
              {shortAction ? (
                <>
                  <span className="sm:hidden">{shortAction}</span>
                  <span className="hidden sm:inline">{action}</span>
                </>
              ) : (
                action
              )}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
