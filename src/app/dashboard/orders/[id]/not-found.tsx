import Link from "next/link";
import { BackLink } from "@/components/dashboard/BackLink";

export default function OrderNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <BackLink href="/dashboard/orders">Orders</BackLink>
      <h1 className="text-xl font-bold">Order not found</h1>
      <p className="text-sm text-muted">
        This order does not exist or you do not have access to it.
      </p>
      <Link
        href="/dashboard/orders"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium"
      >
        Back to Orders
      </Link>
    </div>
  );
}
