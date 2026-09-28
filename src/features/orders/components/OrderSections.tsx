import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Section } from "@/components/dashboard/Section";
import {
  attentionLabel,
  deriveOrderAttention,
  formatMinorToMad,
  formatOrderConfiguration,
  humanizeStatusValue,
  isFulfillmentStatus,
  isPaymentStatus,
  isPricingStatus,
  isProductType,
  orderEventActorLabel,
  orderEventLabel,
} from "@/domain/orders";
import type { ProductType } from "@/domain/orders";
import type { OrderDetail } from "../types";
import { productDisplayName } from "../productNames";
import {
  CancelOrderDialog,
  CompleteOrderButton,
  ConfirmOrderButton,
  FulfillmentForm,
  MarkContactedButton,
  NoteForm,
  PaymentForm,
  QuoteForm,
} from "./OrderForms";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Operator → customer WhatsApp link carrying the order number. */
function operatorWhatsappLink(phone: string | null, orderNumber: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  const text = encodeURIComponent(`Hello, regarding your Karti order ${orderNumber}.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function OrderActionsBar({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  if (order.status === "COMPLETED" || order.status === "CANCELLED") return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {order.status === "NEW" ? (
        <MarkContactedButton orderId={order.id} expectedStatus={order.status} />
      ) : null}
      {order.status === "CONTACTED" ? (
        <ConfirmOrderButton orderId={order.id} expectedStatus={order.status} />
      ) : null}
      {order.status === "IN_PROGRESS" ? (
        <CompleteOrderButton orderId={order.id} expectedStatus={order.status} />
      ) : null}
      <CancelOrderDialog orderId={order.id} expectedStatus={order.status} />
    </div>
  );
}

export function CustomerSection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  const whatsappNumber = order.whatsapp ?? order.phone;
  const whatsappLink = operatorWhatsappLink(whatsappNumber, order.order_number);
  return (
    <Section title="Customer">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Name</dt>
          <dd className="font-medium">{order.customer_name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Phone</dt>
          <dd>
            <a className="underline" href={`tel:${order.phone}`}>
              {order.phone}
            </a>
          </dd>
        </div>
        {order.whatsapp ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">WhatsApp</dt>
            <dd>{order.whatsapp}</dd>
          </div>
        ) : null}
        {order.email ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Email</dt>
            <dd className="min-w-0 truncate">
              <a className="underline" href={`mailto:${order.email}`}>
                {order.email}
              </a>
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Preferred contact</dt>
          <dd>{humanizeStatusValue(order.preferred_contact)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-text px-4 text-sm font-semibold text-background"
          >
            WhatsApp
          </a>
        ) : null}
        <a
          href={`tel:${order.phone}`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold"
        >
          Call
        </a>
        {order.email ? (
          <a
            href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Karti order ${order.order_number}`)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-semibold"
          >
            Email
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted">
        Contact links never change the order — use “Mark contacted” to record first contact.
      </p>
    </Section>
  );
}

