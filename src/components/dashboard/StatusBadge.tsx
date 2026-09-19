const STYLES: Record<string, string> = {
  ACTIVE: "border-success/30 bg-success-muted text-success",
  ASSIGNED: "border-success/30 bg-success-muted text-success",
  DRAFT: "border-border bg-neutral-muted text-muted",
  INACTIVE: "border-border bg-neutral-muted text-muted",
  UNASSIGNED: "border-border bg-neutral-muted text-muted",
  DISABLED: "border-warning/40 bg-warning-muted text-warning",
  LOST: "border-danger/30 bg-danger-muted text-danger",
  REPLACED: "border-border bg-neutral-muted text-muted",
};

const LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ASSIGNED: "Assigned",
  DRAFT: "Draft",
  INACTIVE: "Inactive",
  UNASSIGNED: "Unassigned",
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
