# Google Sheets Delivery Integration — Deployment & Operations Runbook

The delivery Sheet is an **operational mirror**. Supabase/Karti is the
authoritative source of truth. Never put credentials in this file.

There is NO Google service account, NO private key in Vercel, and NO Google
Cloud setup. Karti talks to a bound Apps Script Web App over signed HTTPS;
the script owns every Sheet write.

## 1. Architecture

```text
Karti / Supabase
  → signed HTTPS envelope → Apps Script Web App → delivery Sheet
Sheet edit (Q/R/S only, installable onEdit trigger)
  → signed HTTPS (UrlFetchApp) → POST /api/integrations/google-sheets/order-status
  → sheets_apply_* RPCs (expected-state guarded, SYSTEM actor, GOOGLE_SHEETS audit)
  → sync-back to the Sheet via the Web App
```

Karti → script auth rides in the JSON body (Apps Script cannot reliably
read custom headers):

```json
{
  "timestamp": "1760000000",
  "nonce": "uuid",
  "payload": "{\"type\":\"UPSERT_ORDER\",…}",
  "signature": "hex"
}
```

`signature = HMAC-SHA256(DELIVERY_SHEETS_APPS_SCRIPT_SECRET, timestamp + "." + nonce + "." + payload)`,
skew ≈ 5 minutes. Replays are harmless: the script always upserts by Order
ID under `LockService`.

Script → Karti keeps `X-Karti-Timestamp` / `X-Karti-Signature` over the raw
body (`HMAC-SHA256(DELIVERY_SHEETS_WEBHOOK_SECRET, timestamp + "." + body)`),
durable PostgreSQL nonces, strict validation, field allowlist, and domain
transition enforcement.

Identity is `order.id` (column B). Row numbers are never trusted.

The Sheet **displays** every authoritative status but the webhook can only
**write**:

- order: `CONFIRMED`, `CANCELLED`
- payment: `PAID`, `REFUNDED` (within domain rules)
- fulfillment: `READY`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `RETURNED`

Delivery flow: `NOT_STARTED → READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`
(no `SHIPPED` required; `SHIPPED` stays for compatibility).
Exception flow: `READY / PICKED_UP / OUT_FOR_DELIVERY → FAILED → RETURNED`.

Money, identity, address, notes, and order lifecycle states outside the scope
above are Karti → Sheet only and can never be written from the Sheet.

## 2. Setup

KARTI SERVER — configure Vercel env (server-only, never in the dashboard):

- `DELIVERY_SHEETS_APPS_SCRIPT_URL` (the `/exec` URL, step 7)
- `DELIVERY_SHEETS_APPS_SCRIPT_SECRET` (≥32 chars, `openssl rand -hex 32`)
- `DELIVERY_SHEETS_WEBHOOK_SECRET` (≥32 chars)
- `CRON_SECRET` (≥16 chars, Vercel cron sends it automatically)
  cron sends automatically)
- `DELIVERY_SHEETS_ENABLED=true` (unset/false = disabled; local and
  unconfigured preview stay disabled, so test orders never reach
  production)

GOOGLE:

1. Create Sheet
2. Extensions → Apps Script
3. Paste DeliverySheet.gs
4. Set matching `KARTI_CONFIG` (or Script Properties directly):
   - `KARTI_INGEST_SECRET` = `DELIVERY_SHEETS_APPS_SCRIPT_SECRET`
   - `KARTI_WEBHOOK_SECRET` = `DELIVERY_SHEETS_WEBHOOK_SECRET`
   - `KARTI_WEBHOOK_URL` = `https://karti.pro/api/integrations/google-sheets/order-status`
   - `ORDERS_SHEET_NAME` = `Orders`
   - `SPREADSHEET_ID` is captured automatically by the setup function
5. Run setupKartiDelivery()
6. Deploy Web App (Execute as Me)
7. Put /exec URL into Vercel env
8. Redeploy
9. Dashboard → Settings → Delivery Sheet → Test connection (signed `PING`,
   expects `{ok:true, operation:"PING", result:"PONG"}`) → Connected ✓

That is all. Afterwards place one test order (non-production Sheet
first): verify the 21-column row → repeat sync → no duplicate → sort rows
→ Karti update still hits the right Order ID → Sheet status flow →
Karti each step → invalid transition safely rejected → cancellation
syncs out → clean test data per project conventions.

## 3. Retry & recovery

- Public creation: `order_delivery_sheet_sync` row is written `PENDING`
  **before** the customer response; delivery is attempted in `after()`.
  Apps Script outages never lose the authoritative order.
- Retryable failures (timeout, 429/5xx, temporary script errors) stay
  `PENDING` with exponential backoff (1m → 30m cap, ≤8 attempts). Terminal
  failures (bad config, signature mismatch, malformed responses) are marked
  `FAILED` (`terminal:` prefix) and wait for an operator.
- Cron (machine auth, no browser session): committed in `vercel.json`
  (`GET /api/integrations/google-sheets/retry?limit=25` every 5 minutes).
  Vercel sends `Authorization: Bearer $CRON_SECRET` automatically — set
  `CRON_SECRET` in Vercel once and scheduled retries need no further
  wiring. Dashboard manual **Resync** (order detail, forces transmission)
  and **Sync unsynced orders** (Settings) stay behind the admin session.
- Cancelled orders keep their Sheet row (`Order Status = CANCELLED`) for
  audit — rows are never deleted.
- Expired webhook nonces are deleted opportunistically on each webhook
  insert (bounded, no cron needed).

## 4. Privacy

The Sheet contains personal delivery data (name, phone, city, address).
Export is limited to delivery-necessary columns (no receipt tokens, no
normalized-PII indexes, no attribution, no internal notes, no secrets).
Phones and order numbers are stored as **text**.

## 5. Troubleshooting

| Symptom            | Likely cause                         | Fix                                                                |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------ |
| Rows stay PENDING  | Missing URL/secret or wrong `/exec`  | Check env (`/exec`, not `/dev`) + secrets match Script Properties  |
| FAILED `terminal:` | Secret mismatch / revoked deployment | Re-check secrets, redeploy Web App (new version), then Resync      |
| Webhook 401        | Wrong webhook secret / clock skew    | Re-check `KARTI_WEBHOOK_SECRET` on both sides                      |
| Webhook 409 REPLAY | Double-fire                          | Single edit per change; nonces are one-shot                        |
| Webhook 422        | Invalid transition / forbidden value | Follow the dropdown flow; Karti rules win                          |
| Header drift       | Someone edited row 1                 | Re-run setup (never overwrites populated headers; drift reported)  |
| Duplicate rows     | Concurrent writes                    | `LockService` + Order-ID upsert prevent this; report with order ID |
