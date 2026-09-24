import { isShortMapsHost, sanitizeMapsLink } from "./sectionSettings";

/**
 * Phase 34.3 map-link helpers — pure and client-safe (no fetch, no DNS, no
 * server-only imports). Coordinate extraction never guesses: a URL yields
 * coordinates only from an explicit lat,lng pair in a known position.
 */

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

/** Operator-facing failure copy (shared by editor + server action). */
export const MAPS_DETECT_FAILURE_MESSAGE =
  "We couldn't detect the exact location from this link. Try copying the location again from your Maps app.";

function validCoords(latitude: number, longitude: number): MapCoordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function parsePair(text: string): MapCoordinates | null {
  const match = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(text);
  if (!match?.[1] || !match?.[2]) return null;
  return validCoords(Number(match[1]), Number(match[2]));
}

/**
 * Extract exact coordinates from a supported map URL. Supports:
 * - Google `@lat,lng` path pins and `q`/`query` coordinate pairs
 * - Apple `ll=lat,lng` (and coordinate `q`)
 * - OpenStreetMap `#map=z/lat/lng` fragments and `mlat`/`mlon` params
 * Returns null when no reliable exact location is present — never guesses.
 */
export function extractCoordinates(url: string): MapCoordinates | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // OSM `#map=z/lat/lng` fragment.
  const hashMatch = /^#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/?$/.exec(parsed.hash);
  if (hashMatch?.[1] && hashMatch?.[2]) {
    const coords = validCoords(Number(hashMatch[1]), Number(hashMatch[2]));
    if (coords) return coords;
  }

  // OSM `mlat` + `mlon` parameters.
  const mlat = parsed.searchParams.get("mlat");
  const mlon = parsed.searchParams.get("mlon");
  if (mlat !== null && mlon !== null) {
    const coords = validCoords(Number(mlat), Number(mlon));
    if (coords) return coords;
  }

  // Apple `ll=lat,lng`.
  const ll = parsed.searchParams.get("ll");
  if (ll !== null) {
    const coords = parsePair(ll);
    if (coords) return coords;
  }

  // `q` / `query` coordinate pairs (Google + Apple search links).
  for (const key of ["q", "query"]) {
    const value = parsed.searchParams.get(key);
    if (value !== null) {
      const coords = parsePair(value);
      if (coords) return coords;
    }
  }

  // Google `@lat,lng` path pins (path + hash both scanned).
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(`${parsed.pathname}${parsed.hash}`);
  if (at?.[1] && at?.[2]) {
    const coords = validCoords(Number(at[1]), Number(at[2]));
    if (coords) return coords;
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

export type MapLinkResolution =
  | { ok: true; latitude: number; longitude: number; resolvedUrl: string }
  | { ok: false; message: string };

/**
 * Full link → coordinates flow (pure orchestration; the server action
 * supplies real fetch/DNS). Short hosts resolve first; all other
 * allowlisted links extract directly. Never guesses, never geocodes.
 */
export async function resolveMapLink(
  rawUrl: string,
  deps: MapResolveDeps,
  timeoutMs = 8000,
): Promise<MapLinkResolution> {
  const clean = sanitizeMapsLink(rawUrl);
  if (!clean) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  let source = clean;
  let hostname = "";
  try {
    hostname = new URL(clean).hostname;
  } catch {
    return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  }
  if (isShortMapsHost(hostname)) {
    const resolved = await resolveShortUrl(clean, deps, timeoutMs);
    if (!resolved.ok) return { ok: false, message: resolved.message };
    source = resolved.finalUrl;
  }
  const coords = extractCoordinates(source);
  if (!coords) return { ok: false, message: MAPS_DETECT_FAILURE_MESSAGE };
  return { ok: true, latitude: coords.latitude, longitude: coords.longitude, resolvedUrl: source };
}
