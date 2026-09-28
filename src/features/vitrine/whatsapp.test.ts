import { describe, expect, it } from "vitest";
import { buildOrderWhatsappLink } from "./whatsapp";

describe("buildOrderWhatsappLink", () => {
  it("builds an encoded wa.me link", () => {
    expect(
      buildOrderWhatsappLink({
        salesDigits: "212612345678",
        template: "Hello, I just placed order {order} for {qty} × {product}.",
        orderNumber: "KARTI-000124",
        quantity: 2,
        productName: "Google Review Card",
      }),
    ).toBe(
      "https://wa.me/212612345678?text=Hello%2C%20I%20just%20placed%20order%20KARTI-000124%20for%202%20%C3%97%20Google%20Review%20Card.",
    );
  });

  it("returns null for malformed sales numbers", () => {
    expect(
      buildOrderWhatsappLink({
        salesDigits: "abc",
        template: "{order}",
        orderNumber: "KARTI-1",
        quantity: 1,
        productName: "X",
      }),
    ).toBeNull();
  });
});
