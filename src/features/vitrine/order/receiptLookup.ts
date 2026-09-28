/**
 * Minimal public receipt lookup (server-only).
 *
 * The order number is not authorization: access additionally requires
 * the high-entropy receipt token, of which only the SHA-256 hash is
 * stored. Projects an explicit public-safe column set (same ADR-032
 * posture as profile reads) — never address, contact details, notes,
 * attribution, or linked domain IDs. Any failure yields null with a
 * generic message upstream (no existence leak).
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isProductType, type ProductType } from "@/domain/orders/productTypes";
import { productSlugFromType } from "../products";
import { hashReceiptToken, isReceiptTokenShape } from "./receipt";

export type PublicReceipt = {
  orderNumber: string;
  productType: ProductType;
  productSlug: string;
  quantity: number;
};

const ORDER_NUMBER_PATTERN = /^KARTI-\d{6}$/;

export async function getPublicReceipt(
  orderNumber: unknown,
  token: unknown,
): Promise<PublicReceipt | null> {
  try {
    if (typeof orderNumber !== "string" || !ORDER_NUMBER_PATTERN.test(orderNumber)) {
      return null;
    }
    if (!isReceiptTokenShape(token)) return null;

    const supabase = createAdminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("order_number", orderNumber)
      .eq("receipt_token_hash", hashReceiptToken(token))
      .maybeSingle();
    if (error || !order) return null;

    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("product_type, quantity")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (itemError || !item || !isProductType(item.product_type)) return null;

    return {
      orderNumber: order.order_number,
      productType: item.product_type,
      productSlug: productSlugFromType(item.product_type),
      quantity: item.quantity,
    };
  } catch {
    return null;
  }
}
