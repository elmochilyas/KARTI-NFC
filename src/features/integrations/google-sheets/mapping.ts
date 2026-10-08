/**
 * Normalized Sheet row builder — the ONE deterministic mapping from a
 * database order snapshot to Sheet columns.
 *
 * Rules:
 * - Money originates from integer minor-unit snapshot data only. The
 *   minor → major division here is presentation (numeric MAD cells so the
 *   Sheet can sort/calculate); financial authority stays in Supabase.
 * - Phone and order number are strings (preserve "+212…" and KARTI- prefix).
 * - Never include receipt tokens, hashes, normalized-PII indexes,
 *   attribution, internal notes, or secrets.
 */

import { createHash } from "node:crypto";
import { PRODUCT_DISPLAY_NAMES } from "@/features/orders/productNames";
import { isProductType } from "@/domain/orders";
import type { ProductType } from "@/domain/orders";
import {
  SHEET_COLUMN_COUNT,
  type DeliveryOrderItemSnapshot,
  type DeliveryOrderSnapshot,
  type DeliverySheetRow,
} from "./types";

/** Minor units → numeric major units for Sheet cells (presentation only). */
export function minorToMajorNumber(minor: number): number {
  return minor / 100;
}

/** Canonical product display name; unknown IDs degrade honestly. */
export function sheetProductName(productType: string): string {
  if (isProductType(productType)) {
    return PRODUCT_DISPLAY_NAMES[productType as ProductType];
  }
  return "Unknown product";
}

export function hashSheetValues(values: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(values), "utf8").digest("hex");
}

/**
 * Build the 21-cell row for one order. Multi-item orders (future) collapse
 * to one row: product names joined, quantities summed, order-level money
 * totals used (unit price = first item's snapshot).
 */
export function buildDeliverySheetRow(
  order: DeliveryOrderSnapshot,
  items: DeliveryOrderItemSnapshot[],
  syncedAtIso: string,
): DeliverySheetRow {
  const productNames = items.map((item) => sheetProductName(item.productType));
  const productLabel =
    productNames.length === 0 ? "Unknown product" : [...new Set(productNames)].join(" + ");
  const firstProductType = items.length > 0 ? items[0].productType : "UNKNOWN";
  const quantity = items.reduce(
    (sum, item) => sum + (Number.isSafeInteger(item.quantity) ? item.quantity : 0),
    0,
  );
  const unitPriceMinor = items.length > 0 ? items[0].unitPriceMinor : 0;

  const values = [
    order.orderNumber, // A Order Number (text)
    order.id, // B Order ID (identity)
    order.createdAt, // C Created At
    order.customerName, // D Customer Name
    order.phone, // E Phone (text — keeps "+")
    productLabel, // F Product
    firstProductType, // G Product Type (canonical)
    quantity, // H Quantity
    minorToMajorNumber(unitPriceMinor), // I Unit Price (first-item snapshot)
    minorToMajorNumber(order.subtotalMinor), // J Product Subtotal
    minorToMajorNumber(order.deliveryFeeMinor), // K Delivery Fee
    minorToMajorNumber(order.discountMinor), // L Discount
    minorToMajorNumber(order.totalMinor), // M Total / COD
    order.city, // N City
    order.deliveryAddress, // O Address
    order.deliveryNotes ?? "", // P Customer Note
    order.orderStatus, // Q Order Status
    order.fulfillmentStatus, // R Delivery Status
    order.paymentStatus, // S Payment Status
    order.updatedAt, // T Last Karti Update
    syncedAtIso, // U Last Sheet Sync
  ];

  if (values.length !== SHEET_COLUMN_COUNT) {
    throw new Error("buildDeliverySheetRow produced the wrong column count");
  }
  return { values, hash: hashSheetValues(values.slice(0, SHEET_COLUMN_COUNT - 1)) };
}
