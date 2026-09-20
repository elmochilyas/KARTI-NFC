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
