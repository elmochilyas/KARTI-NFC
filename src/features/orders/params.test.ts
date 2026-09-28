import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDERS_QUERY,
  ORDERS_PAGE_SIZE,
  parseOrdersQuery,
  viewStatusFilter,
} from "./params";

describe("orders query params", () => {
  it("defaults safely for missing params", () => {
    expect(parseOrdersQuery({})).toEqual(DEFAULT_ORDERS_QUERY);
    expect(parseOrdersQuery(undefined)).toEqual(DEFAULT_ORDERS_QUERY);
    expect(ORDERS_PAGE_SIZE).toBe(25);
  });

  it("accepts valid tab, view, filters, and page", () => {
    expect(
      parseOrdersQuery({
        tab: "inquiries",
        view: "needs-action",
        q: "  ahmed ",
        page: "2",
        product: "GOOGLE_REVIEW_CARD",
        payment: "PAID",
        fulfillment: "READY",
        source: "REFERRAL",
        istatus: "CONTACTED",
      }),
    ).toEqual({
      tab: "inquiries",
      view: "needs-action",
      q: "ahmed",
      page: 2,
      product: "GOOGLE_REVIEW_CARD",
      payment: "PAID",
      fulfillment: "READY",
      source: "REFERRAL",
      istatus: "CONTACTED",
    });
  });

  it("falls back safely for unknown or hostile values", () => {
    const parsed = parseOrdersQuery({
      tab: "nope",
      view: "'; DROP TABLE orders; --",
      page: "-3",
      product: "WHATSAPP_CARD'; --",
      payment: "GOLD",
      fulfillment: "FLYING",
      source: "DARK_WEB",
      istatus: "ARCHIVED",
    });
    expect(parsed).toEqual({ ...DEFAULT_ORDERS_QUERY, page: 1 });
  });

  it("bounds search length and clamps non-numeric pages", () => {
    expect(parseOrdersQuery({ q: "x".repeat(500) }).q).toHaveLength(120);
    expect(parseOrdersQuery({ page: "abc" }).page).toBe(1);
    expect(parseOrdersQuery({ page: "0" }).page).toBe(1);
    expect(parseOrdersQuery({ page: ["2", "3"] }).page).toBe(2);
  });

  it("maps plain views to status filters", () => {
    expect(viewStatusFilter("new")).toBe("NEW");
    expect(viewStatusFilter("completed")).toBe("COMPLETED");
    expect(viewStatusFilter("all")).toBeNull();
    expect(viewStatusFilter("needs-action")).toBeNull();
    expect(viewStatusFilter("ready")).toBeNull();
  });
});
