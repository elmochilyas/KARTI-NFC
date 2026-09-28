/**
 * Minimal public receipt (server-rendered).
 *
 * Safe summary only: order number, product, quantity, next steps,
 * WhatsApp continuation. Never address, contact details, notes,
 * attribution, or linked IDs. Invalid tokens get one generic message
 * (no existence leak). Refresh-safe.
 */

import Link from "next/link";
import { getSalesWhatsapp } from "@/lib/env-server";
import type { VitrineDict, VitrineLocale } from "../i18n";
import { buildOrderWhatsappLink } from "../whatsapp";
import { getPublicReceipt } from "./receiptLookup";

export async function OrderSuccess({
  locale,
  dict,
  orderNumber,
  token,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  orderNumber: string | undefined;
  token: string | undefined;
}) {
  const base = `/${locale}`;
  const receipt = await getPublicReceipt(orderNumber, token);

  if (!receipt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="text-xl font-bold">{dict.success.invalidTitle}</h1>
          <p className="mt-2 text-muted">{dict.success.invalidMessage}</p>
          <Link
            href={base}
            className="mt-4 inline-flex min-h-11 items-center font-medium text-accent"
          >
            {dict.success.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const productName = dict.products[receipt.productType].name;
  const whatsappHref = buildOrderWhatsappLink({
    salesDigits: getSalesWhatsapp() ?? "",
    template: dict.success.whatsappMessage,
    orderNumber: receipt.orderNumber,
    quantity: receipt.quantity,
    productName,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-xl border border-border bg-surface p-6">
        <p aria-hidden="true" className="text-2xl text-accent">
          ✓
        </p>
        <h1 className="mt-1 text-2xl font-bold">{dict.success.title}</h1>
        <dl className="mt-4 space-y-2">
          <div className="flex gap-2">
            <dt className="text-muted">{dict.success.orderLabel}:</dt>
            <dd className="font-bold">{receipt.orderNumber}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{dict.success.productLabel}:</dt>
            <dd>{productName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">{dict.success.quantityLabel}:</dt>
            <dd>{receipt.quantity}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">{dict.success.nextSteps}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-contrast"
            >
              {dict.success.whatsappCta}
            </a>
          ) : null}
          <Link
            href={base}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-6 font-medium"
          >
            {dict.success.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
