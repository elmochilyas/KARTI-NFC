/**
 * Karti delivery-Sheet integration (bound Apps Script, complete module).
 *
 * Karti NEVER talks to the Sheets API: it POSTs signed JSON envelopes to
 * this script's Web App, and this script owns all Sheet writes. Delivery
 * edits in Q/R/S return through the HMAC-authenticated Karti webhook.
 *
 * Script Properties (Project Settings → Script Properties — never cells):
 *   KARTI_INGEST_SECRET   HMAC secret for Karti → script envelopes
 *                         (== Karti DELIVERY_SHEETS_APPS_SCRIPT_SECRET)
 *   KARTI_WEBHOOK_SECRET  HMAC secret for script → Karti webhook
 *                         (== Karti DELIVERY_SHEETS_WEBHOOK_SECRET)
 *   KARTI_WEBHOOK_URL     https://<app>/api/integrations/google-sheets/order-status
 *   SPREADSHEET_ID        delivery spreadsheet id
 *   ORDERS_SHEET_NAME     Orders (default)
 *
 * Operator flow: paste this file → fill KARTI_CONFIG with the matching
 * server values (one block) → run setupKartiDelivery() once →
 * Deploy → New deployment → Web app → Execute as Me → access that lets
 * Karti call /exec without Google login (HMAC is the security).
 * Production Karti uses the /exec URL, never /dev.
 *
 * No secret is hardcoded below (KARTI_CONFIG ships blank) and none is
 * ever returned in responses.
 */

var ORDERS_SHEET_DEFAULT = "Orders";
var HEADER_ROW = 1;
var FIRST_DATA_ROW = 2;
var SKEW_MS = 5 * 60 * 1000;
var NONCE_TTL_SECS = 10 * 60;

var HEADERS = [
  "Order Number",
  "Order ID",
  "Created At",
  "Customer Name",
  "Phone",
  "Product",
  "Product Type",
  "Quantity",
  "Unit Price",
  "Subtotal",
  "Delivery Fee",
  "Discount",
  "Total / COD",
  "City",
  "Address",
  "Customer Note",
  "Order Status",
  "Delivery Status",
  "Payment Status",
  "Last Karti Update",
  "Last Sheet Sync",
];

// 1-based columns.
var COL = {
  ORDER_NUMBER: 1,
  ORDER_ID: 2,
  CREATED_AT: 3,
  CUSTOMER_NAME: 4,
  PHONE: 5,
  PRODUCT: 6,
  PRODUCT_TYPE: 7,
  QUANTITY: 8,
  UNIT_PRICE: 9,
  SUBTOTAL: 10,
  DELIVERY_FEE: 11,
  DISCOUNT: 12,
  TOTAL: 13,
  CITY: 14,
  ADDRESS: 15,
  CUSTOMER_NOTE: 16,
  ORDER_STATUS: 17,
  DELIVERY_STATUS: 18,
  PAYMENT_STATUS: 19,
  LAST_KARTI_UPDATE: 20,
  LAST_SHEET_SYNC: 21,
};

var COLUMN_COUNT = HEADERS.length;

