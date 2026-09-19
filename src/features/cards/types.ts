import type { Tables } from "@/types/database";
import type { CardStatus } from "./schema";

export type CardRow = Tables<"cards">;

export type CardErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "UNKNOWN";

export type CardResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: CardErrorCode; message: string };
    };

export type AssignedClient = {
  id: string;
  name: string;
} | null;

export type DestinationProfile = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
} | null;

export type CardSummary = Pick<
  CardRow,
  "id" | "card_number" | "short_code" | "status" | "destination_type" | "created_at"
> & {
  clients: AssignedClient;
};

export type CardDetail = CardRow & {
  clients: AssignedClient;
  destination_profile: DestinationProfile;
};

export const CARD_LIST_COLUMNS =
  "id, card_number, short_code, status, destination_type, created_at, clients (id, name)" as const;

export const CARD_DETAIL_COLUMNS =
  "id, card_number, short_code, client_id, destination_type, destination_profile_id, destination_url, status, created_at, updated_at" as const;

export type { CardStatus };
