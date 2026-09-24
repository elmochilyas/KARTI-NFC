"use client";

import Link from "next/link";
import { ExternalLink, QrCode } from "lucide-react";
import { onboardingSteps, type CompletionResult } from "@/features/profiles/completion";
import { useUnifiedEditor } from "../UnifiedProfileEditor";
import { CompletionCard } from "../CompletionCard";
import { OnboardingChecklist } from "../OnboardingChecklist";
import { ProfileLinkPanel } from "../ProfileLinkPanel";
import { StatusControl } from "./StatusControl";

/**
 * Phase 34 — Step 6 Review. The former page-level clutter lives here:
 * readiness, public link, status, and NFC/QR entry points. The big cards no
 * longer dominate the editing page — only a compact % survives in the header.
 */
export function ReviewStep({ completion }: { completion: CompletionResult }) {
  const { draft, dispatch, clientId, profileId } = useUnifiedEditor();

  const steps = onboardingSteps(
    {
      display_name: draft.fields.display_name,
      avatar_path: draft.fields.avatar_path || null,
      cover_path: draft.fields.cover_path || null,
      phone: draft.fields.phone || null,
      whatsapp: draft.fields.whatsapp || null,
      email: draft.fields.email || null,
      website: draft.fields.website || null,
      bio: draft.fields.bio || null,
      status: draft.status,
    },
    draft.links.map((l) => ({ enabled: l.enabled })),
    draft.sections.map((s) => ({ type: s.type, enabled: s.enabled, settings: s.settings })),
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Review"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">Review</h2>
        <p className="mt-1 text-sm text-muted">
          Check the summary, save, then activate when ready. Activation needs a name and a valid
          slug.
        </p>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Display name</dt>
            <dd className="break-all text-right font-medium text-text">
              {draft.fields.display_name.trim() || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Slug</dt>
            <dd className="break-all text-right font-mono text-text">
              /{draft.fields.slug.trim() || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Type</dt>
            <dd className="text-right text-text">
              {draft.fields.profile_type === "BUSINESS" ? "Business" : "Individual"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Contact</dt>
            <dd className="break-all text-right text-text">
              {[draft.fields.phone.trim(), draft.fields.email.trim()].filter(Boolean).join(" · ") ||
                "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Links</dt>
            <dd className="text-right text-text">
              {draft.links.length === 0
                ? "No links yet"
                : `${draft.links.length} link${draft.links.length === 1 ? "" : "s"} (${draft.links.filter((l) => l.enabled).length} enabled)`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Sections</dt>
            <dd className="text-right text-text">
              {draft.sections.length === 0
                ? "Default order"
                : `${draft.sections.length} section${draft.sections.length === 1 ? "" : "s"}`}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Theme</dt>
            <dd className="text-right capitalize text-text">{draft.fields.theme}</dd>
          </div>
        </dl>
        {!profileId ? (
          <p className="mt-3 text-sm text-muted">
            Save once to enable photo uploads and links, then come back to finish.
          </p>
        ) : null}
      </section>

      <CompletionCard completion={completion} />

      {draft.status === "DRAFT" && profileId ? (
        <OnboardingChecklist profileId={profileId} steps={steps} />
      ) : null}

      <ProfileLinkPanel slug={draft.fields.slug} status={draft.status} framed={false} />

      {profileId ? (
        <StatusControl
          clientId={clientId}
          profileId={profileId}
          status={draft.status}
          onStatusChange={(status) => dispatch({ type: "setStatus", status })}
        />
      ) : null}

      <section
        aria-label="Card and QR"
        className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <h2 className="text-base font-semibold text-text">NFC card & QR</h2>
        <p className="mt-1 text-sm text-muted">
          Put this profile on the physical card or download its QR code.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/dashboard/clients/${clientId}/nfc`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent-strong"
          >
            <QrCode aria-hidden="true" className="h-4 w-4" />
            Configure NFC & QR
          </Link>
          <Link
            href={`/dashboard/clients/${clientId}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface-muted"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Back to client
          </Link>
        </div>
      </section>
    </div>
  );
}
