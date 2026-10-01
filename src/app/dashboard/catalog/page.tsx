import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCatalogAdmin } from "@/features/catalog/service";
import { catalogPriceDisplay } from "@/features/catalog/price";
import { formatMinorToMad } from "@/domain/orders/money";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { ErrorState } from "@/components/ui/states";

export const metadata = { title: "Catalog — Karti Dashboard" };

function statusBadge(published: boolean) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
        published ? "bg-success-muted text-success" : "bg-surface-muted text-muted"
      }`}
    >
      {published ? "Published" : "Hidden"}
    </span>
  );
}

export default async function CatalogListPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Catalog"
          subtitle="Commercial presentation of the 8 canonical products."
        />
        <ErrorState description="Catalog management is not configured yet." />
      </div>
    );
  }
  const result = await listCatalogAdmin(supabase);
  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Catalog"
          subtitle="Commercial presentation of the 8 canonical products."
        />
        <ErrorState description={result.error.message} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard">Dashboard</BackLink>
      <PageHeader
        title="Catalog"
        subtitle="Prices, images, localized content, visibility, and SEO for the 8 canonical Karti products. Technical behavior stays in code."
      />
      <Section
        title="Products"
        description="Exactly 8 canonical products. Creation and deletion are not available."
      >
        <ul className="flex flex-col gap-3">
          {result.data.map((product) => {
            const price =
              product.pricing_mode === "QUOTE"
                ? "Quote"
                : (catalogPriceDisplay({
                    pricingMode: product.pricing_mode,
                    priceMinor: product.price_minor,
                  }) ?? formatMinorToMad(product.price_minor));
            return (
              <li
                key={product.product_type}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    {product.localizations.find((loc) => loc.locale === "fr")?.display_name ??
                      product.product_type}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted">{product.product_type}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {statusBadge(product.published)}
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium">
                      {product.pricing_mode}
                    </span>
                    <span className="font-semibold text-text">{price}</span>
                    <span>{product.primary_image_path ? "Image ✓" : "No image"}</span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/catalog/${product.product_type}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-text hover:bg-surface-muted"
                >
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
