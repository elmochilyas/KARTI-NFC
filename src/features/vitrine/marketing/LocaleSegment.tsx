/**
 * Segmented language control (client island): one pill container, three
 * full-name options, active locale filled. Same path-preserving swap as
 * the header globe menu — the locale prefix is replaced, the rest of the
 * path stays, so visitors land on the same page in the other language.
 * Plain anchors (progressive enhancement, zero popover JS).
 */
"use client";

import { usePathname } from "next/navigation";
import { VITRINE_LOCALES, type VitrineLocale } from "../i18n/dict";
import { localePath } from "../site";

const LOCALE_NAMES: Record<VitrineLocale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

export function LocaleSegment({
  locale,
  label,
  layout,
}: {
  locale: VitrineLocale;
  label: string;
  layout: "full" | "auto";
}) {
  const pathname = usePathname();
  const suffix = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const hrefFor = (code: VitrineLocale): string =>
    `${localePath(code)}${suffix === "/" ? "" : suffix}`;

  return (
    <nav
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 ${
        layout === "full" ? "flex w-full" : ""
      }`}
    >
      {VITRINE_LOCALES.map((code) =>
        code === locale ? (
          <span
            key={code}
            lang={code}
            aria-current="true"
            className={`inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-ink ${
              layout === "full" ? "flex-1" : ""
            }`}
          >
            {LOCALE_NAMES[code]}
          </span>
        ) : (
          <a
            key={code}
            href={hrefFor(code)}
            hrefLang={code}
            lang={code}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
              layout === "full" ? "flex-1" : ""
            }`}
          >
            {LOCALE_NAMES[code]}
          </a>
        ),
      )}
    </nav>
  );
}
