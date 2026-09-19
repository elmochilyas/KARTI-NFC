"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignCardToClient,
  createCard,
  setCardDestinationToExternalUrl,
  setCardDestinationToProfile,
  setCardStatus,
  unassignCard,
} from "@/features/cards/service";
import { createClient } from "@/lib/supabase/server";

export type CardActionState = { ok: boolean; message: string };

const NOT_CONFIGURED: CardActionState = {
  ok: false,
  message: "Card management is not configured yet.",
};

async function getServerClient() {
  try {
    return await createClient();
  } catch {
    return null;
  }
}

function toState(
  result: { ok: boolean; error?: { message: string } },
  successMessage: string,
): CardActionState {
  if (!result.ok) {
    const message =
      "error" in result && result.error ? result.error.message : "Something went wrong.";
    return { ok: false, message };
  }
  return { ok: true, message: successMessage };
}

/** Create one UNASSIGNED card, then open its detail page. */
export async function createCardAction(): Promise<void> {
  const supabase = await getServerClient();
  if (!supabase) return;
  const result = await createCard(supabase);
  if (!result.ok) {
    redirect("/dashboard/cards?error=create-failed");
  }
  redirect(`/dashboard/cards/${result.data.id}`);
}

export async function assignCardAction(
  cardId: string,
  _prevState: CardActionState,
  formData: FormData,
): Promise<CardActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await assignCardToClient(
    cardId,
    String(formData.get("client_id") ?? ""),
    supabase,
  );
  if (!result.ok) return toState(result, "");
  revalidatePath(`/dashboard/cards/${cardId}`);
  revalidatePath(`/dashboard/clients/${result.data.client_id}`);
  return toState(result, "Card assigned.");
}

export async function unassignCardAction(cardId: string): Promise<CardActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await unassignCard(cardId, supabase);
  if (!result.ok) return toState(result, "");
  revalidatePath(`/dashboard/cards/${cardId}`);
  return toState(result, "Card unassigned.");
}

export async function setDestinationAction(
  cardId: string,
  clientId: string | null,
  _prevState: CardActionState,
  formData: FormData,
): Promise<CardActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const kind = String(formData.get("destination_type") ?? "");
  const result =
    kind === "PROFILE"
      ? await setCardDestinationToProfile(
          cardId,
          clientId ?? "",
          String(formData.get("profile_id") ?? ""),
          supabase,
        )
      : kind === "EXTERNAL_URL"
        ? await setCardDestinationToExternalUrl(cardId, String(formData.get("url") ?? ""), supabase)
        : {
            ok: false as const,
            error: { code: "VALIDATION_ERROR" as const, message: "Choose a destination type." },
          };
  if (!result.ok) return toState(result, "");
  revalidatePath(`/dashboard/cards/${cardId}`);
  return toState(result, "Destination saved.");
}

export async function setCardStatusAction(
  cardId: string,
  _prevState: CardActionState,
  formData: FormData,
): Promise<CardActionState> {
  const supabase = await getServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const result = await setCardStatus(cardId, String(formData.get("status") ?? ""), supabase);
  if (!result.ok) return toState(result, "");
  revalidatePath(`/dashboard/cards/${cardId}`);
  return toState(result, `Status set to ${result.data.status}.`);
}
