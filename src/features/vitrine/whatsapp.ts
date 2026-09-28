/**
 * Centralized sales-WhatsApp continuation links (spec 02 §17).
 *
 * The sales number lives in server-only env (`KARTI_SALES_WHATSAPP`);
 * this pure builder turns it into an encoded wa.me link. No hardcoded
 * numbers in components. When unconfigured, callers hide the CTA.
 */

export function buildOrderWhatsappLink(args: {
  salesDigits: string;
  template: string;
  orderNumber: string;
  quantity: number;
  productName: string;
}): string | null {
  const digits = args.salesDigits.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  const message = args.template
    .replace("{order}", args.orderNumber)
    .replace("{qty}", String(args.quantity))
    .replace("{product}", args.productName);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
