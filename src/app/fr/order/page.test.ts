import { describe, expect, it, vi } from "vitest";
import { OrderWizard } from "@/features/vitrine/order/OrderWizard";

vi.mock("@/features/vitrine/order/OrderWizard", () => ({ OrderWizard: vi.fn() }));

import FrOrderPage, { generateMetadata } from "./page";

function wizardProps(element: unknown) {
  const el = element as { type?: unknown; props?: { initialProduct?: unknown } };
  if (el?.type !== OrderWizard || !el.props) throw new Error("OrderWizard not rendered");
  return el.props;
}

describe("generateMetadata /fr/order", () => {
  it("is noindex (follow) for checkout", async () => {
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("FrOrderPage", () => {
  it("preselects valid products from the query", async () => {
    const element = await FrOrderPage({
      searchParams: Promise.resolve({ product: "instagram-card" }),
    });
    expect(wizardProps(element)).toMatchObject({ initialProduct: "INSTAGRAM_CARD" });
  });

  it("falls back to the selector on invalid products", async () => {
    const element = await FrOrderPage({ searchParams: Promise.resolve({ product: "nope" }) });
    expect(wizardProps(element)).toMatchObject({ initialProduct: null });
  });

  it("falls back to the selector without a product query", async () => {
    const element = await FrOrderPage({ searchParams: Promise.resolve({}) });
    expect(wizardProps(element)).toMatchObject({ initialProduct: null });
  });
});
