"use server";

import { revalidatePath } from "next/cache";
import { isProductType, type ProductType } from "@/domain/orders/productTypes";
import {
  deleteCatalogMedia,
  getCatalogAdminProduct,
  reorderCatalogMedia,
  setCatalogPrimaryImage,
  updateCatalogMediaAlt,
  updateCatalogProduct,
  uploadCatalogImage,
  upsertCatalogLocalization,
} from "@/features/catalog/service";
import { revalidateCatalog } from "@/features/catalog/cache";
import { createClient } from "@/lib/supabase/server";

export type CatalogFormState = {
  ok: boolean;
  error: { code: string; message: string };
  values?: Record<string, string>;
};

const FAILURE: CatalogFormState = {
  ok: false,
  error: { code: "UNKNOWN", message: "Catalog management is not configured yet." },
};

async function getServerClient() {
  try {
    return await createClient();
  } catch {
    return null;
  }
}

function parseListField(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function parseFaqField(raw: FormDataEntryValue | null): { q: string; a: string }[] {
  if (typeof raw !== "string") return [];
  const out: { q: string; a: string }[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const separator = trimmed.indexOf("||");
    if (separator <= 0) continue;
    const q = trimmed.slice(0, separator).trim();
    const a = trimmed.slice(separator + 2).trim();
    if (q === "" || a === "") continue;
    out.push({ q, a });
  }
  return out;
}

function refresh(productType: ProductType): void {
  revalidateCatalog();
  revalidatePath("/dashboard/catalog");
  revalidatePath(`/dashboard/catalog/${productType}`);
}

export async function updateCatalogProductAction(
  productType: string,
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!isProductType(productType)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const values: Record<string, string> = {
    published: String(formData.get("published") ?? ""),
    priceMad: String(formData.get("priceMad") ?? ""),
    availability: String(formData.get("availability") ?? ""),
  };
  const supabase = await getServerClient();
  if (!supabase) return { ...FAILURE, values };
  const result = await updateCatalogProduct(supabase, productType, {
    published: formData.get("published") === "on",
    priceMad:
      String(formData.get("priceMad") ?? "").trim() === ""
        ? null
        : String(formData.get("priceMad") ?? ""),
    availability:
      String(formData.get("availability") ?? "") === ""
        ? null
        : String(formData.get("availability") ?? ""),
  });
  if (!result.ok) return { ok: false, error: result.error, values };
  refresh(productType);
  return { ok: true, error: { code: "", message: "" }, values };
}

export async function updateCatalogLocalizationAction(
  productType: string,
  locale: string,
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!isProductType(productType)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const supabase = await getServerClient();
  if (!supabase) return FAILURE;
  const get = (key: string): string | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw.trim() === "") return null;
    return raw;
  };
  const result = await upsertCatalogLocalization(supabase, {
    productType,
    locale,
    displayName: get("displayName"),
    shortName: get("shortName"),
    heroTitle: get("heroTitle"),
    heroDescription: get("heroDescription"),
    shortDescription: get("shortDescription"),
    outcomeText: get("outcomeText"),
    pricingNote: get("pricingNote"),
    seoTitle: get("seoTitle"),
    seoDescription: get("seoDescription"),
    audiences: parseListField(formData.get("audiences")),
    benefits: parseListField(formData.get("benefits")),
    useCases: parseListField(formData.get("useCases")),
    included: parseListField(formData.get("included")),
    faqs: parseFaqField(formData.get("faqs")),
  });
  if (!result.ok) return { ok: false, error: result.error };
  refresh(productType);
  return { ok: true, error: { code: "", message: "" } };
}

export async function uploadCatalogImageAction(
  productType: string,
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!isProductType(productType)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const file = formData.get("image");
  const role = String(formData.get("role") ?? "GALLERY");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Choose an image to upload." },
    };
  }
  if (role !== "PRIMARY" && role !== "GALLERY" && role !== "CARD_PREVIEW" && role !== "OG") {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Choose a valid image role." },
    };
  }
  const supabase = await getServerClient();
  if (!supabase) return FAILURE;
  const buffer = new Uint8Array(await file.arrayBuffer());
  const result = await uploadCatalogImage(supabase, {
    productType,
    role,
    bytes: buffer,
    mimeType: file.type,
    altFr: null,
    altEn: null,
    altAr: null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  refresh(productType);
  return { ok: true, error: { code: "", message: "" } };
}

export async function updateCatalogMediaAltAction(
  productType: string,
  mediaId: string,
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  if (!isProductType(productType)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Product not found." } };
  }
  const supabase = await getServerClient();
  if (!supabase) return FAILURE;
  const get = (key: string): string | null => {
    const raw = formData.get(key);
    if (typeof raw !== "string" || raw.trim() === "") return null;
    return raw;
  };
  const result = await updateCatalogMediaAlt(supabase, {
    productType,
    mediaId,
    altFr: get("altFr"),
    altEn: get("altEn"),
    altAr: get("altAr"),
  });
  if (!result.ok) return { ok: false, error: result.error };
  refresh(productType);
  return { ok: true, error: { code: "", message: "" } };
}

export async function setCatalogPrimaryImageAction(
  productType: string,
  mediaId: string,
): Promise<void> {
  if (!isProductType(productType)) return;
  const supabase = await getServerClient();
  if (!supabase) return;
  await setCatalogPrimaryImage(supabase, { productType, mediaId });
  refresh(productType);
}

export async function setCatalogOgImageAction(productType: string, mediaId: string): Promise<void> {
  if (!isProductType(productType)) return;
  const supabase = await getServerClient();
  if (!supabase) return;
  const current = await getCatalogAdminProduct(supabase, productType);
  if (!current.ok) return;
  const media = current.data.media.find((item) => item.id === mediaId);
  if (!media) return;
  await supabase
    .from("catalog_products")
    .update({ og_image_path: media.storage_path })
    .eq("product_type", productType);
  refresh(productType);
}

export async function moveCatalogMediaAction(
  productType: string,
  mediaId: string,
  direction: "up" | "down",
): Promise<void> {
  if (!isProductType(productType)) return;
  const supabase = await getServerClient();
  if (!supabase) return;
  const current = await getCatalogAdminProduct(supabase, productType);
  if (!current.ok) return;
  const ordered = [...current.data.media].sort((a, b) => a.sort_order - b.sort_order);
  const index = ordered.findIndex((item) => item.id === mediaId);
  if (index < 0) return;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return;
  const next = [...ordered];
  const moving = next[index];
  next[index] = next[target];
  next[target] = moving;
  await reorderCatalogMedia(supabase, {
    productType,
    orderedIds: next.map((item) => item.id),
  });
  refresh(productType);
}

export async function deleteCatalogMediaAction(
  productType: string,
  mediaId: string,
): Promise<void> {
  if (!isProductType(productType)) return;
  const supabase = await getServerClient();
  if (!supabase) return;
  await deleteCatalogMedia(supabase, { productType, mediaId });
  refresh(productType);
}
