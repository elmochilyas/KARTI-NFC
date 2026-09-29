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
import { WhatsappCta } from "../marketing/Trackers";
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
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center md:p-10">
        <p
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-3xl font-bold text-accent-contrast"
        >
          ✓
        </p>
        <h1 className="mx-auto mt-5 max-w-md text-3xl font-bold tracking-tight text-text">
          {dict.success.title}
        </h1>
        <dl className="mx-auto mt-6 max-w-md divide-y divide-border rounded-2xl bg-surface-muted/60 px-5 py-2 text-start">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted">{dict.success.orderLabel}</dt>
            <dd className="font-bold break-words">{receipt.orderNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted">{dict.success.productLabel}</dt>
            <dd className="text-end font-medium">{productName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-muted">{dict.success.quantityLabel}</dt>
            <dd className="font-medium">{receipt.quantity}</dd>
          </div>
        </dl>
        <p className="mx-auto mt-5 max-w-md text-[15px] text-muted">{dict.success.nextSteps}</p>
        <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          {whatsappHref ? (
            <WhatsappCta
              href={whatsappHref}
              context="order-success"
              className="inline-flex min-h-14 flex-1 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-contrast"
            >
              {dict.success.whatsappCta}
            </WhatsappCta>
          ) : null}
          <Link
            href={base}
            className="inline-flex min-h-14 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-medium"
          >
            {dict.success.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
