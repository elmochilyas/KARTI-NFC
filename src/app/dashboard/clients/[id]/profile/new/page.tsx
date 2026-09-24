import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { UnifiedProfileEditor } from "@/features/profiles/components/UnifiedProfileEditor";
import { defaultTemplateFor } from "@/features/profiles/profileTemplates";
import { getProfileByClientId } from "@/features/profiles/service";
import { getClientById } from "@/features/clients/service";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "New Profile" };

type NewProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewProfilePage({ params }: NewProfilePageProps) {
  const { id: clientId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <ErrorState
        title="Profile management is not configured."
        description="Add Supabase keys to .env.local."
      />
    );
  }

  const supabase = await createClient();
  // Independent fetches in parallel; order of checks preserves notFound/error behavior.
  const [clientResult, profileResult] = await Promise.all([
    getClientById(clientId, supabase),
    getProfileByClientId(clientId, supabase),
  ]);
  if (!clientResult.ok) notFound();

  if (!profileResult.ok) {
    return (
      <ErrorState title="Could not load the profile." description={profileResult.error.message} />
    );
  }
  if (profileResult.data) {
    redirect(`/dashboard/clients/${clientId}/profile`);
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <BackLink href={`/dashboard/clients/${clientId}`}>
          Back to {clientResult.data.name}
        </BackLink>
        <div className="mt-2">
          <PageHeader
            title="New Profile"
            subtitle="Created as a draft. Steps: Identity → Contact → Links → Sections → Appearance → Review, then activate."
          />
        </div>
      </div>
      <UnifiedProfileEditor
        clientId={clientId}
        clientName={clientResult.data.name}
        profile={null}
        links={[]}
        sections={[]}
        template={defaultTemplateFor("PERSON")}
        newProfileId={randomUUID()}
        initialAvatarUrl={null}
        initialCoverUrl={null}
        justCreated={false}
        appUrl={getAppUrl()}
        publicCode=""
      />
    </div>
  );
}
