/**
 * URL builders for the orders workspace. Every list state lives in the
 * query string so links (tabs, views, pagination, tiles) preserve the
 * operator's context and Back/Forward works.
 */

import type { OrdersQuery } from "./params";

export type OrdersUrlOverrides = Partial<OrdersQuery>;

const DEFAULTS: OrdersQuery = {
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

export function buildOrdersUrl(query: OrdersQuery, overrides: OrdersUrlOverrides = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.tab !== DEFAULTS.tab) params.set("tab", merged.tab);
  if (merged.view !== DEFAULTS.view) params.set("view", merged.view);
  if (merged.q !== "") params.set("q", merged.q);
  if (merged.page !== 1) params.set("page", String(merged.page));
  if (merged.product) params.set("product", merged.product);
  if (merged.payment) params.set("payment", merged.payment);
  if (merged.fulfillment) params.set("fulfillment", merged.fulfillment);
  if (merged.source) params.set("source", merged.source);
  if (merged.istatus) params.set("istatus", merged.istatus);
  const suffix = params.toString();
  return suffix === "" ? "/dashboard/orders" : `/dashboard/orders?${suffix}`;
}