export function ProductSection({ detail }: { detail: OrderDetail }) {
  return (
    <Section title="Product">
      {detail.items.length === 0 ? (
        <p className="text-sm text-muted">No items on this order.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {detail.items.map((item) => {
            const productType: ProductType | null = isProductType(item.product_type)
              ? item.product_type
              : null;
            const lines =
              productType === null ? [] : formatOrderConfiguration(productType, item.configuration);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <p className="text-sm font-semibold">
                  {productDisplayName(productType)}
                  <span className="font-normal text-muted"> ×{item.quantity}</span>
                </p>
                {lines.length > 0 ? (
                  <dl className="flex flex-col gap-1 text-sm">
                    {lines.map((line) => (
                      <div key={line.label} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-muted">{line.label}</dt>
                        <dd className="min-w-0 break-words text-right">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {item.unit_price_minor !== null || item.line_total_minor !== null ? (
                  <p className="text-xs text-muted">
                    {item.unit_price_minor !== null
                      ? `Unit ${formatMinorToMad(item.unit_price_minor)}`
                      : ""}
                    {item.unit_price_minor !== null && item.line_total_minor !== null ? " · " : ""}
                    {item.line_total_minor !== null
                      ? `Line ${formatMinorToMad(item.line_total_minor)}`
                      : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export function DeliverySection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  return (
    <Section title="Delivery">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">City</dt>
          <dd className="font-medium">{order.city}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted">Address</dt>
          <dd className="break-words">{order.delivery_address}</dd>
        </div>
        {order.delivery_notes ? (
          <div className="flex flex-col gap-1">
            <dt className="text-muted">Instructions</dt>
            <dd className="whitespace-pre-wrap break-words">{order.delivery_notes}</dd>
          </div>
        ) : null}
      </dl>
    </Section>
  );
}

export function PaymentSection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  const terminal = order.status === "COMPLETED" || order.status === "CANCELLED";
  return (
    <Section title="Payment & quote">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Pricing</dt>
          <dd>
            <StatusBadge status={order.pricing_status} />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatMinorToMad(order.subtotal_minor)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Delivery</dt>
          <dd className="tabular-nums">{formatMinorToMad(order.delivery_fee_minor)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Discount</dt>
          <dd className="tabular-nums">{formatMinorToMad(order.discount_minor)}</dd>
        </div>
        <div className="flex justify-between gap-3 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">
            {order.pricing_status === "QUOTE_REQUIRED"
              ? "Quote required"
              : formatMinorToMad(order.total_minor)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Payment</dt>
          <dd>
            <StatusBadge status={order.payment_status} />
          </dd>
        </div>
      </dl>
      {!terminal ? (
        <div className="mt-4 flex flex-col gap-5 border-t border-border pt-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {order.pricing_status === "PRICED" ? "Revise quote" : "Set quote"}
            </h3>
            <QuoteForm
              orderId={order.id}
              expectedUpdatedAt={order.updated_at}
              current={{
                subtotalMinor: order.subtotal_minor,
                deliveryFeeMinor: order.delivery_fee_minor,
                discountMinor: order.discount_minor,
              }}
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Update payment</h3>
            {isPaymentStatus(order.payment_status) &&
            (order.payment_status === "PENDING" ||
              order.payment_status === "PARTIALLY_PAID" ||
              order.payment_status === "PAID") ? (
              <PaymentForm orderId={order.id} expectedPayment={order.payment_status} />
            ) : (
              <p className="text-sm text-muted">No further payment transitions available.</p>
            )}
          </div>
        </div>
      ) : null}
    </Section>
  );
}

export function FulfillmentSection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  const terminal = order.status === "COMPLETED" || order.status === "CANCELLED";
  const attention =
    isPricingStatus(order.pricing_status) &&
    isFulfillmentStatus(order.fulfillment_status) &&
    (order.status === "NEW" ||
      order.status === "CONTACTED" ||
      order.status === "CONFIRMED" ||
      order.status === "IN_PROGRESS" ||
      order.status === "COMPLETED" ||
      order.status === "CANCELLED")
      ? deriveOrderAttention({
          status: order.status,
          pricingStatus: order.pricing_status,
          fulfillmentStatus: order.fulfillment_status,
        })
      : null;
  return (
    <Section title="Fulfillment">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">Stage</span>
          <StatusBadge status={order.fulfillment_status} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">Order status</span>
          <StatusBadge status={order.status} />
        </div>
        {attention ? <p className="text-sm text-muted">{attentionLabel(attention)}</p> : null}
      </div>
      {!terminal &&
      isFulfillmentStatus(order.fulfillment_status) &&
      order.fulfillment_status !== "DELIVERED" ? (
        <div className="mt-4 border-t border-border pt-4">
          <FulfillmentForm orderId={order.id} expectedFulfillment={order.fulfillment_status} />
          {order.status === "CONFIRMED" ? (
            <p className="mt-2 text-xs text-muted">
              Moving fulfillment forward also moves the order to In progress.
            </p>
          ) : null}
        </div>
      ) : null}
      {order.fulfillment_status === "NFC_CONFIGURATION" ? (
        <p className="mt-3 text-xs text-muted">
          NFC configuration is operational tracking only in this phase — no cards are provisioned
          from orders yet.
        </p>
      ) : null}
    </Section>
  );
}

export function NotesSection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  return (
    <>
      <Section title="Internal notes" description="Operator-only. Never shown to customers.">
        {order.internal_notes ? (
          <p className="whitespace-pre-wrap break-words text-sm">{order.internal_notes}</p>
        ) : (
          <p className="text-sm text-muted">No internal notes yet.</p>
        )}
        <div className="mt-3">
          <NoteForm
            orderId={order.id}
            expectedUpdatedAt={order.updated_at}
            kind="internal"
            initialValue={order.internal_notes}
          />
        </div>
      </Section>
      <Section title="Customer notes" description="Requirements supplied with the order.">
        {order.customer_notes ? (
          <p className="whitespace-pre-wrap break-words text-sm">{order.customer_notes}</p>
        ) : (
          <p className="text-sm text-muted">No customer notes.</p>
        )}
        <div className="mt-3">
          <NoteForm
            orderId={order.id}
            expectedUpdatedAt={order.updated_at}
            kind="customer"
            initialValue={order.customer_notes}
          />
        </div>
      </Section>
    </>
  );
}

export function AttributionSection({ detail }: { detail: OrderDetail }) {
  const { order } = detail;
  const rows: Array<[string, string | null]> = [
    ["First source", order.first_touch_source],
    ["First landing page", order.first_landing_path],
    ["First campaign", order.first_utm_campaign],
    ["First referrer", order.first_referrer],
    ["Conversion page", order.conversion_path],
    ["Last source", order.last_touch_source],
    ["Last campaign", order.last_utm_campaign],
  ];
  const visible = rows.filter(([, value]) => value !== null && value !== "");
  if (visible.length === 0) return null;
  return (
    <Section title="Attribution">
      <dl className="flex flex-col gap-2 text-sm">
        {visible.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function RelatedSection({ detail }: { detail: OrderDetail }) {
  const { client, profiles, cards } = detail;
  return (
    <Section title="Related records" description="Client conversion arrives in Phase 4.">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Client</dt>
          <dd>
            {client ? (
              <Link href={`/dashboard/clients/${client.id}`} className="font-medium underline">
                {client.name}
              </Link>
            ) : (
              <span className="text-muted">Not linked yet</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Profiles</dt>
          <dd>
            {profiles.length > 0 ? (
              <span>{profiles.map((profile) => profile.displayName).join(", ")}</span>
            ) : (
              <span className="text-muted">Not linked yet</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Cards</dt>
          <dd>
            {cards.length > 0 ? (
              <span className="flex flex-col items-end gap-1">
                {cards.map((card) => (
                  <Link key={card.id} href={`/dashboard/cards/${card.id}`} className="underline">
                    {card.cardNumber}
                  </Link>
                ))}
              </span>
            ) : (
              <span className="text-muted">Not linked yet</span>
            )}
          </dd>
        </div>
      </dl>
    </Section>
  );
}

export function TimelineSection({ detail }: { detail: OrderDetail }) {
  return (
    <Section title="Timeline">
      {detail.events.length === 0 ? (
        <p className="text-sm text-muted">No events yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {detail.events.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
              <p className="text-sm font-medium">
                {orderEventLabel(event.event_type, event.from_value, event.to_value)}
              </p>
              <p className="text-xs text-muted">
                {orderEventActorLabel(event.actor_type)} · {formatDateTime(event.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
