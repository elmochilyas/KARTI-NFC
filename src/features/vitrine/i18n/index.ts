import { arDict } from "./ar";
import { enDict } from "./en";
import { frDict } from "./fr";
import { DEFAULT_LOCALE, isVitrineLocale, type VitrineDict, type VitrineLocale } from "./dict";

const DICTS: Record<VitrineLocale, VitrineDict> = {
  fr: frDict,
  ar: arDict,
  en: enDict,
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
