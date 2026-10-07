import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import type { Database } from "@/types/database";

export type CatalogDb = SupabaseClient<Database>;

export type CatalogAvailability = "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER";

export type CatalogProductRow = {
  product_type: ProductType;
  published: boolean;
  /** Fixed base price in minor units, or null while "Price not configured". */
  price_minor: number | null;
  currency: string;
  availability: CatalogAvailability | null;
  primary_image_path: string | null;
  og_image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogFaqItem = { q: string; a: string };

export type CatalogLocalizationRow = {
  product_type: ProductType;
  locale: VitrineLocale;
  display_name: string | null;
  short_name: string | null;
  hero_title: string | null;
  hero_description: string | null;
  short_description: string | null;
  outcome_text: string | null;
  pricing_note: string | null;
  seo_title: string | null;
  seo_description: string | null;
  audiences: string[];
  benefits: string[];
  use_cases: string[];
  included: string[];
  faqs: CatalogFaqItem[];
  updated_at: string;
};

export type CatalogMediaRow = {
  id: string;
  product_type: ProductType;
  storage_path: string;
  media_role: "PRIMARY" | "GALLERY" | "CARD_PREVIEW" | "OG";
  sort_order: number;
  alt_fr: string | null;
  alt_en: string | null;
  alt_ar: string | null;
  created_at: string;
};

export type CatalogAdminProduct = CatalogProductRow & {
  localizations: CatalogLocalizationRow[];
  media: CatalogMediaRow[];
};

export type CatalogErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "UNKNOWN";

export type CatalogResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: CatalogErrorCode; message: string } };