var ORDER_STATUS_VALUES = [
  "NEW",
  "CONTACTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

var DELIVERY_STATUS_VALUES = [
  "NOT_STARTED",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
];

var PAYMENT_STATUS_VALUES = ["PENDING", "PARTIALLY_PAID", "PAID", "REFUNDED", "NOT_REQUIRED"];

var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function props() {
  return PropertiesService.getScriptProperties();
}

function ordersSheetName() {
  return props().getProperty("ORDERS_SHEET_NAME") || ORDERS_SHEET_DEFAULT;
}

function openOrdersSheet() {
  var id = props().getProperty("SPREADSHEET_ID");

  if (!id) {
    throw {
      code: "NOT_CONFIGURED",
      message: "SPREADSHEET_ID missing",
    };
  }

  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(ordersSheetName());

  if (!sheet) {
    throw {
      code: "TAB_MISSING",
      message: "Orders sheet missing",
    };
  }

  return sheet;
}

/**
 * Paste the matching values once, then run setupKartiDelivery() ONCE:
 *
 *   webhookUrl:    "https://karti.pro/api/integrations/google-sheets/order-status"
 *   ingestSecret:  "<same value as DELIVERY_SHEETS_APPS_SCRIPT_SECRET>"
 *   webhookSecret: "<same value as DELIVERY_SHEETS_WEBHOOK_SECRET>"
 *
 * setupKartiDelivery() stores them into Script Properties. Afterwards you
 * may blank the secrets below in the editor — the Properties retain them.
 * This local copy is yours; the committed template keeps blanks, so no
 * secret ever lands in the repository.
 */
var KARTI_CONFIG = {
  webhookUrl: "https://karti.pro/api/integrations/google-sheets/order-status",
  ingestSecret: "",
  webhookSecret: "",
};

/**
 * Programmatic alternative:
 *
 * configureKartiDelivery({
 *   webhookUrl: "...",
 *   ingestSecret: "...",
 *   webhookSecret: "..."
 * });
 *
 * Values are stored in Script Properties and never logged.
 */
function configureKartiDelivery(config) {
  config = config || {};

  var p = props();

  if (config.webhookUrl) {
    p.setProperty("KARTI_WEBHOOK_URL", String(config.webhookUrl));
  }

  if (config.ingestSecret) {
    p.setProperty("KARTI_INGEST_SECRET", String(config.ingestSecret));
  }

  if (config.webhookSecret) {
    p.setProperty("KARTI_WEBHOOK_SECRET", String(config.webhookSecret));
  }

  if (!p.getProperty("ORDERS_SHEET_NAME")) {
    p.setProperty("ORDERS_SHEET_NAME", ORDERS_SHEET_DEFAULT);
  }
}

/**
 * ONE-TIME operator setup.
 *
 * Run this after pasting the script and filling KARTI_CONFIG.
 *
 * It:
 * - stores KARTI_CONFIG into Script Properties
 * - captures the bound spreadsheet ID
 * - defaults sheet name to Orders
 * - configures the Orders sheet
 * - installs the edit trigger
 *
 * Safe to re-run.
 */
function setupKartiDelivery() {
  if (KARTI_CONFIG.webhookUrl || KARTI_CONFIG.ingestSecret || KARTI_CONFIG.webhookSecret) {
    configureKartiDelivery(KARTI_CONFIG);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (ss && !props().getProperty("SPREADSHEET_ID")) {
      props().setProperty("SPREADSHEET_ID", ss.getId());
    }
  } catch (e) {
    // Headless context.
    // SPREADSHEET_ID can be set manually if required.
  }

  if (!props().getProperty("ORDERS_SHEET_NAME")) {
    props().setProperty("ORDERS_SHEET_NAME", ORDERS_SHEET_DEFAULT);
  }

  var report = setupDeliverySheet();

  installDeliveryEditTrigger();

  var required = [
    "KARTI_INGEST_SECRET",
    "KARTI_WEBHOOK_SECRET",
    "KARTI_WEBHOOK_URL",
    "SPREADSHEET_ID",
  ];

  var missing = required.filter(function (key) {
    return !props().getProperty(key);
  });

  var summary =
    "setupKartiDelivery: " +
    JSON.stringify(report) +
    (missing.length ? " — MISSING: " + missing.join(", ") : " — ready to deploy as Web App.");

  try {
    Logger.log(summary);
  } catch (e) {
    // Ignore logger failure.
  }

  try {
    SpreadsheetApp.getActive().toast(summary);
  } catch (e) {
    // Ignore toast failure.
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function hexEncode(bytes) {
  return bytes
    .map(function (b) {
      var v = b < 0 ? b + 256 : b;

      return ("0" + v.toString(16)).slice(-2);
    })
    .join("");
}

function hmacHex(secret, message) {
  return hexEncode(Utilities.computeHmacSha256Signature(String(message), String(secret)));
}

/**
 * Constant-time-ish comparison.
 * Full-length walk is the best practical option in Apps Script.
 */
function safeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");

  if (a.length !== b.length) {
    return false;
  }

  var diff = 0;

  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

function randomNonce() {
  return Utilities.getUuid().replace(/-/g, "");
}

function safeJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function fail(code) {
  return safeJsonResponse({
    ok: false,
    code: code,
  });
}

// ---------------------------------------------------------------------------
// Web App entrypoint — Karti → Sheet
// ---------------------------------------------------------------------------

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return fail("MALFORMED");
    }

    var envelope;

    try {
      envelope = JSON.parse(e.postData.contents);
    } catch (err) {
      return fail("MALFORMED");
    }

    if (!envelope || typeof envelope !== "object") {
      return fail("MALFORMED");
    }

    var timestamp = envelope.timestamp;

    var nonce = envelope.nonce;

    var payloadStr = envelope.payload;

    var signature = envelope.signature;

    if (
      typeof timestamp !== "string" ||
      typeof nonce !== "string" ||
      typeof payloadStr !== "string" ||
      typeof signature !== "string"
    ) {
      return fail("MALFORMED");
    }

    var ts = parseInt(timestamp, 10);

    if (isNaN(ts) || Math.abs(Date.now() - ts) > SKEW_MS) {
      return fail("EXPIRED");
    }

    var secret = props().getProperty("KARTI_INGEST_SECRET");

    if (!secret) {
      return fail("NOT_CONFIGURED");
    }

    var expected = hmacHex(secret, timestamp + "." + nonce + "." + payloadStr);

    if (!safeEqual(expected, signature)) {
      return fail("INVALID_SIGNATURE");
    }

    /*
     * Best-effort replay cache.
     *
     * UPSERT_ORDER remains independently
     * idempotent by Order ID.
     */
    try {
      var cache = CacheService.getScriptCache();

      if (cache.get("ingest:" + nonce)) {
        return fail("REPLAY");
      }

      cache.put("ingest:" + nonce, "1", NONCE_TTL_SECS);
    } catch (err) {
      // Cache is supplementary only.
    }

    var payload;

    try {
      payload = JSON.parse(payloadStr);
    } catch (err) {
      return fail("MALFORMED");
    }

    if (!payload || typeof payload !== "object") {
      return fail("MALFORMED");
    }

    if (payload.type === "UPSERT_ORDER") {
      return handleUpsert(payload);
    }

    if (payload.type === "SETUP_SHEET") {
      return handleSetup();
    }

    if (payload.type === "PING") {
      return safeJsonResponse({
        ok: true,
        operation: "PING",
        result: "PONG",
      });
    }

    return fail("INVALID_OPERATION");
  } catch (err) {
    var code = err && err.code ? String(err.code) : "TEMPORARY_FAILURE";

    return fail(code);
  }
}

