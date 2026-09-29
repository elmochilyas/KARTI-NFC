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
  const stack: unknown[] = [element];
  while (stack.length > 0) {
    const node = stack.pop() as {
      type?: unknown;
      props?: Record<string, unknown> & { children?: unknown };
    } | null;
    if (!node || typeof node !== "object") continue;
    if (node.type === ProductPage && node.props) return node.props;
    const children = node.props?.children;
    if (Array.isArray(children)) stack.push(...children);
    else if (children !== undefined && children !== null) stack.push(children);
  }
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
