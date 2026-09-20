import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProfileEditor } from "@/features/profiles/components/ProfileEditor";
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
  const clientResult = await getClientById(clientId, supabase);
  if (!clientResult.ok) notFound();

  const profileResult = await getProfileByClientId(clientId, supabase);
  if (!profileResult.ok) {
    return (
      <ErrorState title="Could not load the profile." description={profileResult.error.message} />
    );
  }
  if (profileResult.data) {
    redirect(`/dashboard/clients/${clientId}/profile`);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <BackLink href={`/dashboard/clients/${clientId}`}>
          Back to {clientResult.data.name}
        </BackLink>
        <div className="mt-2">
          <PageHeader
            title="New Profile"
            subtitle="Created as a draft. Steps: Identity → Contact → Links → Appearance → Review, then activate."
          />
        </div>
      </div>
      <ProfileEditor
        clientId={clientId}
        clientName={clientResult.data.name}
        profile={null}
        links={[]}
        newProfileId={randomUUID()}
        initialAvatarUrl={null}
        initialCoverUrl={null}
        justCreated={false}
        appUrl={getAppUrl()}
      />
    </div>
  );
}