// ---------------------------------------------------------------------------
// Order upsert
// ---------------------------------------------------------------------------

function handleUpsert(payload) {
  var orderId = payload.orderId;

  var values = payload.values;

  if (typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) {
    return fail("MALFORMED");
  }

  if (!Array.isArray(values) || values.length !== COLUMN_COUNT) {
    return fail("MALFORMED");
  }

  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);
  } catch (err) {
    return fail("TEMPORARY_FAILURE");
  }

  try {
    var sheet = openOrdersSheet();

    var row = findOrderRow(sheet, orderId);

    if (row !== null) {
      if (rowsEqual(sheet, row, values)) {
        return safeJsonResponse({
          ok: true,
          operation: "UPSERT_ORDER",
          result: "UNCHANGED",
        });
      }

      sheet.getRange(row, 1, 1, COLUMN_COUNT).setValues([values]);

      SpreadsheetApp.flush();

      return safeJsonResponse({
        ok: true,
        operation: "UPSERT_ORDER",
        result: "UPDATED",
      });
    }

    sheet.appendRow(values);

    SpreadsheetApp.flush();

    return safeJsonResponse({
      ok: true,
      operation: "UPSERT_ORDER",
      result: "CREATED",
    });
  } catch (err) {
    return fail(err && err.code ? String(err.code) : "TEMPORARY_FAILURE");
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Ignore.
    }
  }
}

function handleSetup() {
  try {
    var report = setupDeliverySheet();

    return safeJsonResponse({
      ok: true,
      operation: "SETUP_SHEET",
      result: "SETUP_OK",
      detail: report,
    });
  } catch (err) {
    return fail(err && err.code ? String(err.code) : "TEMPORARY_FAILURE");
  }
}

/**
 * Linear scan of column B.
 * Order ID is the technical identity.
 */
function findOrderRow(sheet, orderId) {
  var lastRow = sheet.getLastRow();

  if (lastRow < FIRST_DATA_ROW) {
    return null;
  }

  var ids = sheet
    .getRange(FIRST_DATA_ROW, COL.ORDER_ID, lastRow - FIRST_DATA_ROW + 1, 1)
    .getValues();

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || "").trim() === orderId) {
      return FIRST_DATA_ROW + i;
    }
  }

  return null;
}

