import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ACQUISITION_SOURCES,
  FULFILLMENT_STATUSES,
  humanizeStatusValue,
  PAYMENT_STATUSES,
  PRODUCT_TYPES,
} from "@/domain/orders";
import { ORDER_VIEWS, type OrdersQuery } from "../params";
import { productDisplayName } from "../productNames";
import { buildOrdersUrl } from "../urls";

const VIEW_LABELS: Record<(typeof ORDER_VIEWS)[number], string> = {
  all: "All",
  new: "New",
  "needs-action": "Needs action",
  "in-progress": "In progress",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrdersTabs({ query }: { query: OrdersQuery }) {
  return (
    <nav aria-label="Orders sections" className="flex gap-2">
      <Link
        href="/dashboard/orders"
        aria-current={query.tab === "orders" ? "page" : undefined}
        className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold ${
          query.tab === "orders" ? "bg-text text-background" : "border border-border bg-surface"
        }`}
      >
        Orders
      </Link>
      <Link
        href="/dashboard/orders?tab=inquiries"
        aria-current={query.tab === "inquiries" ? "page" : undefined}
        className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold ${
          query.tab === "inquiries" ? "bg-text text-background" : "border border-border bg-surface"
        }`}
      >
        Inquiries
      </Link>
    </nav>
  );
}

export function OrderViews({ query }: { query: OrdersQuery }) {
  return (
    <nav aria-label="Order views" className="flex flex-wrap gap-2">
      {ORDER_VIEWS.map((view) => {
        const active = query.view === view;
        return (
          <Link
            key={view}
            href={buildOrdersUrl(query, { view, page: 1 })}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-medium ${
              active ? "border-text bg-text text-background" : "border-border bg-surface"
            }`}
          >
            {VIEW_LABELS[view]}
          </Link>
        );
      })}
    </nav>
  );
}

export function OrdersFilterForm({ query }: { query: OrdersQuery }) {
  const filtering =
    query.q !== "" ||
    query.product !== null ||
    query.payment !== null ||
    query.fulfillment !== null ||
    query.source !== null;
  return (
    <form
      action="/dashboard/orders"
      method="get"
      role="search"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="tab" value="orders" />
      <input type="hidden" name="view" value={query.view} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <Input
            id="order-search"
            name="q"
            type="search"
            placeholder="Order number, name, phone, email…"
            defaultValue={query.q}
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <label htmlFor="order-product" className="sr-only">
            Product
          </label>
          <Select id="order-product" name="product" defaultValue={query.product ?? ""}>
            <option value="">All products</option>
            {PRODUCT_TYPES.map((product) => (
              <option key={product} value={product}>
                {productDisplayName(product)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="order-payment" className="sr-only">
            Payment status
          </label>
          <Select id="order-payment" name="payment" defaultValue={query.payment ?? ""}>
            <option value="">Any payment</option>
            {PAYMENT_STATUSES.map((payment) => (
              <option key={payment} value={payment}>
                {humanizeStatusValue(payment)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="order-fulfillment" className="sr-only">
            Fulfillment status
          </label>
          <Select id="order-fulfillment" name="fulfillment" defaultValue={query.fulfillment ?? ""}>
            <option value="">Any fulfillment</option>
            {FULFILLMENT_STATUSES.map((fulfillment) => (
              <option key={fulfillment} value={fulfillment}>
                {humanizeStatusValue(fulfillment)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="order-source" className="sr-only">
            Acquisition source
          </label>
          <Select id="order-source" name="source" defaultValue={query.source ?? ""}>
            <option value="">Any source</option>
            {ACQUISITION_SOURCES.map((source) => (
              <option key={source} value={source}>
                {humanizeStatusValue(source)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {filtering ? (
        <div>
          <Link
            href={buildOrdersUrl(query, {
              q: "",
              page: 1,
              product: null,
              payment: null,
              fulfillment: null,
              source: null,
            })}
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline"
          >
            Clear search and filters
          </Link>
        </div>
      ) : null}
    </form>
  );
}

export function InquiriesFilterForm({ query }: { query: OrdersQuery }) {
  return (
    <form
      action="/dashboard/orders"
      method="get"
      role="search"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <input type="hidden" name="tab" value="inquiries" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="inquiry-search" className="sr-only">
            Search inquiries
          </label>
          <Input
            id="inquiry-search"
            name="q"
            type="search"
            placeholder="Name, company, phone, email, message…"
            defaultValue={query.q}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="inquiry-status" className="sr-only">
            Inquiry status
          </label>
          <Select id="inquiry-status" name="istatus" defaultValue={query.istatus ?? ""}>
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="CLOSED">Closed</option>
            <option value="SPAM">Spam</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </div>
      {query.q !== "" || query.istatus !== null ? (
        <div>
          <Link
            href="/dashboard/orders?tab=inquiries"
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline"
          >
            Clear search and filters
          </Link>
        </div>
      ) : null}
    </form>
  );
}
