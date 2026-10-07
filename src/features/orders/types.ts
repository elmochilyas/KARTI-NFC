import type { Tables } from "@/types/database";
import type { FulfillmentStatus, OrderStatus, PaymentStatus, ProductType } from "@/domain/orders";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type OrderEventRow = Tables<"order_events">;
export type InquiryRow = Tables<"inquiries">;

export type OrderErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "PROFILE_CONFLICT"
  | "DESTINATION_REQUIRED"
  | "SLUG_TAKEN"
  | "SHORT_CODE_COLLISION"
  | "UNKNOWN";

export type OrderResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: OrderErrorCode; message: string; fieldErrors?: Record<string, string> };
    };

/** List-level order fields only — never event history per row. */
export const ORDER_LIST_COLUMNS =
  "id, order_number, customer_name, phone, whatsapp, email, status, payment_status, fulfillment_status, total_minor, currency, first_touch_source, created_at, updated_at" as const;

/**
 * Detail columns. receipt_token_hash is deliberately excluded — the
 * dashboard never needs the receipt credential.
 */
export const ORDER_DETAIL_COLUMNS =
  "id, order_number, idempotency_key, channel, customer_name, phone, phone_normalized, whatsapp, whatsapp_normalized, email, email_normalized, preferred_contact, city, delivery_address, delivery_notes, status, payment_status, fulfillment_status, subtotal_minor, delivery_fee_minor, discount_minor, total_minor, currency, client_id, customer_notes, internal_notes, locale, first_touch_source, first_landing_path, first_referrer, first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_utm_term, last_touch_source, conversion_path, last_referrer, last_utm_source, last_utm_medium, last_utm_campaign, last_utm_content, last_utm_term, created_at, updated_at" as const;

export const ORDER_ITEM_COLUMNS =
  "id, order_id, product_type, quantity, unit_price_minor, line_total_minor, configuration, profile_id, created_at, updated_at" as const;

export const ORDER_EVENT_COLUMNS =
  "id, order_id, event_type, actor_type, actor_user_id, from_value, to_value, metadata, created_at" as const;

export const INQUIRY_LIST_COLUMNS =
  "id, name, company, phone, email, inquiry_type, message, status, source, locale, created_at, updated_at" as const;

export type NarrowedOrderStatus = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  productType: ProductType | null;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  totalMinor: number | null;
  currency: string;
  source: string | null;
  productType: ProductType | null;
  itemCount: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type OrdersPage = {
  rows: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LinkedClientSummary = {
  id: string;
  name: string;
  company: string | null;
};

export type LinkedProfileSummary = {
  id: string;
  displayName: string;
  slug: string;
  profileType: string;
  status: string;
};

export type LinkedCardSummary = {
  id: string;
  cardNumber: string;
  shortCode: string;
  status: string;
};

export type OrderDetail = {
  /** Full row minus the receipt credential hash (never selected). */
  order: Omit<OrderRow, "receipt_token_hash">;
  items: OrderItemRow[];
  events: OrderEventRow[];
  client: LinkedClientSummary | null;
  profiles: LinkedProfileSummary[];
  cards: LinkedCardSummary[];
  /** order_item_id → linked physical card count. */
  linkedCardCounts: Record<string, number>;
  /** order_item_id → linked physical cards (for per-item display). */
  linkedCardsByItem: Record<string, LinkedCardSummary[]>;
};

export type OrdersSummary = {
  newCount: number;
  needsActionCount: number;
  inProgressCount: number;
  readyCount: number;
};

export type InquiryListItem = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  inquiryType: string | null;
  message: string;
  status: string;
  source: string | null;
  createdAt: string;
};

export type InquiriesPage = {
  rows: InquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Envelope returned by the admin_* RPCs (jsonb). */
export type AdminRpcEnvelope = {
  ok: boolean;
  code?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  total_minor?: number;
  converted?: boolean;
  client_id?: string;
  profile_id?: string;
  profile_created?: boolean;
  existing_profile_type?: string;
  provisioned?: number;
  card_ids?: string[];
  url?: string;
};

export type ConversionMode = "existing" | "new";

export type ConversionResult = {
  converted: boolean;
  clientId: string;
  profileId: string | null;
  profileCreated: boolean;
};

export type ProvisionResult = {
  provisioned: number;
  cardIds: string[];
};

export type ClientCandidate = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  matchReasons: Array<"PHONE" | "EMAIL" | "NAME">;
};
