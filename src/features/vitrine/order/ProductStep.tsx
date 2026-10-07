/**
 * Wizard Step 1 — Your card.
 *
 * A valid preselected product locks the selector; otherwise the visitor
 * picks from all eight. Quantity stepper (min 1) + per-product
 * configuration + fixed catalog price line. No invented prices.
 */

import { Button } from "@/components/ui/Button";
import type { ProductType } from "@/domain/orders/productTypes";
import type { VitrineDict } from "../i18n";
import { allProducts } from "../products";
import { ConfigFields } from "./ConfigFields";
import type { FieldErrors } from "./validate";

export function ProductStep({
  dict,
  product,
  lockedProduct,
  quantity,
  quantityError,
  config,
  errors,
  onProductChange,
  onQuantityChange,
  onConfigChange,
  publishedFlags = null,
  priceLines = null,
}: {
  dict: VitrineDict;
  product: ProductType | null;
  lockedProduct: boolean;
  quantity: number;
  quantityError?: string;
  config: Record<string, unknown>;
  errors: FieldErrors;
  onProductChange: (product: ProductType) => void;
  onQuantityChange: (quantity: number) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
  /** Unpublished products are excluded from the selector (null = all listed). */
  publishedFlags?: Record<ProductType, boolean> | null;
  /** Visible fixed catalog price per product (absent = price not configured). */
  priceLines?: Partial<Record<ProductType, string>> | null;
}) {
  const selectable = allProducts().filter((id) => publishedFlags?.[id] !== false);
  const selectedPriceLine = product ? (priceLines?.[product] ?? null) : null;
  return (
    <div className="space-y-6">
      {!lockedProduct ? (
        <fieldset>
          <legend className="mb-2 block text-base font-bold">
            {dict.order.selectProductTitle}
          </legend>
          <p className="mb-3 text-sm text-muted">{dict.order.selectProductHint}</p>
          <div
            className="grid gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-label={dict.order.selectProductTitle}
          >
            {selectable.map((id) => (
              <label
                key={id}
                className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border p-4 ${
                  product === id ? "border-accent" : "border-border bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="wizard-product"
                  className="mt-1"
                  checked={product === id}
                  onChange={() => onProductChange(id)}
                />
                <span>
                  <span className="block font-medium">{dict.products[id].name}</span>
                  <span className="block text-sm text-muted">{dict.products[id].tagline}</span>
                  {priceLines?.[id] ? (
                    <span className="mt-0.5 block text-sm font-bold text-text">
                      {priceLines[id]}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        product && (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-bold">{dict.products[product].name}</p>
            <p className="text-sm text-muted">{dict.products[product].tagline}</p>
          </div>
        )
      )}

      {product ? (
        <>
          <div>
            <label htmlFor="order-quantity" className="mb-1 block text-sm font-medium">
              {dict.order.quantity} <span aria-hidden="true">*</span>
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                aria-label="−"
                disabled={quantity <= 1}
                onClick={() => onQuantityChange(quantity - 1)}
              >
                −
              </Button>
              <output
                id="order-quantity"
                aria-live="polite"
                className="min-w-10 text-center text-lg font-bold"
              >
                {quantity}
              </output>
              <Button
                type="button"
                variant="secondary"
                size="md"
                aria-label="+"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                +
              </Button>
            </div>
            {quantityError ? (
              <p role="alert" className="mt-1 text-sm text-danger">
                {quantityError}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold">{dict.order.configTitle}</h3>
            <ConfigFields
              dict={dict}
              product={product}
              config={config}
              errors={errors}
              onChange={onConfigChange}
            />
          </div>

          <p className="rounded-xl bg-neutral-muted p-4 text-sm text-muted">
            {selectedPriceLine ? (
              <>
                <span className="block text-base font-bold text-text">{selectedPriceLine}</span>
                {dict.products[product].pricing}
              </>
            ) : (
              <>{dict.order.pricePending}</>
            )}
          </p>
        </>
      ) : null}
    </div>
  );
}
