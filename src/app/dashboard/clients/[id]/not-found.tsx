import Link from "next/link";

/** Shown when /dashboard/clients/[id] has no matching client. */
export default function ClientNotFound() {
  return (
    <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-text">Client not found</p>
      <p className="text-sm text-muted">
        This client does not exist or you do not have access to it.
      </p>
      <Link
        href="/dashboard/clients"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border"
      >
        Back to Clients
      </Link>
    </div>
  );
}
