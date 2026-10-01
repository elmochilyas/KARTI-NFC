/**
 * Four-step public order wizard (client state machine).
 *
 * No Order row is created before final submission; going backward
 * preserves values; only the final step writes (via server action).
 * Server validation remains authoritative — client checks are UX only.
 */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ProductType } from "@/domain/orders/productTypes";
import { trackEvent } from "../analytics";
import type { VitrineDict, VitrineLocale } from "../i18n";
import { createPublicOrderAction } from "./actions";
import { CustomerStep } from "./CustomerStep";
import { DeliveryStep } from "./DeliveryStep";
import { OrderProgress } from "./OrderProgress";
import { ProductStep } from "./ProductStep";
import { ReviewStep } from "./ReviewStep";
import {
  resolveWhatsapp,
  validateConfig,
  validateCustomer,
  validateDelivery,
  validateQuantity,
  type CustomerForm,
  type DeliveryForm,
  type FieldErrors,
} from "./validate";

function focusField(field: string): void {
  const direct = document.getElementById(`order-${field}`);
  if (
    direct instanceof HTMLInputElement ||
    direct instanceof HTMLTextAreaElement ||
    direct instanceof HTMLSelectElement
  ) {
    direct.focus();
    return;
  }
  // Radiogroup wrappers carry the `order-*` id on a plain div (not
  // focusable): fall through to the first control inside, or to a named
  // input (e.g. the hasCv radios, which have no `order-*` id).
  const inner =
    direct?.querySelector("input, textarea, select") ??
    document.querySelector(`input[name="${field}"]`);
  if (inner instanceof HTMLElement) inner.focus();
}

function focusFirstError(errors: FieldErrors): void {
  const first = Object.keys(errors)[0];
  if (first) focusField(first);
}

