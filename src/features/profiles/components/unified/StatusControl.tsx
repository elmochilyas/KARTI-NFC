"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/Button";
import { setStatusAction } from "@/app/dashboard/clients/[id]/profile/actions";

/**
 * Phase 34: publish/deactivate control extracted from the legacy
 * ProfileEditor. Status changes stay immediate (they gate public
 * visibility — never part of the draft) and report back through
 * `onStatusChange` so the unified header and Review step stay in sync.
 * Plain buttons (no nested form): this lives inside the editor save form.
 */
export function StatusControl({
  clientId,
  profileId,
  status,
  onStatusChange,
}: {
  clientId: string;
  profileId: string | null;
  status: string;
  onStatusChange: (status: string, message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (!profileId) {
    return (
      <section
        aria-label="Status"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Status</h2>
          <StatusBadge status="DRAFT" />
        </div>
        <p className="mt-2 text-sm text-muted">
          Save the profile first — it starts as a draft, then you can activate it.
        </p>
      </section>
    );
  }

  function changeStatus(next: "ACTIVE" | "INACTIVE") {
    if (!profileId) return;
    const pid: string = profileId;
    setMessage("");
    startTransition(async () => {
      const result = await setStatusAction(clientId, pid, next);
      setMessage(result.message);
      if (result.ok) onStatusChange(next, result.message);
    });
  }

  return (
    <section
      aria-label="Status"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">Status</h2>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {status === "DRAFT"
          ? "Draft — not public yet. Activate when the details and links look right."
          : status === "INACTIVE"
            ? "Inactive — currently unavailable publicly."
            : "Active — the public page is live."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "ACTIVE" ? (
          <Button type="button" loading={pending} onClick={() => changeStatus("ACTIVE")}>
            {pending ? "Activating…" : status === "INACTIVE" ? "Reactivate" : "Activate Profile"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() => changeStatus("INACTIVE")}
          >
            {pending ? "Deactivating…" : "Deactivate Profile"}
          </Button>
        )}
      </div>
      {message ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </section>
  );
}
