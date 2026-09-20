import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { ErrorState } from "@/components/ui/states";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

/** Minimal operational settings: identity, environment, app info. No billing/teams (future scope). */
export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" subtitle="Workspace, account, and app information." />
        <ErrorState
          title="Settings are not configured."
          description="Add Supabase keys to .env.local."
        />
      </div>
    );
  }

  let email: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  } catch {
    email = null;
  }

  const appUrl = getAppUrl();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" subtitle="Workspace, account, and app information." />

      <Section title="Account" description="Signed in as a Karti admin.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="break-all text-sm font-medium text-text">{email ?? "Unknown account"}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-surface-muted px-4 text-sm font-medium text-text hover:bg-border"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </Section>

      <Section title="Workspace" description="Where public pages and card links resolve.">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-muted">Public app URL</dt>
            <dd className="break-all font-mono text-text">{appUrl}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-muted">Public profiles</dt>
            <dd className="break-all font-mono text-text">
              {appUrl}/{"{slug}"}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-muted">Permanent card links</dt>
            <dd className="break-all font-mono text-text">
              {appUrl}/t/{"{shortCode}"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">
          The permanent link lives on every card and QR — changing a destination never changes it.
        </p>
      </Section>

      <Section title="About" description="What this workspace is.">
        <p className="text-sm text-muted">
          Karti admin dashboard (MVP). Admin-operated: no customer accounts, no billing, no teams.
          Card inventory under Cards is advanced tooling — everyday setup happens from each client.
        </p>
      </Section>
    </div>
  );
}
