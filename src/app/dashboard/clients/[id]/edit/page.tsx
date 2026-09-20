import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateClientAction } from "../../actions";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { ClientForm, type ClientFormValues } from "@/features/clients/components/ClientForm";
import { getClientById } from "@/features/clients/service";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Edit Client" };

type EditClientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <ErrorState
        title="Client management is not configured."
        description="Add Supabase keys to .env.local."
      />
    );
  }

  const supabase = await createClient();
  const result = await getClientById(id, supabase);

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED") notFound();
    return <ErrorState title="Could not load the client." description={result.error.message} />;
  }

  const client = result.data;
  const initialValues: ClientFormValues = {
    name: client.name,
    company: client.company ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <BackLink href={`/dashboard/clients/${client.id}`}>Back to {client.name}</BackLink>
        <div className="mt-2">
          <PageHeader title="Edit Client" subtitle={client.name} />
        </div>
      </div>
      <Section title="Client details" description="Only the name is required.">
        <ClientForm
          action={updateClientAction.bind(null, client.id)}
          initialValues={initialValues}
          submitLabel="Save changes"
        />
      </Section>
    </div>
  );
}
