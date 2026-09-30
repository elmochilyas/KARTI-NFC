/**
 * Reusable public vitrine shell: header, content, footer.
 *
 * Marketing-only. Dashboard and public-profile routes never render this.
 * Visual direction follows the repo tokens: clean surfaces, strong type,
 * generous whitespace, restrained panels, mobile-first.
 */

import type { ReactNode } from "react";
import { AttributionTracker } from "./AttributionTracker";
import { ConsentBanner } from "./ConsentBanner";
import { ConsentInit } from "./ConsentInit";
import { GtmBootstrap } from "./GtmBootstrap";
import type { VitrineDict, VitrineLocale } from "./i18n";
import { SiteFooter } from "./marketing/Footer";
import { SiteHeader } from "./marketing/Header";
import { PageViewTracker } from "./PageViewTracker";

export function VitrineShell({
  locale,
  dict,
  children,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  children: ReactNode;
}) {
  return (
    <div lang={locale} dir={dict.dir} className="min-h-screen bg-background text-text">
      <AttributionTracker />
      {/* Blocking consent default — must parse/execute before gtm.js. */}
      <ConsentInit />
      <GtmBootstrap />
      <PageViewTracker locale={locale} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-contrast"
      >
        {dict.common.skipToContent}
      </a>
      <SiteHeader locale={locale} dict={dict} />
      <main id="main-content">{children}</main>
      <SiteFooter locale={locale} dict={dict} />
      <ConsentBanner dict={dict} />
    </div>
  );
}
