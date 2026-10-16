/**
 * Deferred consent-banner boundary (PageSpeed): the banner only appears
 * 800ms after load for first-time visitors (returning visitors with a
 * choice never see it), so its JS rides in a separate chunk instead of
 * the critical LCP bundle. `ssr: false` is safe here — the banner's
 * initial server render is always `null` anyway (`visible` starts false).
 */
"use client";

import dynamic from "next/dynamic";
import type { VitrineDict } from "./i18n";

const ConsentBannerIsland = dynamic(() => import("./ConsentBanner").then((m) => m.ConsentBanner), {
  ssr: false,
});

export function ConsentBannerLazy({ dict }: { dict: VitrineDict }) {
  return <ConsentBannerIsland dict={dict} />;
}
