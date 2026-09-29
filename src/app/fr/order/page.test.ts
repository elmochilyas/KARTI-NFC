import { describe, expect, it, vi } from "vitest";
import { OrderPageView } from "@/features/vitrine/order/OrderPageView";

vi.mock("@/features/vitrine/order/OrderWizard", () => ({ OrderWizard: vi.fn() }));

import FrOrderPage, { generateMetadata } from "./page";

function wizardProps(element: unknown) {
  const stack: unknown[] = [element];
  while (stack.length > 0) {
    const node = stack.pop() as {
      type?: unknown;
      props?: { initialProduct?: unknown; children?: unknown };
    } | null;
    if (!node || typeof node !== "object") continue;
    // The page renders the shared shell, which forwards initialProduct
    // to the wizard; assert the same query → product wiring one level up.
    if (node.type === OrderPageView && node.props) return node.props;
    const children = node.props?.children;
    if (Array.isArray(children)) stack.push(...children);
    else if (children !== undefined && children !== null) stack.push(children);
  }
  throw new Error("OrderPageView not rendered");
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
