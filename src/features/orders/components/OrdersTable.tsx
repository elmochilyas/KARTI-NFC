import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { attentionLabel, deriveOrderAttention, formatMinorToMad } from "@/domain/orders";
import type { OrderListItem } from "../types";
import { productDisplayName } from "../productNames";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function TotalCell({ row }: { row: OrderListItem }) {
  return (
    <span className="text-sm font-semibold tabular-nums">{formatMinorToMad(row.totalMinor)}</span>
  );
}

function StageCell({ row }: { row: OrderListItem }) {
  const attention = deriveOrderAttention({
    status: row.status,
    fulfillmentStatus: row.fulfillmentStatus,
  });
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge status={row.status} />
      {attention.state === "NEEDS_OPERATOR_ACTION" || attention.state === "WAITING_CUSTOMER" ? (
        <span className="text-xs text-muted">{attentionLabel(attention)}</span>
      ) : null}
    </span>
  );
}

export function OrdersTable({ rows }: { rows: OrderListItem[] }) {
  return (
    <>
      <table className="hidden w-full md:table">
        <caption className="sr-only">Website orders</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-3 py-2 font-semibold">
              Order
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Customer
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Product
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Total
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Payment
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Stage
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-3 py-3">
                <Link
                  href={`/dashboard/orders/${row.id}`}
                  className="inline-flex min-h-11 items-center font-semibold underline"
                >
                  {row.orderNumber}
                </Link>
              </td>
              <td className="px-3 py-3">
                <span className="block text-sm font-medium">{row.customerName}</span>
                <span className="block text-xs text-muted">{row.phone}</span>
              </td>
              <td className="px-3 py-3 text-sm">
                {productDisplayName(row.productType)}
                {row.quantity > 0 ? <span className="text-muted"> ×{row.quantity}</span> : null}
              </td>
              <td className="px-3 py-3">
                <TotalCell row={row} />
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={row.paymentStatus} />
              </td>
              <td className="px-3 py-3">
                <StageCell row={row} />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-sm text-muted">
                {formatDate(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/dashboard/orders/${row.id}`}
              className="flex min-h-11 items-center justify-between gap-3 px-1 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{row.orderNumber}</span>
                <span className="block truncate text-sm text-muted">
                  {row.customerName} · {productDisplayName(row.productType)}
                  {row.quantity > 0 ? ` ×${row.quantity}` : ""}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {formatMinorToMad(row.totalMinor)} · {formatDate(row.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge status={row.status} />
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
