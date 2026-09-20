"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createClientRecord, updateClient } from "@/features/clients/service";
import type { ClientResult, ClientRow } from "@/features/clients/types";

export type ClientFormState = ClientResult<ClientRow> & {
  values?: { name: string; company: string; phone: string; email: string; notes: string };
};

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

async function getServerClient() {
  try {
    return await createClient();
  } catch {
    return null;
  }
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const values = readForm(formData);
  const supabase = await getServerClient();
  if (!supabase) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Client management is not configured yet." },
      values,
    };
  }
  const result = await createClientRecord(values, supabase);
  if (!result.ok) return { ...result, values };
  redirect(`/dashboard/clients/${result.data.id}`);
}

export async function quickAddAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  return createClientAction(_prevState, formData);
}

export async function updateClientAction(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const values = readForm(formData);
  const supabase = await getServerClient();
  if (!supabase) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Client management is not configured yet." },
      values,
    };
  }
  const result = await updateClient(id, values, supabase);
  if (!result.ok) return { ...result, values };
  redirect(`/dashboard/clients/${result.data.id}`);
}
