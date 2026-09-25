import { googleDirectionsUrl, isShortMapsHost, sanitizeMapsLink } from "./sectionSettings";

/**
 * Map-link helpers — pure and client-safe (no fetch, no DNS, no
 * server-only imports). Coordinate extraction never guesses: a URL yields
 * coordinates only from a trusted position, with an explicit source.
 *
 * Trusted Google priority (no-API resolver):
 *   1. `!3dLAT!4dLNG` place data — MUST win on any /place/ URL.
 *   2. Explicit numeric params `destination` / `query` / `q` / `ll`.
 *   3. `@LAT,LNG` — direct map URLs only; NEVER on /place/ URLs
 *      (map camera / viewport, not the place).
 *
 * Share-link flow for a normal Google Maps mobile link:
 *   maps.app.goo.gl/… → follow redirect(s) server-side → final Google URL
 *   → trusted extraction above → else check the resolved destination page
 *   metadata (canonical / og:url) with the same extractor. Page bodies are
 *   never scanned for arbitrary coordinate pairs.
 */

/** Where trusted coordinates came from. Every success carries one. */
export type MapCoordinateSource =
  | "google_place_coordinates"
  | "explicit_coordinates"
  | "direct_map_coordinates"
  | "apple_coordinates"
  | "osm_coordinates";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
  source: MapCoordinateSource;
};

export type MapProvider = "google" | "apple" | "osm";

/** Operator-facing failure copy (shared by editor + server action). */
export const MAPS_DETECT_FAILURE_MESSAGE =
  "We couldn't detect the exact location from this link. Try copying the location again from your Maps app.";

function validCoords(
  latitude: number,
  longitude: number,
  source: MapCoordinateSource,
): MapCoordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude, source };
}

/**
 * Strict `LAT,LNG` pair: the whole parameter value must be numeric
 * coordinates (optional surrounding whitespace). Text queries such as
 * place names never parse — callers fail closed on them.
 */
function parseStrictPair(text: string): { latitude: number; longitude: number } | null {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text);
  if (!match?.[1] || !match?.[2]) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

/**
 * Detect which map provider a URL belongs to. Returns null for anything
 * outside the allowlisted map hosts (same host rules as sanitizeMapsLink).
 */
