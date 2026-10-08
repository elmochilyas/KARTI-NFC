/**
 * Google Sheets delivery-mirror shared types (server-only).
 *
 * The Sheet is an OPERATIONAL MIRROR: Supabase/Karti is authoritative.
 * Column B (Order ID) is the row identity — never customer phone/name.
 * Physical row numbers are hints only (operators may sort/filter/insert).
 */

// 21-column Orders layout. Positions are part of the contract with the
// deployed Sheet + Apps Script — never reorder without a Sheet migration.
export const SHEET_HEADERS = [
  "Order Number",
  "Order ID",
  "Created At",
  "Customer Name",
  "Phone",
  "Product",
  "Product Type",
  "Quantity",
  "Unit Price",
  "Product Subtotal",
  "Delivery Fee",
  "Discount",
  "Total / COD",
  "City",
  "Address",
  "Customer Note",
  "Order Status",
  "Delivery Status",
  "Payment Status",
  "Last Karti Update",
  "Last Sheet Sync",
] as const;

export const SHEET_COLUMN_COUNT = SHEET_HEADERS.length;

export const SheetColumn = {
  ORDER_NUMBER: 0,
  ORDER_ID: 1,
  CREATED_AT: 2,
  CUSTOMER_NAME: 3,
  PHONE: 4,
  PRODUCT: 5,
  PRODUCT_TYPE: 6,
  QUANTITY: 7,
  UNIT_PRICE: 8,
  SUBTOTAL: 9,
  DELIVERY_FEE: 10,
  DISCOUNT: 11,
  TOTAL: 12,
  CITY: 13,
  ADDRESS: 14,
  CUSTOMER_NOTE: 15,
  ORDER_STATUS: 16,
  DELIVERY_STATUS: 17,
  PAYMENT_STATUS: 18,
  LAST_KARTI_UPDATE: 19,
  LAST_SHEET_SYNC: 20,
} as const;

/** A1-notation column letters for A..U (matches SHEET_HEADERS order). */
export const SHEET_COLUMN_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
] as const;

export type SheetCellValue = string | number | boolean | null;

export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

/** Authoritative order snapshot feeding the Sheet row (never live catalog). */
export type DeliveryOrderSnapshot = {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  phone: string;
  city: string;
  deliveryAddress: string;
  deliveryNotes: string | null;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  orderStatus: string;
  fulfillmentStatus: string;
  paymentStatus: string;
};

export type DeliveryOrderItemSnapshot = {
  productType: string;
  quantity: number;
  unitPriceMinor: number;
};

export type DeliverySheetRow = {
  /** Exactly SHEET_COLUMN_COUNT cells in SHEET_HEADERS order. */
  values: SheetCellValue[];
  /** SHA-256 over the normalized values — skip Sheet writes when equal. */
  hash: string;
};

export type SyncStoreMapping = {
  orderId: string;
  lastPayloadHash: string | null;
  syncStatus: SyncStatus;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  lastSyncedAt: string | null;
};

export type SyncOutcome =
  | { ok: true; mode: "created" | "updated" | "unchanged" }
  | { ok: false; mode: "skipped-disabled" | "failed" | "not-found"; error: string };

// ---------------------------------------------------------------------------
// Sheet → Karti webhook contract
// ---------------------------------------------------------------------------

export const WEBHOOK_FIELDS = ["order_status", "payment_status", "fulfillment_status"] as const;
export type WebhookField = (typeof WEBHOOK_FIELDS)[number];

/**
 * Delivery-company writable values. The Sheet DISPLAYS every authoritative
 * status, but mutations are restricted to these — CONTACTED / IN_PROGRESS /
 * COMPLETED can never be written from the Sheet, and no money/identity
 * field is writable at all (Karti → Sheet only).
 */
export const SHEET_WRITABLE_ORDER_VALUES = ["CONFIRMED", "CANCELLED"] as const;
export const SHEET_WRITABLE_PAYMENT_VALUES = ["PAID", "REFUNDED"] as const;
export const SHEET_WRITABLE_FULFILLMENT_VALUES = [
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;

export function isWebhookField(value: unknown): value is WebhookField {
  return typeof value === "string" && (WEBHOOK_FIELDS as readonly string[]).includes(value);
}

export function isSheetWritableValue(field: WebhookField, value: unknown): boolean {
  if (typeof value !== "string") return false;
  switch (field) {
    case "order_status":
      return (SHEET_WRITABLE_ORDER_VALUES as readonly string[]).includes(value);
    case "payment_status":
      return (SHEET_WRITABLE_PAYMENT_VALUES as readonly string[]).includes(value);
    case "fulfillment_status":
      return (SHEET_WRITABLE_FULFILLMENT_VALUES as readonly string[]).includes(value);
  }
}
