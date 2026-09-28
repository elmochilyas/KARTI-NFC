import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/dashboard/BackLink";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ErrorState } from "@/components/ui/states";
import {
  AttributionSection,
  CustomerSection,
  DeliverySection,
  FulfillmentSection,
  NotesSection,
  OrderActionsBar,
  PaymentSection,
  ProductSection,
  RelatedSection,
  TimelineSection,
} from "@/features/orders/components/OrderSections";
import { getOrderDetail } from "@/features/orders/service";
import { productDisplayName } from "@/features/orders/productNames";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isProductType } from "@/domain/orders";

export const metadata: Metadata = { title: "Order" };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <BackLink href="/dashboard/orders">Orders</BackLink>
        <ErrorState
          title="Order management is not configured."
          description="Add Supabase keys to .env.local to load this order."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const result = await getOrderDetail(id, supabase);

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED") {
      notFound();
    }
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <BackLink href="/dashboard/orders">Orders</BackLink>
        <ErrorState title="We couldn't load this order." description={result.error.message} />
      </div>
    );
  }

  const { order, items } = result.data;
  const firstProduct =
    items.length > 0 && isProductType(items[0].product_type) ? items[0].product_type : null;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <BackLink href="/dashboard/orders">Orders</BackLink>
      <PageHeader
        title={order.order_number}
        subtitle={`Created ${formatDate(order.created_at)} · ${order.channel === "WEBSITE" ? "Website" : "Dashboard"} order · ${order.locale.toUpperCase()}`}
        actions={<StatusBadge status={order.status} />}
      />
      <p className="-mt-4 text-sm text-muted">
        {firstProduct ? productDisplayName(firstProduct) : "Unknown product"}
        {totalQuantity > 0 ? ` ×${totalQuantity}` : ""}
      </p>

      <OrderActionsBar detail={result.data} />

      <CustomerSection detail={result.data} />
      <ProductSection detail={result.data} />
      <DeliverySection detail={result.data} />
      <PaymentSection detail={result.data} />
      <FulfillmentSection detail={result.data} />
      <NotesSection detail={result.data} />
      <AttributionSection detail={result.data} />
      <RelatedSection detail={result.data} />
      <TimelineSection detail={result.data} />

      <p className="text-sm text-muted">
        <Link href="/dashboard/orders" className="underline">
          Back to all orders
        </Link>
      </p>
    </div>
  );
}
