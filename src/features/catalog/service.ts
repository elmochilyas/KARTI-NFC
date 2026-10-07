import { isProductType, PRODUCT_TYPES, type ProductType } from "@/domain/orders/productTypes";
import { parseMadDecimalToMinor } from "@/domain/orders/money";
import { detectImageKind } from "@/features/profiles/storagePaths";
import {
  availabilityField,
  catalogLocalizationSchema,
  catalogMediaAltSchema,
  catalogMediaReorderSchema,
  catalogMediaRoleField,
  catalogProductUpdateSchema,
  productTypeField,
} from "./schema";
import { catalogAssetPath, isManagedCatalogPath } from "./storagePaths";
import { optimizeCatalogImage } from "./optimize";
import type {
  CatalogAdminProduct,
  CatalogAvailability,
  CatalogDb,
  CatalogFaqItem,
  CatalogLocalizationRow,
  CatalogMediaRow,
  CatalogProductRow,
  CatalogResult,
} from "./types";
import type { VitrineLocale } from "@/features/vitrine/i18n/dict";
import { CATALOG_ASSETS_BUCKET } from "./storagePaths";

async function requireAdmin(supabase: CatalogDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED: CatalogResult<never> = {
  ok: false,
  error: { code: "UNAUTHORIZED", message: "Sign in to manage the catalog." },
};

function unknownError(): CatalogResult<never> {
  return {
    ok: false,
    error: { code: "UNKNOWN", message: "Could not load the catalog. Please try again." },
  };
}

function validationError(message: string): CatalogResult<never> {
  return { ok: false, error: { code: "VALIDATION_ERROR", message } };
}

function toAvailability(value: string | null): CatalogAvailability | null {
  return value === "IN_STOCK" || value === "OUT_OF_STOCK" || value === "PREORDER" ? value : null;
}

function toProductRow(row: {
  product_type: string;
  published: boolean;
  price_minor: number | null;
  currency: string;
  availability: string | null;
  primary_image_path: string | null;
  og_image_path: string | null;
  created_at: string;
  updated_at: string;
}): CatalogProductRow | null {
  if (!isProductType(row.product_type)) return null;
  return {
    product_type: row.product_type,
    published: row.published,
    price_minor: row.price_minor,
    currency: row.currency,
    availability: toAvailability(row.availability),
    primary_image_path: row.primary_image_path,
    og_image_path: row.og_image_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toStringList(value: unknown, maxItemLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed === "" || trimmed.length > maxItemLength || /[<>]/.test(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function toFaqList(value: unknown): CatalogFaqItem[] {
  if (!Array.isArray(value)) return [];
  const out: CatalogFaqItem[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.q !== "string" || typeof record.a !== "string") continue;
    const q = record.q.trim();
    const a = record.a.trim();
    if (q === "" || a === "" || q.length > 160 || a.length > 1000) continue;
    if (/[<>]/.test(q) || /[<>]/.test(a)) continue;
    out.push({ q, a });
    if (out.length >= 20) break;
  }
  return out;
}

function isLocale(value: string): value is VitrineLocale {
  return value === "fr" || value === "en" || value === "ar";
}

function toLocalizationRow(row: {
  product_type: string;
  locale: string;
  display_name: string | null;
  short_name: string | null;
  hero_title: string | null;
  hero_description: string | null;
  short_description: string | null;
  outcome_text: string | null;
  pricing_note: string | null;
  seo_title: string | null;
  seo_description: string | null;
  audiences: unknown;
  benefits: unknown;
  use_cases: unknown;
  included: unknown;
  faqs: unknown;
  updated_at: string;
}): CatalogLocalizationRow | null {
  if (!isProductType(row.product_type) || !isLocale(row.locale)) return null;
  return {
    product_type: row.product_type,
    locale: row.locale,
    display_name: row.display_name,
    short_name: row.short_name,
    hero_title: row.hero_title,
    hero_description: row.hero_description,
    short_description: row.short_description,
    outcome_text: row.outcome_text,
    pricing_note: row.pricing_note,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    audiences: toStringList(row.audiences, 120, 12),
    benefits: toStringList(row.benefits, 200, 12),
    use_cases: toStringList(row.use_cases, 200, 12),
    included: toStringList(row.included, 200, 20),
    faqs: toFaqList(row.faqs),
    updated_at: row.updated_at,
  };
}

function toMediaRow(row: {
  id: string;
  product_type: string;
  storage_path: string;
  media_role: string;
  sort_order: number;
  alt_fr: string | null;
  alt_en: string | null;
  alt_ar: string | null;
  created_at: string;
}): CatalogMediaRow | null {
  if (!isProductType(row.product_type)) return null;
  if (
    row.media_role !== "PRIMARY" &&
    row.media_role !== "GALLERY" &&
    row.media_role !== "CARD_PREVIEW" &&
    row.media_role !== "OG"
  ) {
    return null;
  }
  return {
    id: row.id,
    product_type: row.product_type,
    storage_path: row.storage_path,
    media_role: row.media_role,
    sort_order: row.sort_order,
    alt_fr: row.alt_fr,
    alt_en: row.alt_en,
    alt_ar: row.alt_ar,
    created_at: row.created_at,
  };
}

/** List all 8 canonical products with localizations + media (admin). */
export async function listCatalogAdmin(
  supabase: CatalogDb,
): Promise<CatalogResult<CatalogAdminProduct[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const productsRes = await supabase
    .from("catalog_products")
    .select(
      "product_type,published,price_minor,currency,availability,primary_image_path,og_image_path,created_at,updated_at",
    )
    .order("product_type");
  if (productsRes.error) return unknownError();
  const locRes = await supabase
    .from("catalog_product_localizations")
    .select(
      "product_type,locale,display_name,short_name,hero_title,hero_description,short_description,outcome_text,pricing_note,seo_title,seo_description,audiences,benefits,use_cases,included,faqs,updated_at",
    );
  if (locRes.error) return unknownError();
  const mediaRes = await supabase
    .from("catalog_product_media")
    .select("id,product_type,storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar,created_at")
    .order("sort_order");
  if (mediaRes.error) return unknownError();

  const products: CatalogAdminProduct[] = [];
  for (const raw of productsRes.data ?? []) {
    const product = toProductRow(raw);
    if (!product) continue;
    const localizations: CatalogLocalizationRow[] = [];
    for (const rawLoc of locRes.data ?? []) {
      if (rawLoc.product_type !== product.product_type) continue;
      const loc = toLocalizationRow(rawLoc);
      if (loc) localizations.push(loc);
    }
    const media: CatalogMediaRow[] = [];
    for (const rawMedia of mediaRes.data ?? []) {
      if (rawMedia.product_type !== product.product_type) continue;
      const item = toMediaRow(rawMedia);
      if (item) media.push(item);
    }
    products.push({ ...product, localizations, media });
  }
  // Canonical order (PRODUCT_TYPES), not alphabetical.
  products.sort(
    (a, b) => PRODUCT_TYPES.indexOf(a.product_type) - PRODUCT_TYPES.indexOf(b.product_type),
  );
  return { ok: true, data: products };
}

/** Single product with localizations + media (admin). ProductType is immutable. */
export async function getCatalogAdminProduct(
  supabase: CatalogDb,
  productType: ProductType,
): Promise<CatalogResult<CatalogAdminProduct>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  if (productTypeField.safeParse(productType).success === false) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const productRes = await supabase
    .from("catalog_products")
    .select(
      "product_type,published,price_minor,currency,availability,primary_image_path,og_image_path,created_at,updated_at",
    )
    .eq("product_type", productType)
    .maybeSingle();
  if (productRes.error) return unknownError();
  if (!productRes.data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const product = toProductRow(productRes.data);
  if (!product) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const locRes = await supabase
    .from("catalog_product_localizations")
    .select(
      "product_type,locale,display_name,short_name,hero_title,hero_description,short_description,outcome_text,pricing_note,seo_title,seo_description,audiences,benefits,use_cases,included,faqs,updated_at",
    )
    .eq("product_type", productType);
  const mediaRes = await supabase
    .from("catalog_product_media")
    .select("id,product_type,storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar,created_at")
    .eq("product_type", productType)
    .order("sort_order");
  if (locRes.error || mediaRes.error) return unknownError();
  const localizations: CatalogLocalizationRow[] = [];
  for (const rawLoc of locRes.data ?? []) {
    const loc = toLocalizationRow(rawLoc);
    if (loc) localizations.push(loc);
  }
  const media: CatalogMediaRow[] = [];
  for (const rawMedia of mediaRes.data ?? []) {
    const item = toMediaRow(rawMedia);
    if (item) media.push(item);
  }
  return { ok: true, data: { ...product, localizations, media } };
}

/**
 * Update commercial fields only. Technical behavior (ProductType,
 * requiresProfile, destination, provisioning) has no DB representation and
 * cannot be changed here by construction.
 */
export async function updateCatalogProduct(
  supabase: CatalogDb,
  productType: ProductType,
  rawInput: unknown,
): Promise<CatalogResult<CatalogProductRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const parsed = catalogProductUpdateSchema.safeParse(rawInput);
  if (!parsed.success) return validationError("Check the entered values and try again.");
  const input = parsed.data;

  // Empty price = "Price not configured" (readiness state). Otherwise the
  // decimal MAD string must parse to a positive minor-unit amount within
  // a sensible bound (string/integer math only, never float).
  let priceMinor: number | null = null;
  const priceRaw = input.priceMad?.trim() ?? "";
  if (priceRaw !== "") {
    const converted = parseMadDecimalToMinor(priceRaw);
    if (converted === null || converted <= 0 || converted > 99_999_999) {
      return validationError("Enter a valid price greater than zero (max 999999.99 MAD).");
    }
    priceMinor = converted;
  }

  const availabilityParsed = availabilityField.safeParse(input.availability);
  const availability = availabilityParsed.success ? availabilityParsed.data : null;

  const updateRes = await supabase
    .from("catalog_products")
    .update({
      published: input.published,
      price_minor: priceMinor,
      availability,
    })
    .eq("product_type", productType)
    .select(
      "product_type,published,price_minor,currency,availability,primary_image_path,og_image_path,created_at,updated_at",
    )
    .maybeSingle();
  if (updateRes.error) return unknownError();
  if (!updateRes.data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const product = toProductRow(updateRes.data);
  if (!product) return unknownError();
  return { ok: true, data: product };
}

/** Upsert one locale's commercial copy (validated, bounded, no HTML). */
export async function upsertCatalogLocalization(
  supabase: CatalogDb,
  rawInput: unknown,
): Promise<CatalogResult<CatalogLocalizationRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const parsed = catalogLocalizationSchema.safeParse(rawInput);
  if (!parsed.success) return validationError("Check the entered values and try again.");
  const input = parsed.data;

  const upsertRes = await supabase
    .from("catalog_product_localizations")
    .upsert(
      {
        product_type: input.productType,
        locale: input.locale,
        display_name: input.displayName,
        short_name: input.shortName,
        hero_title: input.heroTitle,
        hero_description: input.heroDescription,
        short_description: input.shortDescription,
        outcome_text: input.outcomeText,
        pricing_note: input.pricingNote,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
        audiences: input.audiences,
        benefits: input.benefits,
        use_cases: input.useCases,
        included: input.included,
        faqs: input.faqs,
      },
      { onConflict: "product_type,locale" },
    )
    .select(
      "product_type,locale,display_name,short_name,hero_title,hero_description,short_description,outcome_text,pricing_note,seo_title,seo_description,audiences,benefits,use_cases,included,faqs,updated_at",
    )
    .maybeSingle();
  if (upsertRes.error) return unknownError();
  if (!upsertRes.data) return unknownError();
  const row = toLocalizationRow(upsertRes.data);
  if (!row) return unknownError();
  return { ok: true, data: row };
}

const MAX_CATALOG_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_UPLOAD_MIME = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/**
 * Admin-only catalog image upload. Validates MIME + magic bytes + size,
 * normalizes through the 4:3 WebP optimization pipeline, writes the
 * optimized asset to a server-generated versioned path, and records the
 * media row. Never accepts SVG, never stores caller paths, never serves
 * the raw multi-megabyte original.
 */
export async function uploadCatalogImage(
  supabase: CatalogDb,
  args: {
    productType: ProductType;
    role: "PRIMARY" | "GALLERY" | "CARD_PREVIEW" | "OG";
    bytes: Uint8Array;
    mimeType: string;
    altFr?: string | null;
    altEn?: string | null;
    altAr?: string | null;
  },
): Promise<CatalogResult<CatalogMediaRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  if (!isProductType(args.productType)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  if (catalogMediaRoleField.safeParse(args.role).success === false) {
    return validationError("Check the entered values and try again.");
  }
  const extension = ALLOWED_UPLOAD_MIME.get(args.mimeType);
  if (!extension) return validationError("Unsupported format. Use JPEG, PNG or WebP.");
  if (args.bytes.length === 0 || args.bytes.length > MAX_CATALOG_UPLOAD_BYTES) {
    return validationError("Image must be non-empty and at most 5 MB.");
  }
  // Magic-byte gate: the declared MIME is never trusted on its own.
  // The detected kind must equal the declared extension (forged MIME rejected).
  const detected = detectImageKind(args.bytes.slice(0, 16));
  if (detected === null || detected === undefined || detected !== extension) {
    return validationError("File is not a valid image.");
  }
  const altParsed = catalogMediaAltSchema.safeParse({
    altFr: args.altFr ?? null,
    altEn: args.altEn ?? null,
    altAr: args.altAr ?? null,
  });
  if (!altParsed.success) return validationError("Check the entered values and try again.");

  // Web optimization: 4:3 center-crop, max 1600x1200 WebP, metadata
  // stripped. Nothing is stored when processing fails — no partial
  // DB/storage state, the current primary image is untouched.
  const optimized = await optimizeCatalogImage(args.bytes, args.role);
  if (!optimized.ok) return validationError(optimized.message);

  const path = catalogAssetPath(args.productType, args.role, "webp");
  const uploadRes = await supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .upload(path, optimized.bytes, {
      contentType: optimized.contentType,
      // Versioned paths are immutable: a replacement always mints a new
      // path, so edge caches can hold the asset long-term.
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadRes.error) return unknownError();

  // Next sort position within this product+role.
  const existingRes = await supabase
    .from("catalog_product_media")
    .select("sort_order")
    .eq("product_type", args.productType)
    .eq("media_role", args.role)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder =
    !existingRes.error && existingRes.data && existingRes.data.length > 0
      ? (existingRes.data[0].sort_order ?? -1) + 1
      : 0;

  const insertRes = await supabase
    .from("catalog_product_media")
    .insert({
      product_type: args.productType,
      storage_path: path,
      media_role: args.role,
      sort_order: nextOrder,
      alt_fr: altParsed.data.altFr,
      alt_en: altParsed.data.altEn,
      alt_ar: altParsed.data.altAr,
    })
    .select("id,product_type,storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar,created_at")
    .maybeSingle();
  if (insertRes.error) {
    await supabase.storage.from(CATALOG_ASSETS_BUCKET).remove([path]);
    return unknownError();
  }
  if (!insertRes.data) return unknownError();
  const row = toMediaRow(insertRes.data);
  if (!row) return unknownError();

  // PRIMARY uploads also become the product's primary image path.
  if (args.role === "PRIMARY") {
    await supabase
      .from("catalog_products")
      .update({ primary_image_path: path })
      .eq("product_type", args.productType);
  }
  if (args.role === "OG") {
    await supabase
      .from("catalog_products")
      .update({ og_image_path: path })
      .eq("product_type", args.productType);
  }
  return { ok: true, data: row };
}

/** Update localized alt text on one media row (ownership-checked). */
export async function updateCatalogMediaAlt(
  supabase: CatalogDb,
  args: {
    productType: ProductType;
    mediaId: string;
    altFr: unknown;
    altEn: unknown;
    altAr: unknown;
  },
): Promise<CatalogResult<CatalogMediaRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const altParsed = catalogMediaAltSchema.safeParse({
    altFr: args.altFr ?? null,
    altEn: args.altEn ?? null,
    altAr: args.altAr ?? null,
  });
  if (!altParsed.success) return validationError("Check the entered values and try again.");
  const updateRes = await supabase
    .from("catalog_product_media")
    .update({
      alt_fr: altParsed.data.altFr,
      alt_en: altParsed.data.altEn,
      alt_ar: altParsed.data.altAr,
    })
    .eq("id", args.mediaId)
    .eq("product_type", args.productType)
    .select("id,product_type,storage_path,media_role,sort_order,alt_fr,alt_en,alt_ar,created_at")
    .maybeSingle();
  if (updateRes.error) return unknownError();
  if (!updateRes.data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Image not found." } };
  }
  const row = toMediaRow(updateRes.data);
  if (!row) return unknownError();
  return { ok: true, data: row };
}

/** Replace the product's primary image pointer with one of its media rows. */
export async function setCatalogPrimaryImage(
  supabase: CatalogDb,
  args: { productType: ProductType; mediaId: string },
): Promise<CatalogResult<CatalogProductRow>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const mediaRes = await supabase
    .from("catalog_product_media")
    .select("id,product_type,storage_path,media_role")
    .eq("id", args.mediaId)
    .eq("product_type", args.productType)
    .maybeSingle();
  if (mediaRes.error) return unknownError();
  if (!mediaRes.data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Image not found." } };
  }
  const updateRes = await supabase
    .from("catalog_products")
    .update({ primary_image_path: mediaRes.data.storage_path })
    .eq("product_type", args.productType)
    .select(
      "product_type,published,price_minor,currency,availability,primary_image_path,og_image_path,created_at,updated_at",
    )
    .maybeSingle();
  if (updateRes.error || !updateRes.data) return unknownError();
  const product = toProductRow(updateRes.data);
  if (!product) return unknownError();
  return { ok: true, data: product };
}

/**
 * Reorder a product's media (exact-set validation: the submitted id list
 * must equal the product's current media set — same discipline as ADR-016).
 */
export async function reorderCatalogMedia(
  supabase: CatalogDb,
  rawInput: unknown,
): Promise<CatalogResult<{ ordered: number }>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const parsed = catalogMediaReorderSchema.safeParse(rawInput);
  if (!parsed.success) return validationError("Check the entered values and try again.");
  const currentRes = await supabase
    .from("catalog_product_media")
    .select("id")
    .eq("product_type", parsed.data.productType);
  if (currentRes.error) return unknownError();
  const currentIds = new Set((currentRes.data ?? []).map((row) => row.id));
  if (currentIds.size !== parsed.data.orderedIds.length) {
    return validationError("Image list does not match the saved set.");
  }
  for (const id of parsed.data.orderedIds) {
    if (!currentIds.has(id)) return validationError("Image list does not match the saved set.");
  }
  const updates = parsed.data.orderedIds.map((id, index) =>
    supabase.from("catalog_product_media").update({ sort_order: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  if (results.some((result) => result.error)) return unknownError();
  return { ok: true, data: { ordered: parsed.data.orderedIds.length } };
}

/** Remove one media row + its storage object (managed-path gate). */
export async function deleteCatalogMedia(
  supabase: CatalogDb,
  args: { productType: ProductType; mediaId: string },
): Promise<CatalogResult<{ removed: boolean }>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const mediaRes = await supabase
    .from("catalog_product_media")
    .select("id,product_type,storage_path")
    .eq("id", args.mediaId)
    .eq("product_type", args.productType)
    .maybeSingle();
  if (mediaRes.error) return unknownError();
  if (!mediaRes.data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Image not found." } };
  }
  const storagePath: string = mediaRes.data.storage_path;
  if (!isManagedCatalogPath(storagePath)) {
    return validationError("Refusing to delete a non-catalog path.");
  }
  const deleteRes = await supabase
    .from("catalog_product_media")
    .delete()
    .eq("id", args.mediaId)
    .eq("product_type", args.productType);
  if (deleteRes.error) return unknownError();
  await supabase.storage.from(CATALOG_ASSETS_BUCKET).remove([storagePath]);
  // Clear dangling pointers (best-effort, never fails the delete).
  await supabase
    .from("catalog_products")
    .update({ primary_image_path: null })
    .eq("product_type", args.productType)
    .eq("primary_image_path", storagePath);
  await supabase
    .from("catalog_products")
    .update({ og_image_path: null })
    .eq("product_type", args.productType)
    .eq("og_image_path", storagePath);
  return { ok: true, data: { removed: true } };
}
