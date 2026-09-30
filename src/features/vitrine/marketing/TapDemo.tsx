/**
 * Hero-level tap demo (client island, lightweight): large stable card,
 * large switching phone. Content-only state; the ping dot is
 * motion-safe (static under prefers-reduced-motion).
 */
"use client";

import { useState } from "react";
import { trackEvent } from "../analytics";
import type { VitrineDict, VitrineLocale } from "../i18n/dict";
import { TapVisual } from "./Mockups";

export function TapDemo({
  locale,
  dict,
  cardLabel,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  cardLabel: string;
}) {
  const tabs = dict.marketingHome.demoTabs;
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label={dict.marketingHome.demoTitle}
        className="flex flex-wrap justify-center gap-2"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => {
              setActive(tab.id);
              trackEvent("tap_demo_changed", { tab: tab.id, locale });
            }}
            className={`inline-flex min-h-12 cursor-pointer items-center rounded-full border px-5 text-base font-medium ${
              active === tab.id
                ? "border-accent bg-accent text-accent-contrast"
                : "border-border bg-surface text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-10" role="tabpanel" aria-live="polite">
        <TapVisual
          size="lg"
          cardLabel={cardLabel}
          cardSub={current.label}
          phoneTitle={current.phoneTitle}
          phoneLines={current.phoneLines}
        />
      </div>
    </div>
  );
}
