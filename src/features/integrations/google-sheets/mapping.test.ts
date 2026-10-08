import { describe, expect, it } from "vitest";
import {
  buildDeliverySheetRow,
  hashSheetValues,
  minorToMajorNumber,
  sheetProductName,
} from "./mapping";
import { SHEET_COLUMN_COUNT, SHEET_HEADERS, SheetColumn } from "./types";
import type { DeliveryOrderSnapshot } from "./types";

const ORDER_ID = "123e4567-e89b-12d3-a456-426614174000";

function baseOrder(overrides?: Partial<DeliveryOrderSnapshot>): DeliveryOrderSnapshot {
  return {
    id: ORDER_ID,
    orderNumber: "KARTI-000123",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T11:00:00.000Z",
    customerName: "Yasmine El Fassi",
    phone: "+212612345678",
    city: "Casablanca",
    deliveryAddress: "12 Rue Anfa, Maârif",
    deliveryNotes: "Call before delivery",
    subtotalMinor: 19900,
    deliveryFeeMinor: 3000,
    discountMinor: 0,
    totalMinor: 22900,
    currency: "MAD",
    orderStatus: "NEW",
    fulfillmentStatus: "NOT_STARTED",
    paymentStatus: "PENDING",
    ...overrides,
  };
}

describe("buildDeliverySheetRow", () => {
  it("maps the exact 21-column delivery snapshot", () => {
    const row = buildDeliverySheetRow(
      baseOrder(),
      [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-02T12:00:00.000Z",
    );
    expect(row.values).toHaveLength(SHEET_COLUMN_COUNT);
    expect(SHEET_HEADERS).toHaveLength(SHEET_COLUMN_COUNT);
    expect(row.values[SheetColumn.ORDER_NUMBER]).toBe("KARTI-000123");
    expect(row.values[SheetColumn.ORDER_ID]).toBe(ORDER_ID);
    expect(row.values[SheetColumn.CUSTOMER_NAME]).toBe("Yasmine El Fassi");
    expect(row.values[SheetColumn.PHONE]).toBe("+212612345678");
    expect(row.values[SheetColumn.PRODUCT]).toBe("WhatsApp Card");
    expect(row.values[SheetColumn.PRODUCT_TYPE]).toBe("WHATSAPP_CARD");
    expect(row.values[SheetColumn.QUANTITY]).toBe(1);
    expect(row.values[SheetColumn.UNIT_PRICE]).toBe(199);
    expect(row.values[SheetColumn.SUBTOTAL]).toBe(199);
    expect(row.values[SheetColumn.DELIVERY_FEE]).toBe(30);
    expect(row.values[SheetColumn.DISCOUNT]).toBe(0);
    expect(row.values[SheetColumn.TOTAL]).toBe(229);
    expect(row.values[SheetColumn.CITY]).toBe("Casablanca");
    expect(row.values[SheetColumn.ADDRESS]).toBe("12 Rue Anfa, Maârif");
    expect(row.values[SheetColumn.CUSTOMER_NOTE]).toBe("Call before delivery");
    expect(row.values[SheetColumn.ORDER_STATUS]).toBe("NEW");
    expect(row.values[SheetColumn.DELIVERY_STATUS]).toBe("NOT_STARTED");
    expect(row.values[SheetColumn.PAYMENT_STATUS]).toBe("PENDING");
    expect(row.values[SheetColumn.LAST_SHEET_SYNC]).toBe("2026-10-02T12:00:00.000Z");
  });

  it("keeps +212 phones and KARTI numbers as text, handles zero delivery/discount", () => {
    const row = buildDeliverySheetRow(
      baseOrder({ phone: "+212600000001", deliveryFeeMinor: 0, discountMinor: 0 }),
      [{ productType: "BUSINESS_CARD", quantity: 2, unitPriceMinor: 19900 }],
      "2026-10-02T12:00:00.000Z",
    );
    expect(typeof row.values[SheetColumn.PHONE]).toBe("string");
    expect(row.values[SheetColumn.PHONE]).toBe("+212600000001");
    expect(typeof row.values[SheetColumn.ORDER_NUMBER]).toBe("string");
    expect(row.values[SheetColumn.DELIVERY_FEE]).toBe(0);
    expect(row.values[SheetColumn.DISCOUNT]).toBe(0);
    expect(row.values[SheetColumn.QUANTITY]).toBe(2);
  });

  it("preserves Arabic/French Unicode customer text byte-identically", () => {
    const row = buildDeliverySheetRow(
      baseOrder({
        customerName: "فاطمة الزهراء بنعيسى",
        city: "الدار البيضاء",
        deliveryAddress: "زنقة 12، حي المعاريف — étage 3,appt 7",
        deliveryNotes: "Appeler avant la livraison من فضلك",
      }),
      [{ productType: "PERSONAL_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-02T12:00:00.000Z",
    );
    expect(row.values[SheetColumn.CUSTOMER_NAME]).toBe("فاطمة الزهراء بنعيسى");
    expect(row.values[SheetColumn.CITY]).toBe("الدار البيضاء");
    expect(row.values[SheetColumn.CUSTOMER_NOTE]).toBe("Appeler avant la livraison من فضلك");
  });

  it("uses the order money snapshot, never Catalog math", () => {
    const row = buildDeliverySheetRow(
      baseOrder({ subtotalMinor: 19900, totalMinor: 19900 }),
      [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-02T12:00:00.000Z",
    );
    expect(row.values[SheetColumn.SUBTOTAL]).toBe(199);
    expect(row.values[SheetColumn.TOTAL]).toBe(199);
  });

  it("hashes payload without the sync timestamp (re-sync is a no-op)", () => {
    const a = buildDeliverySheetRow(
      baseOrder(),
      [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-02T12:00:00.000Z",
    );
    const b = buildDeliverySheetRow(
      baseOrder(),
      [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-03T12:00:00.000Z",
    );
    expect(a.hash).toBe(b.hash);
    expect(a.values[SheetColumn.LAST_SHEET_SYNC]).not.toBe(b.values[SheetColumn.LAST_SHEET_SYNC]);
    const changed = buildDeliverySheetRow(
      baseOrder({ orderStatus: "CONFIRMED" }),
      [{ productType: "WHATSAPP_CARD", quantity: 1, unitPriceMinor: 19900 }],
      "2026-10-03T12:00:00.000Z",
    );
    expect(changed.hash).not.toBe(a.hash);
  });

  it("falls back honestly for empty/unknown items", () => {
    const row = buildDeliverySheetRow(baseOrder(), [], "2026-10-02T12:00:00.000Z");
    expect(row.values[SheetColumn.PRODUCT]).toBe("Unknown product");
    expect(row.values[SheetColumn.QUANTITY]).toBe(0);
    expect(sheetProductName("NOPE")).toBe("Unknown product");
    expect(hashSheetValues([1, "a"])).toMatch(/^[0-9a-f]{64}$/);
    expect(minorToMajorNumber(39800)).toBe(398);
  });
});
