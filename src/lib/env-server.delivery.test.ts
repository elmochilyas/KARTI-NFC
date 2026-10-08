import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getDeliveryCronSecrets,
  getDeliverySheetsConfig,
  getSheetsWebhookSecret,
  isValidDeliveryWebAppUrl,
} from "./env-server";

const URL = "https://script.google.com/macros/s/abc123/exec";
const SECRET_32 = "0123456789abcdef0123456789abcdef";
const CRON_16 = "0123456789abcdef";

function clearDeliveryEnv() {
  for (const name of [
    "DELIVERY_SHEETS_ENABLED",
    "DELIVERY_SHEETS_APPS_SCRIPT_URL",
    "DELIVERY_SHEETS_APPS_SCRIPT_SECRET",
    "DELIVERY_SHEETS_WEBHOOK_SECRET",
    "CRON_SECRET",
  ]) {
    delete process.env[name];
  }
}

function configureValid() {
  process.env.DELIVERY_SHEETS_ENABLED = "true";
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL = URL;
  process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = SECRET_32;
  process.env.DELIVERY_SHEETS_WEBHOOK_SECRET = SECRET_32;
  process.env.CRON_SECRET = CRON_16;
}

afterEach(() => {
  clearDeliveryEnv();
});

describe("delivery env validation", () => {
  it("is disabled by default (local safety: no env = no-op)", () => {
    clearDeliveryEnv();
    expect(getDeliverySheetsConfig()).toEqual({ enabled: false, webAppUrl: "", webAppSecret: "" });
    expect(() => getSheetsWebhookSecret()).toThrow();
    expect(getDeliveryCronSecrets()).toEqual([]);
  });

  it("accepts a complete valid configuration", () => {
    configureValid();
    expect(getDeliverySheetsConfig()).toEqual({
      enabled: true,
      webAppUrl: URL,
      webAppSecret: SECRET_32,
    });
    expect(getSheetsWebhookSecret()).toBe(SECRET_32);
    expect(getDeliveryCronSecrets()).toEqual([CRON_16]);
  });

  it("requires ENABLED=true explicitly", () => {
    configureValid();
    delete process.env.DELIVERY_SHEETS_ENABLED;
    expect(getDeliverySheetsConfig().enabled).toBe(false);
  });

  it("rejects invalid /dev URLs", () => {
    configureValid();
    process.env.DELIVERY_SHEETS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/abc123/dev";
    expect(getDeliverySheetsConfig().enabled).toBe(false);
    expect(isValidDeliveryWebAppUrl("https://script.google.com/macros/s/abc123/dev")).toBe(false);
  });

  it("rejects non-HTTPS, wrong-host, and non-/exec URLs", () => {
    expect(isValidDeliveryWebAppUrl("http://script.google.com/macros/s/x/exec")).toBe(false);
    expect(isValidDeliveryWebAppUrl("https://evil.example.com/macros/s/x/exec")).toBe(false);
    expect(isValidDeliveryWebAppUrl("https://script.google.com/macros/s/x")).toBe(false);
    expect(isValidDeliveryWebAppUrl("not a url")).toBe(false);
    expect(isValidDeliveryWebAppUrl("")).toBe(false);
    expect(isValidDeliveryWebAppUrl("https://script.google.com/macros/s/x/exec?foo=1")).toBe(true);
    expect(isValidDeliveryWebAppUrl(URL)).toBe(true);
  });

  it("rejects short secrets", () => {
    configureValid();
    process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = "short";
    expect(getDeliverySheetsConfig().enabled).toBe(false);
    process.env.DELIVERY_SHEETS_APPS_SCRIPT_SECRET = SECRET_32;
    process.env.DELIVERY_SHEETS_WEBHOOK_SECRET = "short";
    expect(getDeliverySheetsConfig().enabled).toBe(false);
    expect(() => getSheetsWebhookSecret()).toThrow();
  });

  it("requires a cron secret for enabled config", () => {
    configureValid();
    delete process.env.CRON_SECRET;
    expect(getDeliverySheetsConfig().enabled).toBe(false);
  });

  it("uses only CRON_SECRET for cron auth (Vercel auto-header)", () => {
    clearDeliveryEnv();
    process.env.CRON_SECRET = CRON_16;
    expect(getDeliveryCronSecrets()).toEqual([CRON_16]);
    process.env.CRON_SECRET = "fedcba9876543210";
    expect(getDeliveryCronSecrets()).toEqual(["fedcba9876543210"]);
  });
});
