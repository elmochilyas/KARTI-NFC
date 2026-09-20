import type { Tables } from "@/types/database";
import type { ClientInput } from "./schema";

export type ClientRow = Tables<"clients">;

export type ClientId = string;

export type ClientErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "UNKNOWN";

export type ClientResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ClientErrorCode;
        message: string;
        fieldErrors?: Partial<Record<keyof ClientInput, string>>;
      };
    };

export type ClientSummary = Pick<
  ClientRow,
  "id" | "name" | "company" | "phone" | "email" | "created_at"
>;

/** Columns shown on the list — never include anything non-public by accident. */
export const CLIENT_LIST_COLUMNS = "id, name, company, phone, email, created_at" as const;

export const CLIENT_DETAIL_COLUMNS =
  "id, name, company, phone, email, notes, created_at, updated_at" as const;