function normalizeCell(v) {
  if (v instanceof Date) {
    return v.toISOString();
  }

  if (v === null || v === undefined) {
    return "";
  }

  return String(v);
}

/**
 * Compare columns A..T.
 * Column U = Last Sheet Sync and
 * intentionally changes.
 */
function rowsEqual(sheet, row, values) {
  var existing = sheet.getRange(row, 1, 1, COLUMN_COUNT).getValues()[0];

  for (var i = 0; i < COLUMN_COUNT - 1; i++) {
    if (normalizeCell(existing[i]) !== normalizeCell(values[i])) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Sheet setup
// ---------------------------------------------------------------------------

function setupDeliverySheet() {
  var report = {
    tabCreated: false,
    headersWritten: false,
    headerDrift: false,
  };

  var id = props().getProperty("SPREADSHEET_ID");

  if (!id) {
    throw {
      code: "NOT_CONFIGURED",
    };
  }

  var ss = SpreadsheetApp.openById(id);

  var sheet = ss.getSheetByName(ordersSheetName());

  if (!sheet) {
    sheet = ss.insertSheet(ordersSheetName());

    report.tabCreated = true;
  }

  var headerRange = sheet.getRange(HEADER_ROW, 1, 1, COLUMN_COUNT);

  var firstRow = headerRange.getValues()[0].map(function (c) {
    return String(c || "");
  });

  var empty = firstRow.every(function (c) {
    return c === "";
  });

  if (empty) {
    headerRange.setValues([HEADERS]);

    report.headersWritten = true;
  } else {
    var matches =
      firstRow.length === HEADERS.length &&
      firstRow.every(function (c, i) {
        return c === HEADERS[i];
      });

    if (!matches) {
      report.headerDrift = true;
    }
  }

  applyFormatting(sheet);
  applyValidation(sheet);
  applyProtections(sheet);

  SpreadsheetApp.flush();

  return report;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function applyFormatting(sheet) {
  sheet.setFrozenRows(1);

  var lastRow = Math.max(sheet.getMaxRows(), 1000);

  if (!sheet.getFilter()) {
    sheet.getRange(HEADER_ROW, 1, 1, COLUMN_COUNT).createFilter();
  }

  sheet.setColumnWidth(COL.ORDER_NUMBER, 130);

  sheet.setColumnWidth(COL.ORDER_ID, 230);

  sheet.setColumnWidth(COL.CREATED_AT, 160);

  sheet.setColumnWidth(COL.CUSTOMER_NAME, 180);

  sheet.setColumnWidth(COL.PHONE, 150);

  sheet.setColumnWidth(COL.PRODUCT, 170);

  sheet.setColumnWidth(COL.PRODUCT_TYPE, 170);

  sheet.setColumnWidth(COL.QUANTITY, 90);

  sheet.setColumnWidth(COL.UNIT_PRICE, 120);

  sheet.setColumnWidth(COL.SUBTOTAL, 120);

  sheet.setColumnWidth(COL.DELIVERY_FEE, 120);

  sheet.setColumnWidth(COL.DISCOUNT, 110);

  sheet.setColumnWidth(COL.TOTAL, 130);

  sheet.setColumnWidth(COL.CITY, 140);

  sheet.setColumnWidth(COL.ADDRESS, 280);

  sheet.setColumnWidth(COL.CUSTOMER_NOTE, 240);

  sheet.setColumnWidth(COL.ORDER_STATUS, 150);

  sheet.setColumnWidth(COL.DELIVERY_STATUS, 180);

  sheet.setColumnWidth(COL.PAYMENT_STATUS, 150);

  sheet.setColumnWidth(COL.LAST_KARTI_UPDATE, 170);

  sheet.setColumnWidth(COL.LAST_SHEET_SYNC, 170);

  [COL.CREATED_AT, COL.LAST_KARTI_UPDATE, COL.LAST_SHEET_SYNC].forEach(function (c) {
    sheet.getRange(FIRST_DATA_ROW, c, lastRow, 1).setNumberFormat("yyyy-mm-dd hh:mm");
  });

  sheet
    .getRange(FIRST_DATA_ROW, COL.UNIT_PRICE, lastRow, COL.TOTAL - COL.UNIT_PRICE + 1)
    .setNumberFormat('#,##0.00 "MAD"');

  [COL.ORDER_NUMBER, COL.ORDER_ID, COL.PHONE].forEach(function (c) {
    sheet.getRange(FIRST_DATA_ROW, c, lastRow, 1).setNumberFormat("@");
  });

  sheet.getRange(FIRST_DATA_ROW, COL.ADDRESS, lastRow, 2).setWrap(true);

  var header = sheet.getRange(HEADER_ROW, 1, 1, COLUMN_COUNT);

  header
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#0f172a")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(HEADER_ROW, 34);

  addTint(sheet, COL.ORDER_STATUS, "CONFIRMED", "#d9ead3");

  addTint(sheet, COL.ORDER_STATUS, "COMPLETED", "#d9ead3");

  addTint(sheet, COL.ORDER_STATUS, "CANCELLED", "#f4cccc");

  addTint(sheet, COL.DELIVERY_STATUS, "READY", "#fff2cc");

  addTint(sheet, COL.DELIVERY_STATUS, "PICKED_UP", "#cfe2f3");

  addTint(sheet, COL.DELIVERY_STATUS, "OUT_FOR_DELIVERY", "#9fc5e8");

  addTint(sheet, COL.DELIVERY_STATUS, "DELIVERED", "#d9ead3");

  addTint(sheet, COL.DELIVERY_STATUS, "FAILED", "#f4cccc");

  addTint(sheet, COL.DELIVERY_STATUS, "RETURNED", "#fce5cd");

  addTint(sheet, COL.PAYMENT_STATUS, "PENDING", "#fff2cc");

  addTint(sheet, COL.PAYMENT_STATUS, "PARTIALLY_PAID", "#fce5cd");

  addTint(sheet, COL.PAYMENT_STATUS, "PAID", "#d9ead3");

  addTint(sheet, COL.PAYMENT_STATUS, "REFUNDED", "#f4cccc");
}

function addTint(sheet, col, value, color) {
  try {
    var lastRow = Math.max(sheet.getMaxRows(), 1000);

    var range = sheet.getRange(FIRST_DATA_ROW, col, lastRow, 1);

    var existing = sheet.getConditionalFormatRules();

    /*
     * Avoid adding the exact same Karti rule
     * repeatedly when setup is re-run.
     */
    var formula = '=INDIRECT(ADDRESS(ROW(),COLUMN()))="' + value + '"';

    var rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(formula)
      .setBackground(color)
      .setRanges([range])
      .build();

    existing.push(rule);

    sheet.setConditionalFormatRules(existing);
  } catch (e) {
    // Best-effort visual enhancement.
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function applyValidation(sheet) {
  dropdown(sheet, COL.ORDER_STATUS, ORDER_STATUS_VALUES);

  dropdown(sheet, COL.DELIVERY_STATUS, DELIVERY_STATUS_VALUES);

  dropdown(sheet, COL.PAYMENT_STATUS, PAYMENT_STATUS_VALUES);
}

function dropdown(sheet, col, values) {
  try {
    var lastRow = Math.max(sheet.getMaxRows(), 1000);

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(false)
      .build();

    sheet.getRange(FIRST_DATA_ROW, col, lastRow, 1).setDataValidation(rule);
  } catch (e) {
    // Best-effort.
  }
}

// ---------------------------------------------------------------------------
// Protections
// ---------------------------------------------------------------------------

function applyProtections(sheet) {
  /*
   * Warning-only protections.
   *
   * These are UX safeguards only.
   * Karti's webhook/domain validation remains
   * the actual security boundary.
   */
  try {
    var lastRow = Math.max(sheet.getMaxRows(), 1000);

    var leftProtection = sheet
      .getRange(FIRST_DATA_ROW, 1, lastRow, COL.CUSTOMER_NOTE)
      .protect()
      .setDescription("Karti authoritative columns A:P — do not hand-edit");

    leftProtection.setWarningOnly(true);

    var rightProtection = sheet
      .getRange(FIRST_DATA_ROW, COL.LAST_KARTI_UPDATE, lastRow, 2)
      .protect()
      .setDescription("Karti sync timestamps T:U — do not hand-edit");

    rightProtection.setWarningOnly(true);
  } catch (e) {
    // Best-effort.
  }
}

// ---------------------------------------------------------------------------
// Status webhook — Sheet → Karti
// ---------------------------------------------------------------------------

/**
 * Creates the installable onEdit trigger once.
 *
 * Safe to re-run.
 */
function installDeliveryEditTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === "onDeliverySheetEdit";
  });

  existing.forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("onDeliverySheetEdit")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

function fieldForColumn(col) {
  if (col === COL.ORDER_STATUS) {
    return "order_status";
  }

  if (col === COL.DELIVERY_STATUS) {
    return "fulfillment_status";
  }

  if (col === COL.PAYMENT_STATUS) {
    return "payment_status";
  }

  return null;
}

/**
 * Installable edit handler.
 *
 * Reacts ONLY to:
 * - single-cell edits
 * - rows >= 2
 * - columns Q/R/S
 * - Orders sheet
 */
function onDeliverySheetEdit(e) {
  if (!e || !e.range) {
    return;
  }

  var range = e.range;

  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
    return;
  }

  if (range.getRow() < FIRST_DATA_ROW) {
    return;
  }

  var field = fieldForColumn(range.getColumn());

  if (!field) {
    return;
  }

  var sheet = range.getSheet();

  if (sheet.getName() !== ordersSheetName()) {
    return;
  }

  var row = range.getRow();

  var orderId = String(sheet.getRange(row, COL.ORDER_ID).getValue() || "").trim();

  var orderNumber = String(sheet.getRange(row, COL.ORDER_NUMBER).getValue() || "").trim();

  var value = String(range.getValue() || "").trim();

  if (!UUID_PATTERN.test(orderId) || !orderNumber || !value) {
    return;
  }

  /*
   * Prevent obviously forbidden values from
   * even reaching Karti.
   *
   * Karti re-validates everything server-side.
   */
  if (field === "order_status" && ["CONFIRMED", "CANCELLED"].indexOf(value) === -1) {
    range.setNote("Karti: delivery operators may only set CONFIRMED or CANCELLED.");

    return;
  }

  if (field === "payment_status" && ["PAID", "REFUNDED"].indexOf(value) === -1) {
    range.setNote("Karti: delivery operators may only set PAID or REFUNDED.");

    return;
  }

  if (
    field === "fulfillment_status" &&
    ["READY", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"].indexOf(value) ===
      -1
  ) {
    range.setNote("Karti: this delivery status is not editable by the delivery company.");

    return;
  }

  var url = props().getProperty("KARTI_WEBHOOK_URL");

  var secret = props().getProperty("KARTI_WEBHOOK_SECRET");

  if (!url || !secret) {
    range.setNote("Karti sync is not configured.");

    try {
      SpreadsheetApp.getActive().toast("Delivery sync is not configured.");
    } catch (e) {
      // Ignore.
    }

    return;
  }

  var payload = {
    orderId: orderId,
    orderNumber: orderNumber,
    field: field,
    value: value,
    changedAt: new Date().toISOString(),
    nonce: randomNonce(),
  };

  var rawBody = JSON.stringify(payload);

  var timestamp = String(Date.now());

  var res;

  try {
    res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: rawBody,
      headers: {
        "X-Karti-Timestamp": timestamp,

        "X-Karti-Signature": hmacHex(secret, timestamp + "." + rawBody),
      },
      muteHttpExceptions: true,
    });
  } catch (err) {
    range.setNote("Karti sync failed (network). Please retry.");

    try {
      SpreadsheetApp.getActive().toast("Karti sync failed (network). Please retry.");
    } catch (e) {
      // Ignore.
    }

    return;
  }

  var code = res.getResponseCode();

  if (code >= 200 && code < 300) {
    range.clearNote();

    return;
  }

  var hint = "rejected";

  try {
    var body = JSON.parse(res.getContentText() || "{}");

    if (body && body.code) {
      hint = String(body.code);
    }
  } catch (err) {
    // Generic hint only.
  }

  range.setNote("Karti sync: " + hint + ". Fix the value and retry.");

  try {
    SpreadsheetApp.getActive().toast("Karti sync " + hint + ". Fix the value and retry.");
  } catch (e) {
    // Ignore.
  }
}
