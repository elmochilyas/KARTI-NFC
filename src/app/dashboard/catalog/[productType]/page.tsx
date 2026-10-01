import Link from "next/link";
import { notFound } from "next/navigation";
import { isProductType } from "@/domain/orders/productTypes";
import { formatMinorToMad } from "@/domain/orders/money";
import { getCatalogAdminProduct } from "@/features/catalog/service";
import { LocalizationForm } from "@/features/catalog/components/LocalizationForm";
import { MediaManager } from "@/features/catalog/components/MediaManager";
import { PricingForm } from "@/features/catalog/components/PricingForm";
import { productSlugFromType } from "@/features/vitrine/products";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { ErrorState } from "@/components/ui/states";
import {
  deleteCatalogMediaAction,
  moveCatalogMediaAction,
  setCatalogOgImageAction,
  setCatalogPrimaryImageAction,
  updateCatalogLocalizationAction,
  updateCatalogMediaAltAction,
  updateCatalogProductAction,
  uploadCatalogImageAction,
} from "../actions";

export const metadata = { title: "Edit product — Karti Dashboard" };

const LOCALES = ["fr", "en", "ar"] as const;

export default async function CatalogEditorPage({
  params,
}: {
  params: Promise<{ productType: string }>;
}) {
  const { productType } = await params;
  if (!isProductType(productType)) notFound();

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={productType} subtitle="Catalog product editor." />
        <ErrorState description="Catalog management is not configured yet." />
      </div>
    );
  }
  const result = await getCatalogAdminProduct(supabase, productType);
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") notFound();
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={productType} subtitle="Catalog product editor." />
        <ErrorState description={result.error.message} />
      </div>
    );
  }
  const product = result.data;
  const slug = productSlugFromType(product.product_type);
  const locFor = (locale: string) =>
    product.localizations.find((loc) => loc.locale === locale) ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BackLink href="/dashboard/catalog">Catalog</BackLink>
      <PageHeader
        title={productType}
        subtitle={`Commercial presentation. Last updated ${new Date(product.updated_at).toLocaleString()}.`}
        actions={
          <Link
            href={`/fr/products/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-text hover:bg-surface-muted"
          >
            Preview public page
          </Link>
        }
      />

      <Section
        title="General + pricing"
        description="Visibility, pricing mode, and price. Technical behavior (profile rules, destinations) stays in code and cannot be changed here."
      >
        <PricingForm
          action={updateCatalogProductAction.bind(null, product.product_type)}
          initialValues={{
            published: product.published,
            pricingMode: product.pricing_mode,
            priceMad: product.price_minor !== null ? (product.price_minor / 100).toFixed(2) : "",
            availability: product.availability ?? "",
          }}
        />
        <p className="mt-3 text-sm text-muted">
          Stored:{" "}
          {product.price_minor !== null
            ? formatMinorToMad(product.price_minor)
            : "no price (QUOTE)"}
        </p>
      </Section>

      <Section
        title="Media"
        description="Primary image, gallery order, and localized alt text. JPEG, PNG, or WebP up to 5 MB."
      >
        <MediaManager
          uploadAction={uploadCatalogImageAction.bind(null, product.product_type)}
          altActionFor={(mediaId) =>
            updateCatalogMediaAltAction.bind(null, product.product_type, mediaId)
          }
          setPrimaryAction={setCatalogPrimaryImageAction.bind(null, product.product_type)}
          setOgAction={setCatalogOgImageAction.bind(null, product.product_type)}
          moveAction={(mediaId, direction) =>
            moveCatalogMediaAction(product.product_type, mediaId, direction)
          }
          deleteAction={deleteCatalogMediaAction.bind(null, product.product_type)}
          media={product.media}
          primaryImagePath={product.primary_image_path}
          ogImagePath={product.og_image_path}
        />
      </Section>

      {LOCALES.map((locale) => (
        <Section
          key={locale}
          title={`Content — ${locale.toUpperCase()}`}
          description="Public names, descriptions, sections, FAQs, and SEO overrides."
        >
          <LocalizationForm
            locale={locale}
            row={locFor(locale)}
            action={updateCatalogLocalizationAction.bind(null, product.product_type, locale)}
          />
        </Section>
      ))}
    </div>
  );
}
