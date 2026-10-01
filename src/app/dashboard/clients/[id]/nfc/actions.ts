"use server";

import { revalidatePath } from "next/cache";
import { configureCardForClient, type ConfigureInput } from "@/features/cards/orchestrate";
import { createClient } from "@/lib/supabase/server";

export type ConfigureActionState = {
  ok: boolean;
  message: string;
  permanentUrl?: string;
  cardNumber?: string;
  shortCode?: string;
  values?: { kind: string; url: string };
};

const NOT_CONFIGURED: ConfigureActionState = {
  ok: false,
  message: "NFC configuration is not available yet.",
};

/**
 * One-tap NFC configuration: orchestrates create → assign → destination →
 * ACTIVE behind a single operator action. Never rewrites short codes.
 *
 * Multi-card: hidden `card_id` configures one specific card, hidden
 * `new_card=1` always creates an additional card. Otherwise the primary
 * card is reused (existing behavior).
 */
export async function configureNfcAction(
  clientId: string,
  _prevState: ConfigureActionState,
  formData: FormData,
): Promise<ConfigureActionState> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NOT_CONFIGURED;
  }

  const kind = String(formData.get("destination_kind") ?? "");
  const url = String(formData.get("url") ?? "");
  const cardIdRaw = String(formData.get("card_id") ?? "").trim();
  const forceNew = String(formData.get("new_card") ?? "") === "1";
  const values = { kind, url };
  const input: ConfigureInput =
    kind === "EXTERNAL_URL" ? { kind: "EXTERNAL_URL", url } : { kind: "PROFILE" };

  const result = await configureCardForClient(clientId, input, supabase, {
    ...(cardIdRaw ? { cardId: cardIdRaw } : {}),
    ...(forceNew ? { forceNew: true } : {}),
  });
  if (!result.ok) {
    return { ok: false, message: result.error.message, values };
  }
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {
    ok: true,
    message: forceNew
      ? "Additional card configured and activated. Other cards untouched."
      : result.data.reused
        ? "Card destination updated. Same card, same URL."
        : "NFC card configured and activated.",
    permanentUrl: result.data.permanentUrl,
    cardNumber: result.data.card.card_number,
    shortCode: result.data.card.short_code,
  };
}
