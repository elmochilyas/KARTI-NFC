/**
 * Minimal browser E2E for Phase 6 (spec 08 §4, E2E-01..12 subset).
 *
 * Hermetic by design: specs cover marketing → product → order entry,
 * client-side wizard validation, and SEO headers without writing to the
 * database. Authenticated operator flows, idempotent submission, and the
 * full visitor → order → dashboard → card lifecycle are proven by
 * integration tests + live disposable proofs (see tasks.md Phase 6 log)
 * because automated browser tests must never use production credentials
 * or write unowned rows.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Dedicated port: :3000 may host a developer's `next dev`.
        // Always boot a fresh production server so results are deterministic.
        command: "npx next start --port 3100",
        port: 3100,
        reuseExistingServer: false,
        timeout: 180_000,
        // Shape-only dummy so the delivery-Sheet webhook auth paths are
        // exercisable hermetically (no Google, no real secret, no Sheet).
        env: {
          DELIVERY_SHEETS_ENABLED: "true",
          DELIVERY_SHEETS_APPS_SCRIPT_URL: "https://script.google.com/macros/s/e2e/exec",
          DELIVERY_SHEETS_APPS_SCRIPT_SECRET:
            "e2e-dummy-apps-secret-0123456789abcdef0123456789abcdef",
          DELIVERY_SHEETS_WEBHOOK_SECRET:
            "e2e-dummy-webhook-secret-0123456789abcdef0123456789abcdef",
          CRON_SECRET: "e2e-dummy-cron-secret",
        },
      },
});
