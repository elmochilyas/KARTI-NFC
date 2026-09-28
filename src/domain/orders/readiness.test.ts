import { describe, expect, it } from "vitest";
import { canProvisionAtFulfillment, cardReadiness, isConvertibleOrderStatus } from "./readiness";

describe("card readiness", () => {
  it("derives required/linked/remaining without stored flags", () => {
    expect(cardReadiness(3, 0)).toEqual({ required: 3, linked: 0, remaining: 3 });
    expect(cardReadiness(3, 1)).toEqual({ required: 3, linked: 1, remaining: 2 });
    expect(cardReadiness(3, 3)).toEqual({ required: 3, linked: 3, remaining: 0 });
    expect(cardReadiness(2, 5)).toEqual({ required: 2, linked: 5, remaining: 0 });
  });

  it("treats invalid counts as zero", () => {
    expect(cardReadiness(0, 0)).toEqual({ required: 0, linked: 0, remaining: 0 });
    expect(cardReadiness(-2, -1)).toEqual({ required: 0, linked: 0, remaining: 0 });
  });
});

describe("conversion eligibility", () => {
  it("allows CONFIRMED and unlinked IN_PROGRESS only", () => {
    expect(isConvertibleOrderStatus("CONFIRMED")).toBe(true);
    expect(isConvertibleOrderStatus("IN_PROGRESS")).toBe(true);
    expect(isConvertibleOrderStatus("NEW")).toBe(false);
    expect(isConvertibleOrderStatus("CONTACTED")).toBe(false);
    expect(isConvertibleOrderStatus("COMPLETED")).toBe(false);
    expect(isConvertibleOrderStatus("CANCELLED")).toBe(false);
  });
});

describe("provisioning eligibility", () => {
  it("requires NFC_CONFIGURATION for first provisioning", () => {
    expect(canProvisionAtFulfillment("NFC_CONFIGURATION", 0)).toBe(true);
    expect(canProvisionAtFulfillment("PRODUCTION", 0)).toBe(false);
    expect(canProvisionAtFulfillment("NOT_STARTED", 0)).toBe(false);
    expect(canProvisionAtFulfillment("READY", 0)).toBe(false);
  });

  it("allows resume once cards are linked", () => {
    expect(canProvisionAtFulfillment("READY", 1)).toBe(true);
    expect(canProvisionAtFulfillment("SHIPPED", 2)).toBe(true);
    expect(canProvisionAtFulfillment("DELIVERED", 1)).toBe(true);
    expect(canProvisionAtFulfillment("PRODUCTION", 1)).toBe(false);
  });
});
