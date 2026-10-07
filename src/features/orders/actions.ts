/**
 * Orders dashboard server actions (Phase 3). Thin authenticated
 * boundary: input validation here, business rules + atomicity in the
 * service/RPC layer, then path revalidation.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  isFulfillmentStatus,
  isInquiryStatus,
  isOrderCancelReason,
  isOrderStatus,
  isPaymentStatus,
  parseMadDecimalToMinor,
} from "@/domain/orders";
import type { OrderErrorCode } from "./types";
import { createClient } from "@/lib/supabase/server";
import {
  cancelOrder,
  completeOrder,
  confirmOrder,
  convertOrder,
  findClientCandidates,
  markOrderContacted,
  provisionOrderCards,
  resolveReviewDestination,
  updateCustomerNote,
  updateFulfillmentStatus,
  updateInquiryStatus,
  updateInternalNote,
  updateOrderAdjustments,
  updatePaymentStatus,
} from "./service";
import type { ClientCandidate, ConversionMode } from "./types";

export type OrderActionState = {
  ok: boolean;
  message: string;
  code?: OrderErrorCode;
};

const NOT_CONFIGURED: OrderActionState = {
  ok: false,
  message: "Order management is not configured yet.",
  code: "UNKNOWN",
};

async function getServerClient() {
  try {
    return await createClient();
  } catch {
    return null;
  }
}

function toState(
  result: { ok: boolean; error?: { code: OrderErrorCode; message: string } },
  successMessage: string,
): OrderActionState {
  if (!result.ok) {
    const fallback = "We couldn't update this order. Please try again.";
    return {
      ok: false,
      message: result.error?.message ?? fallback,
      code: result.error?.code ?? "UNKNOWN",
    };
  }
  return { ok: true, message: successMessage };
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

export async function markContactedAction(
  orderId: string,
  expectedStatus: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isOrderStatus(expectedStatus)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await markOrderContacted(orderId, expectedStatus, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Order marked as contacted.");
}

export async function confirmOrderAction(
  orderId: string,
  expectedStatus: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isOrderStatus(expectedStatus)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await confirmOrder(orderId, expectedStatus, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Order confirmed.");
}

export async function completeOrderAction(
  orderId: string,
  expectedStatus: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isOrderStatus(expectedStatus)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await completeOrder(orderId, expectedStatus, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Order completed.");
}

export async function cancelOrderAction(
  orderId: string,
  expectedStatus: string,
  reason: string,
  note: string | null,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isOrderStatus(expectedStatus) || !isOrderCancelReason(reason)) {
    return {
      ok: false,
      message: "Check the entered values and try again.",
      code: "VALIDATION_ERROR",
    };
  }
  const result = await cancelOrder(orderId, expectedStatus, reason, note, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Order cancelled.");
}

export async function updateAdjustmentsAction(
  orderId: string,
  expectedUpdatedAt: string,
  deliveryRaw: string,
  discountRaw: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const deliveryFeeMinor = parseMadDecimalToMinor(deliveryRaw);
  const discountMinor = parseMadDecimalToMinor(discountRaw);
  if (deliveryFeeMinor === null || discountMinor === null) {
    return {
      ok: false,
      message: "Enter valid non-negative MAD amounts (up to 2 decimals).",
      code: "VALIDATION_ERROR",
    };
  }
  const result = await updateOrderAdjustments(
    orderId,
    expectedUpdatedAt,
    { deliveryFeeMinor, discountMinor },
    supabase,
  );
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Delivery / discount updated.");
}

export async function updatePaymentAction(
  orderId: string,
  expectedPayment: string,
  targetPayment: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isPaymentStatus(expectedPayment) || !isPaymentStatus(targetPayment)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await updatePaymentStatus(orderId, expectedPayment, targetPayment, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Payment status updated.");
}

export async function updateFulfillmentAction(
  orderId: string,
  expectedFulfillment: string,
  targetFulfillment: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isFulfillmentStatus(expectedFulfillment) || !isFulfillmentStatus(targetFulfillment)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await updateFulfillmentStatus(
    orderId,
    expectedFulfillment,
    targetFulfillment,
    supabase,
  );
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Fulfillment status updated.");
}

export async function updateInternalNoteAction(
  orderId: string,
  expectedUpdatedAt: string,
  note: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await updateInternalNote(orderId, expectedUpdatedAt, note, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Internal note saved.");
}

export async function updateCustomerNoteAction(
  orderId: string,
  expectedUpdatedAt: string,
  note: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await updateCustomerNote(orderId, expectedUpdatedAt, note, supabase);
  if (result.ok) revalidateOrder(orderId);
  return toState(result, "Customer note saved.");
}

export async function updateInquiryStatusAction(
  inquiryId: string,
  expectedStatus: string,
  targetStatus: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isInquiryStatus(expectedStatus) || !isInquiryStatus(targetStatus)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await updateInquiryStatus(inquiryId, expectedStatus, targetStatus, supabase);
  if (result.ok) {
    revalidatePath("/dashboard/orders");
    return { ok: true, message: "Inquiry updated." };
  }
  return toState(result, "");
}

// ---------------------------------------------------------------------------
// Conversion & provisioning (Phase 4)
// ---------------------------------------------------------------------------

export type CandidatesActionState =
  | { ok: true; candidates: ClientCandidate[] }
  | { ok: false; message: string; code?: OrderErrorCode };

export async function findClientCandidatesAction(orderId: string): Promise<CandidatesActionState> {
  const supabase = await getServerClient();
  if (!supabase) return { ok: false, message: "Order management is not configured yet." };
  const result = await findClientCandidates(orderId, supabase);
  if (!result.ok) {
    return { ok: false, message: result.error.message, code: result.error.code };
  }
  return { ok: true, candidates: result.data };
}

function isConversionMode(value: unknown): value is ConversionMode {
  return value === "existing" || value === "new";
}

export async function convertOrderAction(
  orderId: string,
  expectedStatus: string,
  mode: string,
  clientId: string | null,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isOrderStatus(expectedStatus) || !isConversionMode(mode)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await convertOrder(orderId, expectedStatus, mode, clientId, supabase);
  if (result.ok) {
    revalidateOrder(orderId);
    return {
      ok: true,
      message: result.data.converted
        ? "Order converted to client."
        : "Order was already linked to this client.",
    };
  }
  return toState(result, "");
}

export async function provisionOrderCardsAction(
  orderId: string,
  itemId: string,
  expectedFulfillment: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  if (!isFulfillmentStatus(expectedFulfillment)) {
    return {
      ok: false,
      message: "This action is no longer available.",
      code: "INVALID_TRANSITION",
    };
  }
  const result = await provisionOrderCards(orderId, itemId, expectedFulfillment, supabase);
  if (result.ok) {
    revalidateOrder(orderId);
    const count = result.data.provisioned;
    return {
      ok: true,
      message:
        count === 0
          ? "All required cards are already linked."
          : count === 1
            ? "1 card provisioned and linked."
            : `${count} cards provisioned and linked.`,
    };
  }
  return toState(result, "");
}

export async function resolveReviewDestinationAction(
  orderId: string,
  itemId: string,
  expectedItemUpdatedAt: string,
  url: string,
): Promise<OrderActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await resolveReviewDestination(itemId, expectedItemUpdatedAt, url, supabase);
  if (result.ok) {
    revalidateOrder(orderId);
    return { ok: true, message: "Review destination saved." };
  }
  return toState(result, "");
}
