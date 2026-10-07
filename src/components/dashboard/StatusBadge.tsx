/**
 * One badge language for the whole dashboard. Restrained semantics:
 * green = active/ready, amber = draft/setup needed, neutral = not
 * configured, red = disabled/lost where appropriate. Status is always
 * conveyed by text, never by color alone.
 */
const STYLES: Record<string, string> = {
  ACTIVE: "border-success/30 bg-success-muted text-success",
  READY: "border-success/30 bg-success-muted text-success",
  CONFIGURED: "border-success/30 bg-success-muted text-success",
  ASSIGNED: "border-success/30 bg-success-muted text-success",
  DRAFT: "border-warning/40 bg-warning-muted text-warning",
  NEEDS_SETUP: "border-warning/40 bg-warning-muted text-warning",
  INACTIVE: "border-border bg-neutral-muted text-muted",
  UNASSIGNED: "border-border bg-neutral-muted text-muted",
  NOT_CONFIGURED: "border-border bg-neutral-muted text-muted",
  DISABLED: "border-danger/30 bg-danger-muted text-danger",
  LOST: "border-danger/30 bg-danger-muted text-danger",
  REPLACED: "border-border bg-neutral-muted text-muted",
  // Orders workspace (Phase 3): same text-first language.
  NEW: "border-warning/40 bg-warning-muted text-warning",
  CONTACTED: "border-border bg-neutral-muted text-muted",
  CONFIRMED: "border-success/30 bg-success-muted text-success",
  IN_PROGRESS: "border-warning/40 bg-warning-muted text-warning",
  COMPLETED: "border-success/30 bg-success-muted text-success",
  CANCELLED: "border-danger/30 bg-danger-muted text-danger",
  PENDING: "border-warning/40 bg-warning-muted text-warning",
  PARTIALLY_PAID: "border-warning/40 bg-warning-muted text-warning",
  PAID: "border-success/30 bg-success-muted text-success",
  REFUNDED: "border-border bg-neutral-muted text-muted",
  NOT_REQUIRED: "border-border bg-neutral-muted text-muted",
  NOT_STARTED: "border-border bg-neutral-muted text-muted",
  AWAITING_CUSTOMER_INFO: "border-border bg-neutral-muted text-muted",
  DESIGN: "border-border bg-neutral-muted text-muted",
  AWAITING_APPROVAL: "border-border bg-neutral-muted text-muted",
  CHANGES_REQUESTED: "border-warning/40 bg-warning-muted text-warning",
  APPROVED: "border-border bg-neutral-muted text-muted",
  PRODUCTION: "border-border bg-neutral-muted text-muted",
  NFC_CONFIGURATION: "border-border bg-neutral-muted text-muted",
  SHIPPED: "border-border bg-neutral-muted text-muted",
  DELIVERED: "border-success/30 bg-success-muted text-success",
  SPAM: "border-danger/30 bg-danger-muted text-danger",
  CLOSED: "border-border bg-neutral-muted text-muted",
};

const LABELS: Record<string, string> = {
  ACTIVE: "Active",
  READY: "Ready",
  CONFIGURED: "Configured",
  ASSIGNED: "Assigned",
  DRAFT: "Draft",
  NEEDS_SETUP: "Needs setup",
  INACTIVE: "Inactive",
  UNASSIGNED: "Unassigned",
  NOT_CONFIGURED: "Not configured",
  DISABLED: "Disabled",
  LOST: "Lost",
  REPLACED: "Replaced",
  PROFILE: "Profile",
  EXTERNAL_URL: "External link",
  NEW: "New",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
  NOT_REQUIRED: "Not required",
  NOT_STARTED: "Not started",
  AWAITING_CUSTOMER_INFO: "Awaiting customer info",
  DESIGN: "Design",
  AWAITING_APPROVAL: "Awaiting approval",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  PRODUCTION: "Production",
  NFC_CONFIGURATION: "NFC configuration",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  SPAM: "Spam",
  CLOSED: "Closed",
};

export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
  const style = STYLES[status] ?? "border-border bg-neutral-muted text-muted";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}
