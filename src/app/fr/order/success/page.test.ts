import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/vitrine/order/receiptLookup", () => ({
  getPublicReceipt: vi.fn(),
}));
vi.mock("@/lib/env-server", () => ({ getSalesWhatsapp: () => null }));

import { getPublicReceipt } from "@/features/vitrine/order/receiptLookup";
import { OrderSuccess } from "@/features/vitrine/order/OrderSuccess";
import { getDict } from "@/features/vitrine/i18n";
import FrOrderSuccessPage, { generateMetadata } from "./page";

/** Collect rendered text from a React element tree (no JSON pitfalls). */
function collectText(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return out;
  }
  if (node !== null && typeof node === "object" && "props" in node) {
    const props = (node as { props?: unknown }).props;
    if (props !== null && typeof props === "object" && "children" in props) {
      collectText((props as { children?: unknown }).children, out);
    }
  }
  return out;
}

describe("generateMetadata /fr/order/success", () => {
  it("is fully noindex", async () => {
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe("FrOrderSuccessPage", () => {
  it("forwards order number and token, never internals", async () => {
    const element = (await FrOrderSuccessPage({
      searchParams: Promise.resolve({ r: "KARTI-000124", t: "a".repeat(64) }),
    })) as { props: Record<string, unknown> };
    expect(element.props).toMatchObject({
      locale: "fr",
      orderNumber: "KARTI-000124",
      token: "a".repeat(64),
    });
    expect(Object.keys(element.props).sort()).toEqual(
      ["dict", "locale", "orderNumber", "token"].sort(),
    );
  });
});

describe("OrderSuccess receipt boundaries", () => {
  it("renders the safe receipt for valid tokens", async () => {
    vi.mocked(getPublicReceipt).mockResolvedValue({
      orderNumber: "KARTI-000124",
      productType: "GOOGLE_REVIEW_CARD",
      productSlug: "google-review-card",
      quantity: 2,
    });
    const element = await OrderSuccess({
      locale: "fr",
      dict: getDict("fr"),
      orderNumber: "KARTI-000124",
      token: "a".repeat(64),
    });
    expect(vi.mocked(getPublicReceipt)).toHaveBeenCalledWith("KARTI-000124", "a".repeat(64));
    const text = collectText(element).join(" ");
    expect(text).toContain("KARTI-000124");
    expect(text).toContain("Carte Avis Google");
    expect(text).not.toContain("receipt_token_hash");
    expect(text).not.toContain("internal_notes");
  });

  it("shows the generic message for invalid tokens without leaking", async () => {
    vi.mocked(getPublicReceipt).mockResolvedValue(null);
    const element = await OrderSuccess({
      locale: "fr",
      dict: getDict("fr"),
      orderNumber: "KARTI-000001",
      token: "b".repeat(64),
    });
    const text = collectText(element).join(" ");
    expect(text).not.toContain("KARTI-000001");
    expect(text).toContain(getDict("fr").success.invalidTitle);
  });
});
