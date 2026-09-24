import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { UnifiedProfileEditor } from "@/features/profiles/components/UnifiedProfileEditor";
import { listProfileLinks } from "@/features/profiles/links";
import { listProfileSections } from "@/features/profiles/sections";
import {
  getProfileByClientId,
  getProfileTemplateColumn,
  resolveProfileTemplate,
} from "@/features/profiles/service";
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

/**
 * Phase 34 unified editor: this page is a thin server loader. Every editing
 * surface (identity, contact + actions, links, sections, appearance, review)
 * and the single live preview live inside `UnifiedProfileEditor`, fed by ONE
 * client-side draft. No page-level cards remain above the editor.
 */
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
  // Sections are tolerant: when the table is unreachable (migration not yet
  // applied), the Sections step shows a notice instead of blocking the editor.
  const sectionsResult = await listProfileSections(profile.id, clientId, supabase);
  // Template metadata is read separately so a missing template column
  // (pre-migration database) can never break profile loading.
  const storedTemplate = await getProfileTemplateColumn(profile.id, supabase);
  const template = resolveProfileTemplate(storedTemplate, profile.profile_type);

  const avatarUrl = publicAssetUrl(supabase, profile.avatar_path);
  const coverUrl = publicAssetUrl(supabase, profile.cover_path);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="max-w-3xl">
        <BackLink href={`/dashboard/clients/${clientId}`}>
          Back to {clientResult.data.name}
        </BackLink>
      </div>
      <UnifiedProfileEditor
        clientId={clientId}
        clientName={clientResult.data.name}
        profile={profile}
        links={linksResult.data}
        sections={sectionsResult.ok ? sectionsResult.data : null}
        template={template}
        newProfileId={null}
        initialAvatarUrl={avatarUrl}
        initialCoverUrl={coverUrl}
        justCreated={query.created === "1"}
        appUrl={getAppUrl()}
        publicCode={typeof profile.public_code === "string" ? profile.public_code : ""}
      />
    </div>
  );
}
