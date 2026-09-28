/**
 * Orders dashboard service (Phase 3). All reads go through the
 * user-scoped client under the existing admin-only RLS policies; all
 * state mutations go through the atomic admin_* RPCs (one migration,
 * SELECT ... FOR UPDATE + expected-state guards inside).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  canTransitionFulfillment,
  canTransitionInquiry,
  canTransitionPayment,
  computeQuoteTotal,
  FULFILLMENT_STATUSES,
  isInquiryStatus,
  isNonNegativeMinor,
  isOrderCancelReason,
  isProductType,
  needsActionOrFilter,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/domain/orders";
import type {
  FulfillmentStatus,
  InquiryStatus,
  OrderCancelReason,
  OrderStatus,
  PaymentStatus,
  PricingStatus,
  ProductType,
} from "@/domain/orders";
import { ORDERS_PAGE_SIZE, viewStatusFilter, type OrdersQuery } from "./params";
import {
  INQUIRY_LIST_COLUMNS,
  ORDER_DETAIL_COLUMNS,
  ORDER_EVENT_COLUMNS,
  ORDER_ITEM_COLUMNS,
  ORDER_LIST_COLUMNS,
  type AdminRpcEnvelope,
  type InquiriesPage,
  type InquiryListItem,
  type LinkedCardSummary,
  type LinkedClientSummary,
  type LinkedProfileSummary,
  type OrderDetail,
  type OrderErrorCode,
  type OrderListItem,
  type OrderResult,
  type OrdersPage,
  type OrdersSummary,
} from "./types";

export type OrdersDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_NOTE_INTERNAL = 2000;
const MAX_NOTE_CUSTOMER = 1000;
const MAX_CANCEL_NOTE = 1000;

/** Escape PostgREST LIKE wildcards; strip or() structure breakers. */
export function escapeOrderSearch(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[,()]/g, "");
}

/**
 * Every privileged operation re-verifies the session server-side.
 * Page-level protection and RLS are additional layers, not the check.
 */
async function requireAdmin(supabase: OrdersDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED: OrderResult<never> = {
  ok: false,
  error: { code: "UNAUTHORIZED", message: "Sign in to manage orders." },
};

const UNKNOWN_LIST: OrderResult<never> = {
  ok: false,
  error: { code: "UNKNOWN", message: "Could not load orders. Please try again." },
};

function mutationError(code: OrderErrorCode): OrderResult<never> {
  switch (code) {
    case "CONFLICT":
      return {
        ok: false,
        error: {
          code,
          message: "This order was updated in another session. Refresh to see its current status.",
        },
      };
    case "INVALID_TRANSITION":
      return {
        ok: false,
        error: {
          code,
          message: "This action is no longer available for the order's current state.",
        },
      };
    case "NOT_FOUND":
      return { ok: false, error: { code, message: "Order not found." } };
    case "UNAUTHORIZED":
      return UNAUTHORIZED;
    case "VALIDATION_ERROR":
      return {
        ok: false,
        error: { code, message: "Check the entered values and try again." },
      };
    default:
      return {
        ok: false,
        error: { code: "UNKNOWN", message: "We couldn't update this order. Please try again." },
      };
  }
}

function narrowStatus(value: unknown): OrderStatus | null {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : null;
}

function narrowPayment(value: unknown): PaymentStatus | null {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value)
    ? (value as PaymentStatus)
    : null;
}

function narrowFulfillment(value: unknown): FulfillmentStatus | null {
  return typeof value === "string" && (FULFILLMENT_STATUSES as readonly string[]).includes(value)
    ? (value as FulfillmentStatus)
    : null;
}

function narrowPricing(value: unknown): PricingStatus | null {
  return value === "PRICED" || value === "QUOTE_REQUIRED" ? value : null;
}

type RawListRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  pricing_status: string;
  total_minor: number | null;
  currency: string;
  first_touch_source: string | null;
  created_at: string;
  updated_at: string;
  order_items: Array<{ product_type: string; quantity: number }> | null;
};

