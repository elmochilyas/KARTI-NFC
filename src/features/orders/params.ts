/**
 * URL query-state parsing for /dashboard/orders
 * (specs/specs-vitrin/04 §6). All list state (tab, view, search,
 * filters, page) lives in the URL so Back/Forward preserves the
 * operator's view. Unknown values fall back safely — never crash.
 */

import { ACQUISITION_SOURCES, isProductType } from "@/domain/orders";
import type { AcquisitionSource } from "@/domain/orders";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES } from "@/domain/orders";
import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/domain/orders";
import { isInquiryStatus } from "@/domain/orders";
import type { InquiryStatus } from "@/domain/orders";
import type { ProductType } from "@/domain/orders";

export const ORDERS_TABS = ["orders", "inquiries"] as const;
export type OrdersTab = (typeof ORDERS_TABS)[number];

export const ORDER_VIEWS = [
  "all",
  "new",
  "needs-action",
  "in-progress",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const ORDERS_PAGE_SIZE = 25;
export const MAX_SEARCH_LENGTH = 120;

export type OrdersQuery = {
  tab: OrdersTab;
  view: OrderView;
  /** Trimmed search text (bounded length). */
  q: string;
  /** 1-based page, always >= 1. */
  page: number;
  product: ProductType | null;
  payment: PaymentStatus | null;
  fulfillment: FulfillmentStatus | null;
  source: AcquisitionSource | null;
  /** Inquiry-tab status filter (ignored on the orders tab). */
  istatus: InquiryStatus | null;
};

export const DEFAULT_ORDERS_QUERY: OrdersQuery = {
  tab: "orders",
  view: "all",
  q: "",
  page: 1,
  product: null,
  payment: null,
  fulfillment: null,
  source: null,
  istatus: null,
};

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((entry): entry is string => typeof entry === "string");
    return first ?? null;
  }
  return null;
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const raw = firstString(value);
  if (raw === null) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Parse Next.js searchParams into a validated OrdersQuery. */
export function parseOrdersQuery(raw: unknown): OrdersQuery {
  const params = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const q = (firstString(params.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  const pageRaw = firstString(params.page);
  const pageNum = pageRaw === null ? 1 : Number.parseInt(pageRaw, 10);
  const page = Number.isSafeInteger(pageNum) && pageNum >= 1 ? pageNum : 1;

  const productRaw = firstString(params.product);
  const product = productRaw !== null && isProductType(productRaw) ? productRaw : null;

  const sourceRaw = firstString(params.source);
  const source =
    sourceRaw !== null && (ACQUISITION_SOURCES as readonly string[]).includes(sourceRaw)
      ? (sourceRaw as AcquisitionSource)
      : null;

  const istatusRaw = firstString(params.istatus);
  const istatus = istatusRaw !== null && isInquiryStatus(istatusRaw) ? istatusRaw : null;

  return {
    tab: pick(params.tab, ORDERS_TABS) ?? "orders",
    view: pick(params.view, ORDER_VIEWS) ?? "all",
    q,
    page,
    product,
    payment: pick(params.payment, PAYMENT_STATUSES),
    fulfillment: pick(params.fulfillment, FULFILLMENT_STATUSES),
    source,
    istatus,
  };
}

/**
 * Plain order-status predicate for a list view. The needs-action and
 * ready views use compound predicates applied by the service layer.
 */
export function viewStatusFilter(view: OrderView): OrderStatus | null {
  switch (view) {
    case "new":
      return "NEW";
    case "in-progress":
      return "IN_PROGRESS";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    default:
      return null;
  }
}
