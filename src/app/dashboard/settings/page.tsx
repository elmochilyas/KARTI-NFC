import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Settings" };

/** Placeholder — operational settings arrive in later phases. */
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Workspace preferences and configuration." />
      <EmptyState
        title="Nothing to configure yet"
        description="Workspace settings will live here. Client, profile, and card setup are already available from the navigation."
      />
    </div>
  );
}
