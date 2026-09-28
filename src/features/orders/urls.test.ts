import { describe, expect, it } from "vitest";
import { DEFAULT_ORDERS_QUERY } from "./params";
import { buildOrdersUrl } from "./urls";

describe("orders urls", () => {
  it("omits defaults for a clean base URL", () => {
    expect(buildOrdersUrl(DEFAULT_ORDERS_QUERY)).toBe("/dashboard/orders");
  });

  it("serializes non-default state and preserves context on overrides", () => {
    const query = {
      ...DEFAULT_ORDERS_QUERY,
      view: "needs-action" as const,
      q: "ahmed",
      page: 2,
    };
    expect(buildOrdersUrl(query)).toBe("/dashboard/orders?view=needs-action&q=ahmed&page=2");
    expect(buildOrdersUrl(query, { page: 3 })).toContain("page=3");
    expect(buildOrdersUrl(query, { view: "all", page: 1, q: "" })).toBe("/dashboard/orders");
  });

  it("resets pagination when switching tabs", () => {
    expect(buildOrdersUrl(DEFAULT_ORDERS_QUERY, { tab: "inquiries" })).toBe(
      "/dashboard/orders?tab=inquiries",
    );
  });
});
