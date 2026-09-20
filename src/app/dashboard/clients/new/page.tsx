import type { Metadata } from "next";
import { createClientAction } from "../actions";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { ClientForm } from "@/features/clients/components/ClientForm";

export const metadata: Metadata = { title: "New Client" };

export default function NewClientPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <BackLink href="/dashboard/clients">Back to Clients</BackLink>
        <div className="mt-2">
          <PageHeader
            title="New Client"
            subtitle="Add a customer. Steps after this: create their profile, then configure their NFC card."
          />
        </div>
      </div>
      <Section title="Client details" description="Only the name is required.">
        <ClientForm action={createClientAction} submitLabel="Create client" />
      </Section>
    </div>
  );
}
