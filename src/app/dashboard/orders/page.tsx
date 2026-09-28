import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/dashboard/Section";
import { EmptyState, ErrorState } from "@/components/ui/states";
import {
  InquiriesFilterForm,
  OrdersFilterForm,
  OrdersTabs,
  OrderViews,
} from "@/features/orders/components/OrdersFilterBar";
import { InquiryCard } from "@/features/orders/components/OrderForms";
import { OrdersTable } from "@/features/orders/components/OrdersTable";
import { Pagination } from "@/features/orders/components/Pagination";
import { SummaryTiles } from "@/features/orders/components/SummaryTiles";
import { parseOrdersQuery } from "@/features/orders/params";
import { getOrdersSummary, listInquiries, listOrders } from "@/features/orders/service";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orders" };

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function OrdersWorkspace({
  query,
  summary,
  list,
}: {
  query: ReturnType<typeof parseOrdersQuery>;
  summary: Awaited<ReturnType<typeof getOrdersSummary>>;
  list: Awaited<ReturnType<typeof listOrders>>;
}) {
  const filtering =
    query.q !== "" ||
    query.product !== null ||
    query.payment !== null ||
    query.fulfillment !== null ||
    query.source !== null;
  return (
    <div className="flex flex-col gap-6">
      {summary.ok ? (
        <SummaryTiles summary={summary.data} />
      ) : (
        <ErrorState title="We couldn't load order counts." description={summary.error.message} />
      )}
      <OrderViews query={query} />
      <OrdersFilterForm query={query} />
      {list.ok ? (
        list.data.rows.length === 0 ? (
          <EmptyState
            title={filtering || query.view !== "all" ? "No orders match" : "No orders yet"}
            description={
              filtering || query.view !== "all"
                ? "Try a different search or reset the filters."
                : "Website orders will appear here once visitors submit them."
            }
            action={
              filtering || query.view !== "all" ? (
                <Link
                  href="/dashboard/orders"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium"
                >
                  Clear filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Section title={`${list.data.total} order${list.data.total === 1 ? "" : "s"}`}>
            <div className="overflow-x-auto">
              <OrdersTable rows={list.data.rows} />
            </div>
            <div className="mt-4">
              <Pagination query={query} totalPages={list.data.totalPages} />
            </div>
          </Section>
        )
      ) : (
        <ErrorState title="We couldn't load orders." description={list.error.message} />
      )}
    </div>
  );
}

function InquiriesWorkspace({
  query,
  list,
}: {
  query: ReturnType<typeof parseOrdersQuery>;
  list: Awaited<ReturnType<typeof listInquiries>>;
}) {
  const filtering = query.q !== "" || query.istatus !== null;
  return (
    <div className="flex flex-col gap-6">
      <InquiriesFilterForm query={query} />
      {list.ok ? (
        list.data.rows.length === 0 ? (
          <EmptyState
            title="No inquiries"
            description={
              filtering
                ? "Try a different search or reset the filters."
                : "Website inquiries will appear here once visitors write in."
            }
            action={
              filtering ? (
                <Link
                  href="/dashboard/orders?tab=inquiries"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium"
                >
                  Clear filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Section title={`${list.data.total} ${list.data.total === 1 ? "inquiry" : "inquiries"}`}>
            <ul className="flex flex-col gap-3">
              {list.data.rows.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </ul>
            <div className="mt-4">
              <Pagination query={query} totalPages={list.data.totalPages} />
            </div>
          </Section>
        )
      ) : (
        <ErrorState title="We couldn't load inquiries." description={list.error.message} />
      )}
    </div>
  );
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const query = parseOrdersQuery(await searchParams);

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Orders" subtitle="Website orders and inquiries." />
        <ErrorState
          title="Order management is not configured."
          description="Add Supabase keys to .env.local to load orders."
        />
      </div>
    );
  }

  const supabase = await createClient();

  if (query.tab === "inquiries") {
    const list = await listInquiries(query, supabase);
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Orders" subtitle="Website orders and inquiries." />
        <OrdersTabs query={query} />
        <InquiriesWorkspace query={query} list={list} />
      </div>
    );
  }

  const [summary, list] = await Promise.all([
    getOrdersSummary(supabase),
    listOrders(query, supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders" subtitle="Website orders and inquiries." />
      <OrdersTabs query={query} />
      <OrdersWorkspace query={query} summary={summary} list={list} />
    </div>
  );
}
