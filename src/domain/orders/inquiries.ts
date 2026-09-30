/**
 * Inquiry lifecycle for the dashboard Inquiries tab
 * (specs/specs-vitrin/03 §11, 04 §25). Inquiries never become Clients
 * automatically and never convert to Orders in Phase 3.
 */

export const INQUIRY_STATUSES = ["NEW", "CONTACTED", "CLOSED", "SPAM"] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export const INQUIRY_TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  NEW: ["CONTACTED", "CLOSED", "SPAM"],
  CONTACTED: ["NEW", "CLOSED", "SPAM"],
  CLOSED: ["NEW"],
  SPAM: ["NEW"],
};

export function canTransitionInquiry(from: InquiryStatus, to: InquiryStatus): boolean {
  return INQUIRY_TRANSITIONS[from].includes(to);
}

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
  SPAM: "Spam",
};

export function inquiryStatusLabel(status: InquiryStatus): string {
  return INQUIRY_STATUS_LABELS[status];
}
