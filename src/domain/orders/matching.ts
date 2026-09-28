/**
 * Existing-client candidate ranking for order conversion
 * (specs/specs-vitrin/05 §3). Exact normalized phone/email matches rank
 * first; name/company only supports display and ranking context.
 *
 * Ranking only — the operator always decides. Never auto-link.
 */

export const CLIENT_MATCH_REASONS = ["PHONE", "EMAIL", "NAME"] as const;

export type ClientMatchReason = (typeof CLIENT_MATCH_REASONS)[number];

export type ClientCandidateInput = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  matchReasons: ClientMatchReason[];
};

function matchScore(candidate: ClientCandidateInput): number {
  let score = 0;
  if (candidate.matchReasons.includes("PHONE")) score += 4;
  if (candidate.matchReasons.includes("EMAIL")) score += 2;
  if (candidate.matchReasons.includes("NAME")) score += 1;
  return score;
}

/**
 * Order candidates strongest-match first. Stable: equal scores keep
 * their input order (deterministic for the operator dialog).
 */
export function rankClientCandidates(
  candidates: readonly ClientCandidateInput[],
): ClientCandidateInput[] {
  return [...candidates]
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => matchScore(b.candidate) - matchScore(a.candidate) || a.index - b.index)
    .map((entry) => entry.candidate);
}

const MATCH_REASON_LABELS: Record<ClientMatchReason, string> = {
  PHONE: "Same phone",
  EMAIL: "Same email",
  NAME: "Similar name",
};

export function clientMatchReasonLabel(reason: ClientMatchReason): string {
  return MATCH_REASON_LABELS[reason];
}