export function OrderWizard({
  locale,
  dict,
  initialProduct,
  publishedFlags = null,
  priceLines = null,
}: {
  locale: VitrineLocale;
  dict: VitrineDict;
  initialProduct: ProductType | null;
  /** Unpublished products are excluded from the selector (null = all listed). */
  publishedFlags?: Record<ProductType, boolean> | null;
  /** Visible catalog price per product (absent = QUOTE, request-price note). */
  priceLines?: Partial<Record<ProductType, string>> | null;
}) {
  const [step, setStep] = useState(0);
  const [product, setProduct] = useState<ProductType | null>(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [config, setConfig] = useState<Record<string, unknown>>(
    initialProduct === "CAREER_CARD"
      ? { hasCv: false }
      : initialProduct === "GOOGLE_REVIEW_CARD"
        ? { needsUrlHelp: false }
        : {},
  );
  const [customer, setCustomer] = useState<CustomerForm>({
    fullName: "",
    phone: "",
    sameWhatsapp: true,
    whatsapp: "",
    email: "",
    preferredContact: "WHATSAPP",
  });
  const [delivery, setDelivery] = useState<DeliveryForm>({
    city: "",
    address: "",
    instructions: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Minted once per wizard instance; reused across retries, rotated only
  // when a fresh wizard mounts (prevents double-submit duplicates).
  const [idempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-000000000000",
  );
  const [startedAt] = useState<number>(() => Date.now());
  const [honeypot, setHoneypot] = useState("");

  // Funnel telemetry only — no PII, no behavior change.
  useEffect(() => {
    trackEvent("order_started", { product: initialProduct, locale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockedProduct = initialProduct !== null;

  function handleProductChange(next: ProductType): void {
    setProduct(next);
    setConfig(
      next === "CAREER_CARD"
        ? { hasCv: false }
        : next === "GOOGLE_REVIEW_CARD"
          ? { needsUrlHelp: false }
          : {},
    );
    setErrors({});
    setStepMessage(null);
  }

  function continueFromCard(): void {
    if (!product) {
      setStepMessage(dict.order.errors.checkHighlighted);
      return;
    }
    if (!validateQuantity(quantity)) {
      setStepMessage(dict.order.validation.quantityMin);
      return;
    }
    const checked = validateConfig(product, config);
    if (!checked.ok) {
      setErrors(checked.errors);
      setStepMessage(dict.order.errors.checkHighlighted);
      focusFirstError(checked.errors);
      return;
    }
    setErrors({});
    setStepMessage(null);
    trackEvent("order_step_completed", { step: 0, product, locale });
    trackEvent("order_product_selected", { product, locale });
    trackEvent("order_quantity_changed", { product, quantity, locale });
    trackEvent("order_step_viewed", { step: 1, locale });
    setStep(1);
  }

  function continueFromDetails(): void {
    const found = validateCustomer(customer);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStepMessage(dict.order.errors.checkHighlighted);
      focusFirstError(found);
      return;
    }
    setErrors({});
    setStepMessage(null);
    trackEvent("order_step_completed", { step: 1, locale });
    trackEvent("order_step_viewed", { step: 2, locale });
    setStep(2);
  }

  function continueFromDelivery(): void {
    const found = validateDelivery(delivery);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStepMessage(dict.order.errors.checkHighlighted);
      focusFirstError(found);
      return;
    }
    setErrors({});
    setStepMessage(null);
    trackEvent("order_step_completed", { step: 2, locale });
    trackEvent("order_step_viewed", { step: 3, locale });
    setStep(3);
  }

  async function submit(): Promise<void> {
    if (!product || submitting) return;
    // Revalidate everything at submit time; never trust step state alone.
    const checkedConfig = validateConfig(product, config);
    const customerErrors = validateCustomer(customer);
    const deliveryErrors = validateDelivery(delivery);
    const merged: FieldErrors = {
      ...(checkedConfig.ok ? {} : checkedConfig.errors),
      ...customerErrors,
      ...deliveryErrors,
    };
    if (!checkedConfig.ok || Object.keys(merged).length > 0 || !validateQuantity(quantity)) {
      setErrors(merged);
      setSubmitError(dict.order.errors.checkHighlighted);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    trackEvent("order_submit_attempted", { product, quantity, locale });
    try {
      const result = await createPublicOrderAction({
        locale,
        productType: product,
        quantity,
        configuration: checkedConfig.data,
        customer: {
          fullName: customer.fullName.trim(),
          phone: customer.phone.trim(),
          whatsapp: resolveWhatsapp(customer),
          email: customer.email.trim(),
          preferredContact: customer.preferredContact,
        },
        delivery: {
          city: delivery.city.trim(),
          address: delivery.address.trim(),
          instructions: delivery.instructions.trim(),
        },
        idempotencyKey: idempotencyKey,
        website: honeypot,
        startedAt: startedAt,
      });
      if (result.ok) {
        trackEvent("order_submitted", { product, quantity, locale });
        const params = new URLSearchParams({
          r: result.data.orderNumber,
          t: result.data.receiptToken,
        });
        // Full-page load (not SPA navigation): the receipt URL carries a
        // private credential and GTM/GA4 must never observe it — not even
        // as an automatic `page_location` on a history change. The success
        // route boots a clean document with analytics fully suppressed.
        // `order_submitted` is queued synchronously above, before leaving.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard navigation, see above
        window.location.assign(`/${locale}/order/success?${params.toString()}`);
        return;
      }
      // Keep the same idempotency key so a retry reuses the receipt
      // if the order actually committed server-side.
      trackEvent("order_submit_failed", { product, code: result.error.code, locale });
      setSubmitError(
        result.error.code === "VALIDATION"
          ? dict.order.errors.checkHighlighted
          : dict.order.errors.submitFailed,
      );
    } catch {
      trackEvent("order_submit_failed", { product, code: "exception", locale });
      setSubmitError(dict.order.errors.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-card md:p-6">
        <OrderProgress dict={dict} step={step} />
      </div>

      <div aria-live="polite">
        {stepMessage ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-danger/25 bg-danger-muted p-4 text-sm font-medium text-danger"
          >
            {stepMessage}
          </p>
        ) : null}
        {submitError ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-danger/25 bg-danger-muted p-4 text-sm font-medium text-danger"
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-5 shadow-card md:p-7">
        {step === 0 ? (
          <ProductStep
            dict={dict}
            product={product}
            lockedProduct={lockedProduct}
            quantity={quantity}
            config={config}
            errors={errors}
            onProductChange={handleProductChange}
            onQuantityChange={setQuantity}
            onConfigChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            publishedFlags={publishedFlags}
            priceLines={priceLines}
          />
        ) : null}
        {step === 1 ? (
          <CustomerStep
            dict={dict}
            form={customer}
            errors={errors}
            onChange={(patch) => setCustomer((prev) => ({ ...prev, ...patch }))}
          />
        ) : null}
        {step === 2 ? (
          <DeliveryStep
            dict={dict}
            form={delivery}
            errors={errors}
            onChange={(patch) => setDelivery((prev) => ({ ...prev, ...patch }))}
          />
        ) : null}
        {step === 3 && product ? (
          <ReviewStep
            dict={dict}
            product={product}
            productName={dict.products[product].name}
            quantity={quantity}
            config={config}
            customer={customer}
            customerWhatsapp={resolveWhatsapp(customer)}
            delivery={delivery}
            onEdit={setStep}
            priceLine={priceLines?.[product] ?? null}
          />
        ) : null}
      </div>

      {/* Honeypot: invisible to humans, must stay empty. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
            {dict.order.back}
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              if (step === 0) continueFromCard();
              else if (step === 1) continueFromDetails();
              else continueFromDelivery();
            }}
          >
            {dict.order.continue}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            loading={submitting}
            onClick={() => void submit()}
          >
            {submitting ? dict.order.review.submitting : dict.order.review.sendRequest}
          </Button>
        )}
      </div>
    </div>
  );
}
