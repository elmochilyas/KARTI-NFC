import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { clientSchema, type ClientInput } from "./schema";
import {
  CLIENT_DETAIL_COLUMNS,
  CLIENT_LIST_COLUMNS,
  type ClientResult,
  type ClientRow,
  type ClientSummary,
} from "./types";

export type ClientDb = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_LIST_ROWS = 100;

/** Escape PostgREST LIKE wildcards so search matches literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function toFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Partial<Record<keyof ClientInput, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "name" ||
        field === "company" ||
        field === "phone" ||
        field === "email" ||
        field === "notes") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

function validationFailed(issues: readonly { path: PropertyKey[]; message: string }[]) {
  return {
    ok: false as const,
    error: {
      code: "VALIDATION_ERROR" as const,
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(issues),
    },
  };
}

/**
 * Every privileged operation re-verifies the session server-side.
 * Page-level protection and RLS are additional layers, not the check.
 */
async function requireAdmin(supabase: ClientDb): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return !!data?.claims;
  } catch {
    return false;
  }
}

const UNAUTHORIZED = {
  ok: false as const,
  error: { code: "UNAUTHORIZED" as const, message: "Sign in to manage clients." },
};

export async function createClient(
  rawInput: unknown,
  supabase: ClientDb,
): Promise<ClientResult<ClientRow>> {
  const parsed = clientSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      company: parsed.data.company,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
    })
    .select(CLIENT_DETAIL_COLUMNS)
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not create the client. Please try again." },
    };
  }
  return { ok: true, data };
}

export async function updateClient(
  id: string,
  rawInput: unknown,
  supabase: ClientDb,
): Promise<ClientResult<ClientRow>> {
  if (!UUID_PATTERN.test(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Client not found." } };
  }
  const parsed = clientSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      company: parsed.data.company,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
    })
    .eq("id", id)
    .select(CLIENT_DETAIL_COLUMNS)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not update the client. Please try again." },
    };
  }
  if (!data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Client not found." } };
  }
  return { ok: true, data };
}

export async function getClientById(
  id: string,
  supabase: ClientDb,
): Promise<ClientResult<ClientRow>> {
  if (!UUID_PATTERN.test(id)) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Client not found." } };
  }
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load the client. Please try again." },
    };
  }
  if (!data) {
    return { ok: false, error: { code: "NOT_FOUND", message: "Client not found." } };
  }
  return { ok: true, data };
}

export type ListClientsOptions = {
  query?: string;
};

export async function listClients(
  options: ListClientsOptions,
  supabase: ClientDb,
): Promise<ClientResult<ClientSummary[]>> {
  if (!(await requireAdmin(supabase))) return UNAUTHORIZED;

  const q = options.query?.trim() ?? "";
  let query = supabase
    .from("clients")
    .select(CLIENT_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(MAX_LIST_ROWS);

  if (q !== "") {
    const pattern = `%${escapeLikePattern(q)}%`;
    query = query.or(
      `name.ilike.${pattern},company.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      error: { code: "UNKNOWN", message: "Could not load clients. Please try again." },
    };
  }
  return { ok: true, data: data ?? [] };
}
