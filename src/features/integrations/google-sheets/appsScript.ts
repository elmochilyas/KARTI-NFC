/**
 * Server-only Apps Script Web App HTTP client (Karti → Sheet transport).
 *
 * No service account, no Google API keys in Karti: delivery writes are
 * signed JSON envelopes POSTed to the bound Apps Script Web App, which
 * owns the Sheet. Apps Script cannot reliably read custom HTTP headers,
 * so authentication rides in the body (timestamp + nonce + canonical
 * payload string + HMAC-SHA256). Never imported from Client Components.
 */
import "server-only";

import { getDeliverySheetsConfig } from "@/lib/env-server";
import { createDeliveryEnvelope } from "./signatures";
import type { SheetCellValue } from "./types";

export const APPS_SCRIPT_TIMEOUT_MS = 15_000;

export type UpsetOrderOperation = {
  type: "UPSERT_ORDER";
  orderId: string;
  /** Exactly the 21 normalized Sheet cells (mapping.ts output). */
  values: SheetCellValue[];
};

export type SetupSheetOperation = {
  type: "SETUP_SHEET";
};

export type PingOperation = {
  type: "PING";
};

export type DeliveryOperation = UpsetOrderOperation | SetupSheetOperation | PingOperation;

export type AppsScriptResult = "CREATED" | "UPDATED" | "UNCHANGED" | "PONG";

export type SendOutcome =
  | { ok: true; result: AppsScriptResult | "SETUP_OK"; detail?: unknown }
  | { ok: false; retryable: boolean; code: string; message: string };

export type AppsScriptTransport = {
  post: (
    url: string,
    envelope: Record<string, string>,
    timeoutMs: number,
  ) => Promise<{ status: number; text: string }>;
};

async function livePost(
  url: string,
  envelope: Record<string, string>,
  timeoutMs: number,
): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: res.status, text: await res.text() };
}

/** Classify transport + protocol outcomes: retryable vs terminal. */
export function classifyAppsScriptOutcome(status: number | null, body: unknown): SendOutcome {
  if (status === null) {
    return {
      ok: false,
      retryable: true,
      code: "NETWORK",
      message: "Delivery endpoint unreachable.",
    };
  }
  if (status === 429 || (status >= 500 && status <= 599)) {
    return {
      ok: false,
      retryable: true,
      code: `HTTP_${status}`,
      message: `Delivery endpoint error ${status}.`,
    };
  }
  if (status < 200 || status >= 300) {
    // 4xx (auth/deployment/permanent) — retrying the same envelope cannot help.
    return {
      ok: false,
      retryable: false,
      code: `HTTP_${status}`,
      message: `Delivery endpoint rejected the request (${status}).`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof body === "string" ? body : "");
  } catch {
    return {
      ok: false,
      retryable: false,
      code: "MALFORMED_RESPONSE",
      message: "Delivery endpoint returned invalid JSON.",
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      retryable: false,
      code: "MALFORMED_RESPONSE",
      message: "Delivery endpoint returned an unexpected body.",
    };
  }
  const record = parsed as Record<string, unknown>;
  if (record.ok === true) {
    const result = record.result;
    if (
      result === "CREATED" ||
      result === "UPDATED" ||
      result === "UNCHANGED" ||
      result === "SETUP_OK" ||
      result === "PONG" ||
      // PING carries no state change: ok:true + operation is sufficient.
      (result === undefined && record.operation === "PING")
    ) {
      return {
        ok: true,
        result: (result as AppsScriptResult | "SETUP_OK") ?? "PONG",
        detail: record.detail,
      };
    }
    return {
      ok: false,
      retryable: false,
      code: "MALFORMED_RESPONSE",
      message: "Delivery endpoint returned an unknown result.",
    };
  }
  const code = typeof record.code === "string" ? record.code : "REJECTED";
  // Temporary Apps Script execution failures may clear on retry; signature/
  // auth/validation rejections are terminal for the same envelope.
  const retryable = code === "TEMPORARY_FAILURE" || code === "TIMEOUT" || code === "RATE_LIMITED";
  return { ok: false, retryable, code, message: `Delivery endpoint reported ${code}.` };
}

/** Truncate technical messages for storage — never secrets. */
export function truncateDeliveryError(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 500) || "Delivery sync error";
}

/**
 * Send one signed operation to the Apps Script Web App and validate the
 * structured response. Never throws for transport/protocol outcomes (they
 * are classified); throws only when the integration is not configured.
 */
export async function sendOrderToDeliveryScript(
  operation: DeliveryOperation,
  deps?: { transport?: AppsScriptTransport; nowMs?: number },
): Promise<SendOutcome> {
  const config = getDeliverySheetsConfig();
  if (!config.enabled) {
    return {
      ok: false,
      retryable: false,
      code: "NOT_CONFIGURED",
      message: "Delivery Sheet is not configured.",
    };
  }
  const envelope = createDeliveryEnvelope(
    config.webAppSecret,
    operation as unknown as Record<string, unknown>,
    deps?.nowMs,
  );
  const transport = deps?.transport ?? { post: livePost };
  let status: number | null;
  let text: string;
  try {
    const response = await transport.post(
      config.webAppUrl,
      { ...envelope },
      APPS_SCRIPT_TIMEOUT_MS,
    );
    status = response.status;
    text = response.text;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return {
        ok: false,
        retryable: true,
        code: "TIMEOUT",
        message: "Delivery endpoint timed out.",
      };
    }
    return classifyAppsScriptOutcome(null, null);
  }
  return classifyAppsScriptOutcome(status, text);
}