export function detectMapProvider(rawUrl: string): MapProvider | null {
  let host = "";
  try {
    host = new URL(rawUrl.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "goo.gl" || host === "maps.app.goo.gl") return "google";
  if (/(^|\.)google\.[a-z.]+$/.test(host) || /(^|\.)maps\.google\.[a-z.]+$/.test(host)) {
    return "google";
  }
  if (host === "maps.apple.com") return "apple";
  if (host === "openstreetmap.org" || host === "www.openstreetmap.org") return "osm";
  return null;
}

/**
 * Extract exact coordinates from a supported map URL. Trusted sources only:
 * - OSM `#map=z/lat/lng` fragments and `mlat`/`mlon` params
 * - Apple `ll` / `q` / `query` numeric pairs
 * - Google, in strict priority:
 *   1. `!3dLAT!4dLNG` place data (must win on /place/ URLs),
 *   2. explicit numeric `destination` / `query` / `q` / `ll`,
 *   3. `@LAT,LNG` on direct map URLs only (never on /place/ URLs —
 *      that is the map camera / viewport, not the place).
 * Returns null when no trusted source is present — never guesses.
 */
export function extractCoordinates(url: string): MapCoordinates | null {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const provider = detectMapProvider(trimmed);
  if (!provider) return null;

  if (provider === "osm") {
    // OSM `#map=z/lat/lng` fragment.
    const hashMatch = /^#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/?$/.exec(parsed.hash);
    if (hashMatch?.[1] && hashMatch?.[2]) {
      const coords = validCoords(Number(hashMatch[1]), Number(hashMatch[2]), "osm_coordinates");
      if (coords) return coords;
    }

    // OSM `mlat` + `mlon` parameters.
    const mlat = parsed.searchParams.get("mlat");
    const mlon = parsed.searchParams.get("mlon");
    if (mlat !== null && mlon !== null) {
      const lat = Number(mlat);
      const lng = Number(mlon);
      const coords = validCoords(lat, lng, "osm_coordinates");
      // Present-but-malformed marker params fail closed.
      if (coords) return coords;
      return null;
    }
    return null;
  }

  if (provider === "apple") {
    // Apple explicit pairs only — never viewport guessing, never geocoding.
    for (const key of ["ll", "q", "query"]) {
      const value = parsed.searchParams.get(key);
      if (value !== null) {
        const pair = parseStrictPair(value);
        if (pair) return { ...pair, source: "apple_coordinates" };
      }
    }
    return null;
  }

  // ---- Google ----
  // PRIORITY 1 — encoded place data `!3dLAT!4dLNG` (raw URL scanned —
  // the `data=` payload is not URL-decoded by searchParams). Preferred
  // exact place coordinates; MUST win on /place/ URLs.
  const encoded = /!3d(-?\d+(?:\.\d+)?)[^!]*!4d(-?\d+(?:\.\d+)?)/.exec(trimmed);
  if (encoded?.[1] !== undefined && encoded?.[2] !== undefined) {
    const coords = validCoords(Number(encoded[1]), Number(encoded[2]), "google_place_coordinates");
    // A present-but-malformed !3d/!4d payload fails closed: never fall
    // through to the viewport @ pair on the same URL.
    if (coords) return coords;
    return null;
  }

  // PRIORITY 2 — explicit numeric coordinate parameters. Text values
  // (place names) fail closed via parseStrictPair and fall through.
  for (const key of ["destination", "query", "q", "ll"]) {
    const value = parsed.searchParams.get(key);
    if (value !== null) {
      const pair = parseStrictPair(value);
      if (pair) return { ...pair, source: "explicit_coordinates" };
    }
  }

  // PRIORITY 3 — `@LAT,LNG`. On /place/ URLs this is the map camera /
  // viewport, NOT the place — never use it there.
  const isPlaceUrl = parsed.pathname.toLowerCase().includes("/place/");
  if (isPlaceUrl) return null;
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(`${parsed.pathname}${parsed.hash}`);
  if (at?.[1] !== undefined && at?.[2] !== undefined) {
    return validCoords(Number(at[1]), Number(at[2]), "direct_map_coordinates");
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Resolved-page fallback (Google place URLs without URL coordinates)  */
/* ------------------------------------------------------------------ */

/** Maximum destination-page bytes scanned for coordinates. */
export const MAX_MAP_PAGE_BYTES = 512_000;

export type PageFetchResponse = {
  status: number;
  /** Raw Content-Type header value, or null when absent. */
  contentType: string | null;
  /** Page text (already truncated by the caller), or null when unreadable. */
  bodyText: string | null;
};

function attrValue(tag: string, attr: string): string | null {
  const match = new RegExp(`${attr}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(tag);
  return match?.[2] ?? null;
}

/** Candidate navigation URLs embedded in page metadata (canonical, og:url). */
function pageCandidateUrls(html: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/rel\s*=\s*["']canonical["']/i.test(tag)) {
      const href = attrValue(tag, "href");
      if (href) out.push(href);
    }
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/property\s*=\s*["']og:url["']/i.test(tag)) {
      const content = attrValue(tag, "content");
      if (content) out.push(content);
    }
  }
  return out;
}

/**
 * Check resolved destination-page HTML for coordinates WITHOUT executing
 * any page scripts and WITHOUT scanning the body for arbitrary pairs.
 * Only canonical / og:url metadata URLs are honored, re-checked with the
 * trusted URL extractor. Viewport coordinates, nearby POIs, localization
 * defaults, and JSON blobs in the markup can never become the place.
 */
export function extractCoordinatesFromPage(html: string, baseUrl: string): MapCoordinates | null {
  const source = html.slice(0, MAX_MAP_PAGE_BYTES);

  for (const candidate of pageCandidateUrls(source)) {
    try {
      const absolute = new URL(candidate, baseUrl).toString();
      const coords = extractCoordinates(absolute);
      if (coords) return coords;
    } catch {
      // Ignore malformed metadata URLs.
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* SSRF-safe short-link resolution (deps injected for tests)           */
/* ------------------------------------------------------------------ */

/** Maximum redirect hops followed for one short link. */
export const MAX_MAP_REDIRECTS = 4;

export type RedirectResponse = {
  status: number;
  /** Raw Location header value, or null when absent. */
  location: string | null;
};

export type MapResolveDeps = {
  fetchFn: (
    url: string,
    init: { method: string; redirect: "manual"; signal: AbortSignal },
  ) => Promise<RedirectResponse>;
  /** First resolved address for a hostname (A or AAAA). */
  lookupFn: (hostname: string) => Promise<string>;
  /**
   * Bounded destination-page fetch for the resolved-page fallback
   * (Google only). Optional — when absent, the fallback is skipped and
   * URL-only extraction applies. Must enforce the response size limit
   * and return truncated text.
   */
  fetchPageFn?: (url: string, init: { signal: AbortSignal }) => Promise<PageFetchResponse>;
};

export type ShortResolveOutcome = { ok: true; finalUrl: string } | { ok: false; message: string };

function isIPv4Literal(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function ipv4Blocked(octets: number[]): boolean {
  const [a = 0, b = 0] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function ipv6Blocked(value: string): boolean {
  const lower = value.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (lower === "::1" || lower === "::") return true;
  const head = lower.split(":")[0] ?? "";
  // fe80::/10 link-local, fc00::/7 unique-local, ff00::/8 multicast.
  return (
    head.startsWith("fe8") ||
    head.startsWith("fe9") ||
    head.startsWith("fea") ||
    head.startsWith("feb") ||
    head.startsWith("fc") ||
    head.startsWith("fd") ||
    head.startsWith("ff")
  );
}

/** True for loopback/private/link-local/reserved addresses. Exported for tests. */
export function isBlockedIpAddress(ip: string): boolean {
  const trimmed = ip.trim();
  if (trimmed === "") return true;
  if (isIPv4Literal(trimmed)) {
    const octets = trimmed.split(".").map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return true;
    return ipv4Blocked(octets);
  }
  if (trimmed.includes(":")) return ipv6Blocked(trimmed);
  return true;
}

/**
 * Follow a short maps link to its final URL without ever touching private
 * network space: HTTPS only, every hop allowlisted, DNS-verified per hop,
 * bounded hops, caller-owned timeout, no response bodies read.
 */
export async function resolveShortUrl(
  startUrl: string,
  deps: MapResolveDeps,
  timeoutMs = 8000,
): Promise<ShortResolveOutcome> {
  let current = startUrl.trim();
  let method = "HEAD";
  for (let hop = 0; hop <= MAX_MAP_REDIRECTS; hop += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    if (parsed.protocol !== "https:") {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    if (parsed.hostname.toLowerCase() === "localhost" || sanitizeMapsLink(current) === null) {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    let address: string;
    try {
      address = await deps.lookupFn(parsed.hostname);
    } catch {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    if (isBlockedIpAddress(address)) {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    let response: RedirectResponse;
    try {
      response = await deps.fetchFn(current, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
    }
    if (response.status === 405 && method === "HEAD") {
      method = "GET";
      hop -= 1;
      continue;
    }
    if (
      (response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308) &&
      response.location
    ) {
      if (hop >= MAX_MAP_REDIRECTS) {
        return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
      }
      try {
        current = new URL(response.location, current).toString();
      } catch {
        return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
      }
      method = "HEAD";
      continue;
    }
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, finalUrl: current };
    }
    return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  }
  return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
}

/**
 * Fetch a resolved destination page under the same SSRF envelope as the
 * redirect chain (HTTPS-only, allowlisted host, per-fetch DNS check,
 * caller-owned timeout, HTML-only, size-capped). Returns the page text or
 * null when anything is off. Never forwards cookies/auth headers, never
 * executes page scripts — the caller only regex-scans the returned text.
 */
async function fetchResolvedPageText(
  pageUrl: string,
  deps: MapResolveDeps,
  timeoutMs: number,
): Promise<string | null> {
  if (!deps.fetchPageFn) return null;
  let parsed: URL;
  try {
    parsed = new URL(pageUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.hostname.toLowerCase() === "localhost" || sanitizeMapsLink(pageUrl) === null) {
    return null;
  }
  try {
    const address = await deps.lookupFn(parsed.hostname);
    if (isBlockedIpAddress(address)) return null;
  } catch {
    return null;
  }
  let response: PageFetchResponse;
  try {
    response = await deps.fetchPageFn(pageUrl, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return null;
  }
  if (response.status < 200 || response.status >= 300) return null;
  if (response.contentType !== null && !/text\/html/i.test(response.contentType)) return null;
  if (typeof response.bodyText !== "string" || response.bodyText === "") return null;
  return response.bodyText.slice(0, MAX_MAP_PAGE_BYTES);
}

export type MapLinkResolution =
  | {
      ok: true;
      provider: MapProvider;
      latitude: number;
      longitude: number;
      /** Trusted origin of the coordinates — never unknown on success. */
      source: MapCoordinateSource;
      resolvedUrl: string;
      /** Google → directions URL; other providers → the resolved URL. */
      normalizedUrl: string;
    }
  | { ok: false; message: string };

function normalizedUrlFor(provider: MapProvider, source: string, coords: MapCoordinates): string {
  if (provider === "google") {
    return googleDirectionsUrl(coords.latitude, coords.longitude) ?? source;
  }
  return source;
}

/**
 * Google resolution: trusted URL patterns first, then the bounded
 * resolved-page fallback for place URLs that expose coordinates only in
 * page metadata (canonical / og:url). Never scans page bodies.
 */
async function resolveGoogleMaps(
  source: string,
  deps: MapResolveDeps,
  timeoutMs: number,
): Promise<MapLinkResolution> {
  const coords = extractCoordinates(source);
  if (coords) {
    return {
      ok: true,
      provider: "google",
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: coords.source,
      resolvedUrl: source,
      normalizedUrl: normalizedUrlFor("google", source, coords),
    };
  }
  const html = await fetchResolvedPageText(source, deps, timeoutMs);
  if (html !== null) {
    const pageCoords = extractCoordinatesFromPage(html, source);
    if (pageCoords) {
      return {
        ok: true,
        provider: "google",
        latitude: pageCoords.latitude,
        longitude: pageCoords.longitude,
        source: pageCoords.source,
        resolvedUrl: source,
        normalizedUrl: normalizedUrlFor("google", source, pageCoords),
      };
    }
  }
  return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
}

/** Apple Maps resolution: explicit URL pairs only, never guessed. */
function resolveAppleMaps(source: string): MapLinkResolution {
  const coords = extractCoordinates(source);
  if (!coords) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  return {
    ok: true,
    provider: "apple",
    latitude: coords.latitude,
    longitude: coords.longitude,
    source: coords.source,
    resolvedUrl: source,
    normalizedUrl: normalizedUrlFor("apple", source, coords),
  };
}

/** OpenStreetMap resolution: explicit URL pairs/fragments only. */
function resolveOpenStreetMap(source: string): MapLinkResolution {
  const coords = extractCoordinates(source);
  if (!coords) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  return {
    ok: true,
    provider: "osm",
    latitude: coords.latitude,
    longitude: coords.longitude,
    source: coords.source,
    resolvedUrl: source,
    normalizedUrl: normalizedUrlFor("osm", source, coords),
  };
}

/**
 * Full link → coordinates flow (pure orchestration; the server action
 * supplies real fetch/DNS). Short hosts resolve first; then the provider
 * dispatch runs (`resolveGoogleMaps` / `resolveAppleMaps` /
 * `resolveOpenStreetMap`). Never guesses, never geocodes.
 */
export async function resolveMapLink(
  rawUrl: string,
  deps: MapResolveDeps,
  timeoutMs = 8000,
): Promise<MapLinkResolution> {
  const clean = sanitizeMapsLink(rawUrl);
  if (!clean) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  const provider = detectMapProvider(clean);
  if (!provider) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  let source = clean;
  if (isShortMapsHost(new URL(clean).hostname)) {
    const resolved = await resolveShortUrl(clean, deps, timeoutMs);
    if (!resolved.ok) return { ok: false, message: resolved.message };
    source = resolved.finalUrl;
  }
  const finalProvider = detectMapProvider(source);
  if (!finalProvider) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  switch (finalProvider) {
    case "google":
      return resolveGoogleMaps(source, deps, timeoutMs);
    case "apple":
      return resolveAppleMaps(source);
    case "osm":
      return resolveOpenStreetMap(source);
  }
}

/**
 * Provider-dispatch entry point (spec §11 architecture). Same flow as
 * `resolveMapLink`; kept as a named alias so call sites can express
 * "detect provider → resolve per provider" explicitly.
 */
export const resolveMapLocation = resolveMapLink;