function toListItem(row: RawListRow): OrderListItem | null {
  const status = narrowStatus(row.status);
  const paymentStatus = narrowPayment(row.payment_status);
  const fulfillmentStatus = narrowFulfillment(row.fulfillment_status);
  const pricingStatus = narrowPricing(row.pricing_status);
  if (!status || !paymentStatus || !fulfillmentStatus || !pricingStatus) return null;
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  const firstProduct = items.length > 0 ? items[0].product_type : null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    status,
    paymentStatus,
    fulfillmentStatus,
    pricingStatus,
    totalMinor: row.total_minor,
    currency: row.currency,
    source: row.first_touch_source,
    productType:
      firstProduct !== null && isProductType(firstProduct) ? (firstProduct as ProductType) : null,
    itemCount: items.length,
    quantity: items.reduce(
      (sum, item) => sum + (Number.isSafeInteger(item.quantity) ? item.quantity : 0),
      0,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listOrders(
  query: OrdersQuery,
  supabase: OrdersDb,
): Promise<OrderResult<OrdersPage>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const itemsEmbed = query.product
    ? "order_items!inner(product_type,quantity)"
    : "order_items(product_type,quantity)";

  function baseListQuery() {
    let builder = supabase
      .from("orders")
      .select(`${ORDER_LIST_COLUMNS}, ${itemsEmbed}`, { count: "exact" });

    if (query.product) {
      builder = builder.eq("order_items.product_type", query.product);
    }

    const plainStatus = viewStatusFilter(query.view);
    if (plainStatus) {
      builder = builder.eq("status", plainStatus);
    } else if (query.view === "ready") {
      builder = builder.eq("fulfillment_status", "READY");
    }

    if (query.payment) builder = builder.eq("payment_status", query.payment);
    if (query.fulfillment) builder = builder.eq("fulfillment_status", query.fulfillment);
    if (query.source) builder = builder.eq("first_touch_source", query.source);
    return builder;
  }

  type OrdersListQuery = ReturnType<typeof baseListQuery>;

  let listQuery: OrdersListQuery = baseListQuery();
  if (query.view === "needs-action") {
    listQuery = listQuery.or(needsActionOrFilter()) as OrdersListQuery;
  } else if (query.view === "ready") {
    listQuery = listQuery.not("status", "in", "(COMPLETED,CANCELLED)") as OrdersListQuery;
  }

  if (query.q !== "") {
    const pattern = `%${escapeOrderSearch(query.q)}%`;
    listQuery = listQuery.or(
      `order_number.ilike.${pattern},customer_name.ilike.${pattern},phone.ilike.${pattern},phone_normalized.ilike.${pattern},whatsapp.ilike.${pattern},whatsapp_normalized.ilike.${pattern},email.ilike.${pattern},email_normalized.ilike.${pattern}`,
    ) as OrdersListQuery;
  }

  const from = (query.page - 1) * ORDERS_PAGE_SIZE;
  const { data, error, count } = await listQuery
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  if (error) return UNKNOWN_LIST;
  const rows = ((data ?? []) as unknown as RawListRow[])
    .map(toListItem)
    .filter((row): row is OrderListItem => row !== null);
  const total = count ?? rows.length;
  return {
    ok: true,
    data: {
      rows,
      total,
      page: query.page,
      pageSize: ORDERS_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    },
  };
}

export async function getOrderDetail(
  id: string,
  supabase: OrdersDb,
): Promise<OrderResult<OrderDetail>> {
  if (!UUID_PATTERN.test(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(ORDER_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (orderError) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the order. Please try again." },
    };
  }
  if (!order) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("order_items")
      .select(ORDER_ITEM_COLUMNS)
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_events")
      .select(ORDER_EVENT_COLUMNS)
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  let client: LinkedClientSummary | null = null;
  if (order.client_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, name, company")
      .eq("id", order.client_id)
      .maybeSingle();
    if (clientRow) {
      client = { id: clientRow.id, name: clientRow.name, company: clientRow.company };
    }
  }

  const profileIds = [...new Set((items ?? []).map((item) => item.profile_id).filter(Boolean))];
  let profiles: LinkedProfileSummary[] = [];
  if (profileIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, slug")
      .in("id", profileIds as string[]);
    profiles = (profileRows ?? []).map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      slug: profile.slug,
    }));
  }

  const itemIds = (items ?? []).map((item) => item.id);
  let cards: LinkedCardSummary[] = [];
  if (itemIds.length > 0) {
    const { data: links } = await supabase
      .from("order_item_cards")
      .select("order_item_id, card_id")
      .in("order_item_id", itemIds);
    const cardIds = [...new Set((links ?? []).map((link) => link.card_id))];
    if (cardIds.length > 0) {
      const { data: cardRows } = await supabase
        .from("cards")
        .select("id, card_number, short_code, status")
        .in("id", cardIds);
      cards = (cardRows ?? []).map((card) => ({
        id: card.id,
        cardNumber: card.card_number,
        shortCode: card.short_code,
        status: card.status,
      }));
    }
  }

  return {
    ok: true,
    data: {
      order,
      items: items ?? [],
      events: events ?? [],
      client,
      profiles,
      cards,
    },
  };
}

