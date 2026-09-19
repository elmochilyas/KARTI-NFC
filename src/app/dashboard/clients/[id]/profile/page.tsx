import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ProfileEditor } from "@/features/profiles/components/ProfileEditor";
import { ProfileLinkPanel } from "@/features/profiles/components/ProfileLinkPanel";
import { listProfileLinks } from "@/features/profiles/links";
import { getProfileByClientId } from "@/features/profiles/service";
import { publicAssetUrl } from "@/features/profiles/storage";
import { getClientById } from "@/features/clients/service";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Edit Profile" };

type EditProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function EditProfilePage({ params, searchParams }: EditProfilePageProps) {
  const { id: clientId } = await params;
  const query = await searchParams;

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
  if (!profileResult.data) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <PageHeader
          title="No profile yet"
          subtitle={`${clientResult.data.name} does not have a profile.`}
        />
        <div>
          <Link
            href={`/dashboard/clients/${clientId}/profile/new`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-contrast hover:bg-accent-strong"
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  const profile = profileResult.data;
  const linksResult = await listProfileLinks(profile.id, clientId, supabase);
  if (!linksResult.ok) {
    return <ErrorState title="Could not load links." description={linksResult.error.message} />;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <BackLink href={`/dashboard/clients/${clientId}`}>
          Back to {clientResult.data.name}
        </BackLink>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <PageHeader
              title="Edit Profile"
              subtitle="Steps: Identity → Contact → Links → Appearance → Review."
            />
          </div>
          <StatusBadge status={profile.status} />
        </div>
      </div>
      <ProfileLinkPanel slug={profile.slug} status={profile.status} />
      <ProfileEditor
        clientId={clientId}
        clientName={clientResult.data.name}
        profile={profile}
        links={linksResult.data}
        newProfileId={null}
        initialAvatarUrl={publicAssetUrl(supabase, profile.avatar_path)}
        initialCoverUrl={publicAssetUrl(supabase, profile.cover_path)}
        justCreated={query.created === "1"}
        appUrl={getAppUrl()}
      />
    </div>
  );
}
