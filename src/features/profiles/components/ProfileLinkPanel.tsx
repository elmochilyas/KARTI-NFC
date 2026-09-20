import { ExternalLink, Link2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CopyButton } from "@/features/cards/components/CopyButton";
import { displayProfileUrl, isProfileLinkPublic, publicProfileUrl } from "@/features/profiles/urls";

/**
 * Shared profile-link display (editor top + client detail).
 * URL is derived from the current slug every render — slug edits show up
 * right after save. Copy always available; Open only when ACTIVE.
 */
export function ProfileLinkPanel({
  slug,
  status,
  framed = true,
}: {
  slug: string;
  status: string;
  framed?: boolean;
}) {
  const fullUrl = publicProfileUrl(slug);
  const display = displayProfileUrl(fullUrl);
  const isPublic = isProfileLinkPublic(status);

  const inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">
          {isPublic ? "Public profile link" : "Profile URL"}
        </h2>
        <StatusBadge status={status} />
      </div>
      <div
        className="mt-3 flex items-center gap-2.5 rounded-lg border border-border bg-surface-muted px-3 py-2.5"
        title={fullUrl}
      >
        <Link2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        {isPublic ? (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open public profile ${display}`}
            data-testid="profile-link-url"
            className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-accent hover:underline"
          >
            {display}
          </a>
        ) : (
          <p
            data-testid="profile-link-url"
            className="min-w-0 flex-1 truncate font-mono text-sm text-muted"
          >
            {display}
          </p>
        )}
        {isPublic ? (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-success"
            title="Live"
          />
        ) : null}
      </div>
      {!isPublic ? (
        <p className="mt-2 text-sm text-muted">
          {status === "DRAFT"
            ? "This profile is not public yet. Activate the profile to make this link accessible."
            : "This profile is currently unavailable publicly."}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <CopyButton
          value={fullUrl}
          label="Copy Link"
          size="md"
          className="w-full gap-1.5 sm:w-auto sm:flex-1"
        />
        {isPublic ? (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open public profile ${display}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent-strong sm:w-auto sm:flex-1"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Open Profile
          </a>
        ) : null}
      </div>
    </>
  );

  if (!framed) {
    return (
      <div aria-label="Profile link" className="mt-4 border-t border-border pt-4">
        {inner}
      </div>
    );
  }

  return (
    <section
      aria-label="Profile link"
      className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      {inner}
    </section>
  );
}