async function countOrders(
  build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number | null> {
  const { count, error } = await build();
  if (error) return null;
  return count ?? 0;
}

export async function getOrdersSummary(supabase: OrdersDb): Promise<OrderResult<OrdersSummary>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const [newCount, needsActionCount, inProgressCount, readyCount] = await Promise.all([
    countOrders(() =>
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "NEW"),
    ),
    countOrders(() =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .or(needsActionOrFilter()),
    ),
    countOrders(() =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "IN_PROGRESS"),
    ),
    countOrders(() =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("fulfillment_status", "READY")
        .not("status", "in", "(COMPLETED,CANCELLED)"),
    ),
  ]);

  if (
    newCount === null ||
    needsActionCount === null ||
    inProgressCount === null ||
    readyCount === null
  ) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load order counts. Please try again." },
    };
  }
  return { ok: true, data: { newCount, needsActionCount, inProgressCount, readyCount } };
}

/** Oldest needs-action orders first — for the Dashboard Home urgent list. */
export async function getUrgentOrders(
  limit: number,
  supabase: OrdersDb,
): Promise<OrderResult<OrderListItem[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 10) : 5;

  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_LIST_COLUMNS}, order_items(product_type,quantity)`)
    .or(needsActionOrFilter())
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) return UNKNOWN_LIST;
  const rows = ((data ?? []) as unknown as RawListRow[])
    .map(toListItem)
    .filter((row): row is OrderListItem => row !== null);
  return { ok: true, data: rows };
}

export async function listInquiries(
  query: Pick<OrdersQuery, "q" | "page" | "istatus">,
  supabase: OrdersDb,
): Promise<OrderResult<InquiriesPage>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  function baseInquiryQuery() {
    let builder = supabase.from("inquiries").select(INQUIRY_LIST_COLUMNS, { count: "exact" });
    if (query.istatus) builder = builder.eq("status", query.istatus);
    return builder;
  }

  type InquiryListQuery = ReturnType<typeof baseInquiryQuery>;

  let inquiryQuery: InquiryListQuery = baseInquiryQuery();
  if (query.q !== "") {
    const pattern = `%${escapeOrderSearch(query.q)}%`;
    inquiryQuery = inquiryQuery.or(
      `name.ilike.${pattern},company.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},message.ilike.${pattern}`,
    ) as InquiryListQuery;
  }

  const from = (query.page - 1) * ORDERS_PAGE_SIZE;
  const { data, error, count } = await inquiryQuery
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load inquiries. Please try again." },
    };
  }
  const rows: InquiryListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    inquiryType: row.inquiry_type,
    message: row.message,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  }));
  const total = count ?? rows.length;
  return {
    ok: true,
    data: {
      rows,
      total,
      page: query.page,
      pageSize: ORDERS_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    },
  };
}

export async function updateInquiryStatus(
  id: string,
  expectedStatus: InquiryStatus,
  targetStatus: InquiryStatus,
  supabase: OrdersDb,
): Promise<OrderResult<{ status: InquiryStatus }>> {
  if (!UUID_PATTERN.test(id) || !isInquiryStatus(expectedStatus)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Inquiry not found." } };
  }
  if (!isInquiryStatus(targetStatus) || !canTransitionInquiry(expectedStatus, targetStatus)) {
    return {
      ok: false,
      error: {
        code: "INVALID_TRANSITION",
        message: "This action is no longer available for the inquiry's current state.",
      },
    };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  // Single guarded statement: atomic by construction.
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: targetStatus })
    .eq("id", id)
    .eq("status", expectedStatus)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "We couldn't update this inquiry. Please try again." },
    };
  }
  if (!data) {
    const { data: existing } = await supabase
      .from("inquiries")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return { ok: false, error: { code: "NOT_FOUND", message: "Inquiry not found." } };
    }
    return {
      ok: false,
      error: {
        code: "CONFLICT",
        message: "This inquiry was updated in another session. Refresh to see its current status.",
      },
    };
  }
  return { ok: true, data: { status: targetStatus } };
}

// ---------------------------------------------------------------------------
// Mutations (atomic admin_* RPCs)
// ---------------------------------------------------------------------------

function parseRpcEnvelope(raw: unknown): AdminRpcEnvelope | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.ok !== "boolean") return null;
  return {
    ok: record.ok,
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    payment_status: typeof record.payment_status === "string" ? record.payment_status : undefined,
    fulfillment_status:
      typeof record.fulfillment_status === "string" ? record.fulfillment_status : undefined,
    pricing_status: typeof record.pricing_status === "string" ? record.pricing_status : undefined,
    total_minor: typeof record.total_minor === "number" ? record.total_minor : undefined,
  };
}

/**
 * Maps a failure envelope to a typed result. Callers only invoke this
 * when `envelope.ok` is false, so no success branch exists by design.
 */
function mapEnvelopeFailure(envelope: AdminRpcEnvelope | null): OrderResult<never> {
  if (!envelope) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "We couldn't update this order. Please try again." },
    };
  }
  switch (envelope.code) {
    case "CONFLICT":
    case "INVALID_TRANSITION":
    case "NOT_FOUND":
    case "UNAUTHORIZED":
      return mutationError(envelope.code);
    case "VALIDATION":
      return mutationError("VALIDATION_ERROR");
    default:
      return mutationError("UNKNOWN");
  }
}

type AdminFunctionName =
  | "admin_mark_order_contacted"
  | "admin_confirm_order"
  | "admin_complete_order"
  | "admin_cancel_order"
  | "admin_set_order_price"
  | "admin_update_payment_status"
  | "admin_update_fulfillment_status"
  | "admin_update_internal_note"
  | "admin_update_customer_note";

type AdminFunctionArgs<Fn extends AdminFunctionName> =
  Database["public"]["Functions"][Fn]["Args"];

async function callAdminRpc<Fn extends AdminFunctionName>(
  functionName: Fn,
  args: AdminFunctionArgs<Fn>,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;
  const { data, error } = await supabase.rpc(functionName, args);
  if (error || !data) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "We couldn't update this order. Please try again." },
    };
  }
  const envelope = parseRpcEnvelope(data);
  if (!envelope) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "We couldn't update this order. Please try again." },
    };
  }
  if (!envelope.ok) return mapEnvelopeFailure(envelope);
  return { ok: true, data: envelope };
}

function validOrderId(id: unknown): id is string {
  return typeof id === "string" && UUID_PATTERN.test(id);
}

export async function markOrderContacted(
  id: string,
  expectedStatus: OrderStatus,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (expectedStatus !== "NEW") {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_mark_order_contacted",
    { p_order_id: id, p_expected_status: expectedStatus },
    supabase,
  );
}

export async function confirmOrder(
  id: string,
  expectedStatus: OrderStatus,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (expectedStatus !== "CONTACTED") {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_confirm_order",
    { p_order_id: id, p_expected_status: expectedStatus },
    supabase,
  );
}

export async function completeOrder(
  id: string,
  expectedStatus: OrderStatus,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (expectedStatus !== "IN_PROGRESS") {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_complete_order",
    { p_order_id: id, p_expected_status: expectedStatus },
    supabase,
  );
}

export async function cancelOrder(
  id: string,
  expectedStatus: OrderStatus,
  reason: OrderCancelReason,
  note: string | null,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (!isOrderCancelReason(reason)) {
    return mutationError("VALIDATION_ERROR") as OrderResult<AdminRpcEnvelope>;
  }
  if (note !== null && (typeof note !== "string" || note.length > MAX_CANCEL_NOTE)) {
    return mutationError("VALIDATION_ERROR") as OrderResult<AdminRpcEnvelope>;
  }
  if (
    expectedStatus !== "NEW" &&
    expectedStatus !== "CONTACTED" &&
    expectedStatus !== "CONFIRMED" &&
    expectedStatus !== "IN_PROGRESS"
  ) {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_cancel_order",
    // Generated Args types p_note as string; the SQL treats "" like NULL
    // (no note key in event metadata), so coalesce preserves semantics.
    { p_order_id: id, p_expected_status: expectedStatus, p_reason: reason, p_note: note ?? "" },
    supabase,
  );
}

export async function setOrderPrice(
  id: string,
  expectedUpdatedAt: string,
  amounts: { subtotalMinor: number; deliveryFeeMinor: number; discountMinor: number },
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (
    !isNonNegativeMinor(amounts.subtotalMinor) ||
    !isNonNegativeMinor(amounts.deliveryFeeMinor) ||
    !isNonNegativeMinor(amounts.discountMinor) ||
    computeQuoteTotal(amounts) === null
  ) {
    return mutationError("VALIDATION_ERROR") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_set_order_price",
    {
      p_order_id: id,
      p_expected_updated_at: expectedUpdatedAt,
      p_subtotal_minor: amounts.subtotalMinor,
      p_delivery_fee_minor: amounts.deliveryFeeMinor,
      p_discount_minor: amounts.discountMinor,
    },
    supabase,
  );
}

export async function updatePaymentStatus(
  id: string,
  expectedPayment: PaymentStatus,
  targetPayment: PaymentStatus,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (
    !(PAYMENT_STATUSES as readonly string[]).includes(expectedPayment) ||
    !(PAYMENT_STATUSES as readonly string[]).includes(targetPayment) ||
    !canTransitionPayment(expectedPayment, targetPayment)
  ) {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_update_payment_status",
    { p_order_id: id, p_expected_payment: expectedPayment, p_target_payment: targetPayment },
    supabase,
  );
}

export async function updateFulfillmentStatus(
  id: string,
  expectedFulfillment: FulfillmentStatus,
  targetFulfillment: FulfillmentStatus,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (
    !(FULFILLMENT_STATUSES as readonly string[]).includes(expectedFulfillment) ||
    !(FULFILLMENT_STATUSES as readonly string[]).includes(targetFulfillment) ||
    !canTransitionFulfillment(expectedFulfillment, targetFulfillment)
  ) {
    return mutationError("INVALID_TRANSITION") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_update_fulfillment_status",
    {
      p_order_id: id,
      p_expected_fulfillment: expectedFulfillment,
      p_target_fulfillment: targetFulfillment,
    },
    supabase,
  );
}

export async function updateInternalNote(
  id: string,
  expectedUpdatedAt: string,
  note: string,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (typeof note !== "string" || note.trim().length > MAX_NOTE_INTERNAL) {
    return mutationError("VALIDATION_ERROR") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_update_internal_note",
    { p_order_id: id, p_expected_updated_at: expectedUpdatedAt, p_note: note },
    supabase,
  );
}

export async function updateCustomerNote(
  id: string,
  expectedUpdatedAt: string,
  note: string,
  supabase: OrdersDb,
): Promise<OrderResult<AdminRpcEnvelope>> {
  if (!validOrderId(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Order not found." } };
  }
  if (typeof note !== "string" || note.trim().length > MAX_NOTE_CUSTOMER) {
    return mutationError("VALIDATION_ERROR") as OrderResult<AdminRpcEnvelope>;
  }
  return callAdminRpc(
    "admin_update_customer_note",
    { p_order_id: id, p_expected_updated_at: expectedUpdatedAt, p_note: note },
    supabase,
  );
}
