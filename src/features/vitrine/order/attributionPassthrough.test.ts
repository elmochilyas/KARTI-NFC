/**
 * Attribution end-to-end regression (Phase 5): first/last touch captured
 * on the public site must survive into the order RPC columns exactly —
 * Google referrer, social UTMs, TikTok, direct, and internal navigation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase/orderWriter", () => ({
  createOrderWriterClient: () => ({ rpc: rpcMock }),
}));

import { cookies } from "next/headers";
import { ATTRIBUTION_COOKIE } from "../attribution";
import { orderRateLimiter } from "../antispam";
import { createPublicOrderAction } from "./actions";

process.env.RECEIPT_TOKEN_SECRET = "test-receipt-secret-32-chars-minimum";

const BASE_ORDER = {
  locale: "fr",
  productType: "GOOGLE_REVIEW_CARD",
  quantity: 1,
  configuration: { businessName: "Café X", reviewUrl: "https://g.page/cafe-x/review", needsUrlHelp: false },
  customer: {
    fullName: "Younes Barrag",
    phone: "0612345678",
    whatsapp: "0612345678",
    email: "",
    preferredContact: "WHATSAPP",
  },
  delivery: { city: "Casablanca", address: "12 rue Test", instructions: "" },
  idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
  website: "",
  startedAt: Date.now() - 60_000,
};

function cookieStore(value: string | null) {
  vi.mocked(cookies).mockResolvedValueOnce({
    get: (name: string) => (name === ATTRIBUTION_COOKIE && value !== null ? { value } : undefined),
  } as never);
}

function snapshot(first: Record<string, string | null>, last: Record<string, string | null> | null) {
  const touch = (fields: Record<string, string | null>) => ({
    path: null,
    referrerHost: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    ...fields,
  });
  return JSON.stringify({ first: touch(first), last: last ? touch(last) : null });
}

beforeEach(() => {
  rpcMock.mockReset();
  orderRateLimiter.clear();
  rpcMock.mockResolvedValue({ data: [{ order_number: "KARTI-000010", created: true }], error: null });
});

function rpcArgs(): Record<string, unknown> {
  return rpcMock.mock.calls[0][1] as Record<string, unknown>;
}

describe("attribution survives into orders", () => {
  it("keeps a Google first touch through internal navigation", async () => {
    cookieStore(
      snapshot(
        { path: "/fr/products/google-review-card", referrerHost: "www.google.com" },
        null,
      ),
    );
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    const args = rpcArgs();
    expect(args.p_first_touch_source).toBe("ORGANIC_SEARCH");
    expect(args.p_first_referrer).toBe("https://www.google.com/");
    expect(args.p_first_landing_path).toBe("/fr/products/google-review-card");
    // No later external touch: last falls back to first, conversion = first page.
    expect(args.p_last_touch_source).toBe("ORGANIC_SEARCH");
    expect(args.p_conversion_path).toBe("/fr/products/google-review-card");
  });

  it("records Instagram UTM first touch and TikTok last touch separately", async () => {
    cookieStore(
      snapshot(
        {
          path: "/fr",
          referrerHost: null,
          utmSource: "instagram",
          utmMedium: "organic_social",
          utmCampaign: "google_review_launch",
        },
        {
          path: "/fr/products/google-review-card",
          referrerHost: null,
          utmSource: "tiktok",
          utmMedium: "organic_social",
          utmCampaign: "reel_03",
        },
      ),
    );
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    const args = rpcArgs();
    expect(args.p_first_touch_source).toBe("ORGANIC_SOCIAL");
    expect(args.p_first_utm_source).toBe("instagram");
    expect(args.p_last_touch_source).toBe("ORGANIC_SOCIAL");
    expect(args.p_last_utm_source).toBe("tiktok");
    expect(args.p_last_utm_campaign).toBe("reel_03");
    expect(args.p_conversion_path).toBe("/fr/products/google-review-card");
  });

  it("falls back to DIRECT with no cookie at all", async () => {
    cookieStore(null);
    const result = await createPublicOrderAction(BASE_ORDER);
    expect(result.ok).toBe(true);
    const args = rpcArgs();
    expect(args.p_first_touch_source).toBe("DIRECT");
    expect(args.p_last_touch_source).toBe("DIRECT");
    expect(args.p_conversion_path).toBe("/fr/order");
  });

  it("never trusts browser-submitted source enums", async () => {
    cookieStore(
      snapshot({ path: "/fr", referrerHost: "evil.example" }, null),
    );
    const result = await createPublicOrderAction({
      ...BASE_ORDER,
      // Even if a caller smuggles junk, server classification rules apply.
    });
    expect(result.ok).toBe(true);
    expect(rpcArgs().p_first_touch_source).toBe("REFERRAL");
  });
});
