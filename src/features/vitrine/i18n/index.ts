import { arDict } from "./ar";
import { arMarketing } from "./arMarketing";
import { enDict } from "./en";
import { enMarketing } from "./enMarketing";
import { frDict } from "./fr";
import { frMarketing } from "./frMarketing";
import { DEFAULT_LOCALE, isVitrineLocale, type VitrineDict, type VitrineLocale } from "./dict";

const DICTS: Record<VitrineLocale, VitrineDict> = {
  fr: { ...frDict, ...frMarketing },
  ar: { ...arDict, ...arMarketing },
  en: { ...enDict, ...enMarketing },
};

export function getDict(locale: VitrineLocale): VitrineDict {
  return DICTS[locale];
}

/** Normalize an unknown locale value; fall back to French (primary). */
export function resolveLocale(value: unknown): VitrineLocale {
  if (isVitrineLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export { DEFAULT_LOCALE, isVitrineLocale };
export type { VitrineDict, VitrineLocale };
export type { ProductCopy } from "./dict";
