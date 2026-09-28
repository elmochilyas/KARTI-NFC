import { describe, expect, it, vi } from "vitest";
import { ProductPage } from "@/features/vitrine/ProductPage";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import FrProductPage, { generateMetadata } from "./page";

const props = (productSlug: string) => ({ params: Promise.resolve({ productSlug }) });

function findProductPage(element: unknown) {
  const root = element as { props: Record<string, unknown> };
  if ((root as { type?: unknown }).type === ProductPage) return root.props;
  throw new Error("ProductPage not found in page output");
}

describe("generateMetadata /fr/products/[productSlug]", () => {
  it("exposes canonical title and description for valid slugs", async () => {
    const meta = await generateMetadata(props("whatsapp-card"));
    expect(meta.title).toContain("WhatsApp");
    expect(meta.alternates?.canonical).toContain("/fr/products/whatsapp-card");
  });

  it("noindexes invalid slugs without leaking", async () => {
    const meta = await generateMetadata(props("nope"));
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(meta)).not.toContain("nope");
  });
});

describe("FrProductPage", () => {
  it("renders the product page for valid slugs", async () => {
    const element = await FrProductPage(props("personal-card"));
    expect(findProductPage(element)).toMatchObject({ locale: "fr", slug: "personal-card" });
  });

  it("notFounds invalid slugs", async () => {
    await expect(FrProductPage(props("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
