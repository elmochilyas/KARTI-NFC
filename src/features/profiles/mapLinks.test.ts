import { describe, expect, it } from "vitest";
import {
  detectMapProvider,
  extractCoordinates,
  extractCoordinatesFromPage,
  isBlockedIpAddress,
  MAX_MAP_REDIRECTS,
  resolveMapLink,
  resolveMapLocation,
  resolveShortUrl,
  type MapResolveDeps,
  type PageFetchResponse,
  type RedirectResponse,
} from "./mapLinks";

describe("extractCoordinates", () => {
  it("A: place URL with viewport @ + place !3d/!4d uses the place (never the viewport)", () => {
    expect(
      extractCoordinates(
        "https://www.google.com/maps/place/Example/@33.5731,-7.5898,14z/data=!3m1!4b1!4m6!3m5!1s0x0!2s0x0!3d30.4278!4d-9.5981",
      ),
    ).toEqual({
      latitude: 30.4278,
      longitude: -9.5981,
      source: "google_place_coordinates",
    });
  });

  it("reads Google @lat,lng pins on direct (non-place) URLs only", () => {
    expect(extractCoordinates("https://www.google.com/maps/@30.42775,-9.59814,15z")).toEqual({
      latitude: 30.42775,
      longitude: -9.59814,
      source: "direct_map_coordinates",
    });
  });

  it("G: /place/ URL with only @ coordinates does not resolve (viewport is not the place)", () => {
    expect(
      extractCoordinates("https://www.google.com/maps/place/Agadir/@30.42775,-9.59814,15z"),
    ).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps/place/X/@91,0,15z")).toBeNull();
  });

  it("reads encoded q coordinate pairs", () => {
    expect(
      extractCoordinates("https://www.google.com/maps/search/?api=1&query=30.42%2C-9.6"),
    ).toEqual({
      latitude: 30.42,
      longitude: -9.6,
      source: "explicit_coordinates",
    });
  });

  it("reads Apple ll parameters", () => {
    expect(extractCoordinates("https://maps.apple.com/?ll=30.42,-9.6&q=Agadir")).toEqual({
      latitude: 30.42,
      longitude: -9.6,
      source: "apple_coordinates",
    });
  });

  it("reads Google encoded !3d/!4d place data with divergent viewport", () => {
    expect(
      extractCoordinates(
        "https://www.google.com/maps/place/Jet+Sakan/@33.5731,-7.5898,17z/data=!3m1!4b1!4m6!3m5!1s0x0!2s0x0!3d30.4278!4d-9.5981",
      ),
    ).toEqual({
      latitude: 30.4278,
      longitude: -9.5981,
      source: "google_place_coordinates",
    });
    // Encoded data without any @ pin still resolves.
    expect(
      extractCoordinates("https://www.google.com/maps/place/X/data=!3m1!4b1!3d33.5731!4d-7.5898"),
    ).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "google_place_coordinates",
    });
    // Out-of-range encoded values fail closed (never fall back to @).
    expect(
      extractCoordinates("https://www.google.com/maps/place/X/data=!3d91!4d-7.5898"),
    ).toBeNull();
    expect(
      extractCoordinates(
        "https://www.google.com/maps/place/X/@33.5731,-7.5898,17z/data=!3d91!4d-7.5898",
      ),
    ).toBeNull();
  });

  it("prefers !3d/!4d over explicit params on the same URL", () => {
    expect(
      extractCoordinates(
        "https://www.google.com/maps/place/X/data=!3d30.4278!4d-9.5981?q=33.5731,-7.5898",
      ),
    ).toEqual({
      latitude: 30.4278,
      longitude: -9.5981,
      source: "google_place_coordinates",
    });
  });

  it("C/D/E: reads q / query / destination / ll pairs on Google hosts", () => {
    expect(extractCoordinates("https://www.google.com/maps?q=33.5731,-7.5898")).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "explicit_coordinates",
    });
    expect(extractCoordinates("https://maps.google.com/?q=33.5731,-7.5898")).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "explicit_coordinates",
    });
    expect(extractCoordinates("https://www.google.com/maps?ll=33.5731,-7.5898")).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "explicit_coordinates",
    });
    expect(extractCoordinates("https://www.google.com/maps?query=33.5731,-7.5898")).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "explicit_coordinates",
    });
    expect(
      extractCoordinates("https://www.google.com/maps/dir/?api=1&destination=30.4278,-9.5981"),
    ).toEqual({
      latitude: 30.4278,
      longitude: -9.5981,
      source: "explicit_coordinates",
    });
  });

  it("F: direct map @ URL without /place/ is accepted", () => {
    expect(extractCoordinates("https://www.google.com/maps/@30.4278,-9.5981,17z")).toEqual({
      latitude: 30.4278,
      longitude: -9.5981,
      source: "direct_map_coordinates",
    });
  });

  it("rejects viewport-style center params and non-numeric query values", () => {
    expect(extractCoordinates("https://www.google.com/maps?center=33.5731,-7.5898")).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps/search/?api=1&query=Agadir")).toBeNull();
    expect(extractCoordinates("https://maps.apple.com/?q=Agadir")).toBeNull();
  });

  it("detects providers per allowlisted host", () => {
    expect(detectMapProvider("https://maps.app.goo.gl/abc")).toBe("google");
    expect(detectMapProvider("https://goo.gl/maps/abc")).toBe("google");
    expect(detectMapProvider("https://www.google.com/maps/place/X")).toBe("google");
    expect(detectMapProvider("https://maps.google.com/?q=1,2")).toBe("google");
    expect(detectMapProvider("https://maps.apple.com/?ll=1,2")).toBe("apple");
    expect(detectMapProvider("https://www.openstreetmap.org/#map=15/1/2")).toBe("osm");
    expect(detectMapProvider("https://evil.example.com/x")).toBeNull();
    expect(detectMapProvider("javascript:alert(1)")).toBeNull();
  });

  it("reads OpenStreetMap fragments and marker params", () => {
    expect(extractCoordinates("https://www.openstreetmap.org/#map=15/30.4277/-9.5981")).toEqual({
      latitude: 30.4277,
      longitude: -9.5981,
      source: "osm_coordinates",
    });
    expect(
      extractCoordinates("https://www.openstreetmap.org/?mlat=30.42&mlon=-9.6#map=15/30.42/-9.6"),
    ).toEqual({
      latitude: 30.42,
      longitude: -9.6,
      source: "osm_coordinates",
    });
  });

  it("I: rejects malformed latitude/longitude", () => {
    expect(extractCoordinates("https://www.google.com/maps?q=91,0")).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps?q=0,-181")).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps?q=NaN,0")).toBeNull();
    expect(
      extractCoordinates("https://www.google.com/maps/place/X/data=!3d91!4d-7.5898"),
    ).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps/@91,0,15z")).toBeNull();
  });

  it("never guesses: address-only, malformed, out-of-range, unsafe", () => {
    expect(extractCoordinates("https://www.google.com/maps/search/?api=1&query=Agadir")).toBeNull();
    expect(extractCoordinates("https://www.openstreetmap.org/#map=15")).toBeNull();
    expect(extractCoordinates("https://www.google.com/maps/place/X/@91,0,15z")).toBeNull();
    expect(extractCoordinates("not a url")).toBeNull();
    expect(extractCoordinates("javascript:alert(1)")).toBeNull();
    expect(extractCoordinates("https://maps.apple.com/?q=Agadir")).toBeNull();
  });
});

describe("isBlockedIpAddress", () => {
  it("blocks loopback, private, link-local and reserved ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.10.20",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "::",
      "fe80::1",
      "fc00::1",
      "fd00::1",
      "ff02::1",
      "",
      "999.1.1.1",
    ]) {
      expect(isBlockedIpAddress(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    expect(isBlockedIpAddress("142.250.72.14")).toBe(false);
    expect(isBlockedIpAddress("17.253.144.10")).toBe(false);
    expect(isBlockedIpAddress("2606:4700:4700::1111")).toBe(false);
  });
});

function depsWith(
  routes: Record<string, RedirectResponse>,
  ips: Record<string, string> = {},
  pages: Record<string, PageFetchResponse> = {},
): MapResolveDeps & {
  calls: { url: string; method: string }[];
  pageCalls: string[];
} {
  const calls: { url: string; method: string }[] = [];
  const pageCalls: string[] = [];
  return {
    calls,
    pageCalls,
    lookupFn: async (hostname: string) => ips[hostname] ?? "142.250.72.14",
    fetchFn: async (
      url: string,
      init: { method: string; redirect: "manual"; signal: AbortSignal },
    ) => {
      calls.push({ url, method: init.method });
      const route = routes[url];
      if (!route) throw new Error(`unexpected fetch ${url}`);
      return route;
    },
    fetchPageFn: async (url: string) => {
      pageCalls.push(url);
      const page = pages[url];
      if (!page) throw new Error(`unexpected page fetch ${url}`);
      return page;
    },
  };
}

describe("resolveShortUrl SSRF safety", () => {
  it("follows a bounded allowlisted chain to Google", async () => {
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": {
        status: 302,
        location: "https://www.google.com/maps/@30.42,-9.6,15z",
      },
      "https://www.google.com/maps/@30.42,-9.6,15z": { status: 200, location: null },
    });
    const result = await resolveShortUrl("https://maps.app.goo.gl/abc", deps);
    expect(result).toEqual({
      ok: true,
      finalUrl: "https://www.google.com/maps/@30.42,-9.6,15z",
    });
    expect(deps.calls[0]).toMatchObject({ method: "HEAD" });
  });

  it("L: rejects non-HTTPS starts and unsupported domains", async () => {
    const deps = depsWith({});
    expect((await resolveShortUrl("http://maps.app.goo.gl/abc", deps)).ok).toBe(false);
    expect((await resolveShortUrl("https://evil.example.com/x", deps)).ok).toBe(false);
    expect((await resolveShortUrl("javascript:alert(1)", deps)).ok).toBe(false);
  });

  it("blocks localhost, literal IPs and private DNS answers", async () => {
    const dns = depsWith({}, { "maps.app.goo.gl": "127.0.0.1" });
    expect((await resolveShortUrl("https://maps.app.goo.gl/abc", dns)).ok).toBe(false);
    expect(dns.calls).toHaveLength(0);

    const ip = depsWith({}, { "10.0.0.9": "10.0.0.9" });
    expect((await resolveShortUrl("https://10.0.0.9/x", ip)).ok).toBe(false);
  });

  it("stops when a redirect leaves the allowlist", async () => {
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": { status: 302, location: "https://evil.example.com/steal" },
    });
    expect((await resolveShortUrl("https://maps.app.goo.gl/abc", deps)).ok).toBe(false);
  });

  it("J: stops after too many redirects (redirect loop fails safely)", async () => {
    const routes: Record<string, RedirectResponse> = {};
    for (let i = 0; i <= MAX_MAP_REDIRECTS + 1; i += 1) {
      routes[`https://www.google.com/maps/r${i}`] = {
        status: 302,
        location: `https://www.google.com/maps/r${i + 1}`,
      };
    }
    const deps = depsWith(routes, { "www.google.com": "142.250.72.14" });
    const result = await resolveShortUrl("https://www.google.com/maps/r0", deps);
    expect(result.ok).toBe(false);
    expect(deps.calls.length).toBeLessThanOrEqual(MAX_MAP_REDIRECTS + 1);
  });

  it("K: fails on fetch errors (timeout) and error statuses", async () => {
    const down: MapResolveDeps = {
      lookupFn: async () => "142.250.72.14",
      fetchFn: async () => {
        throw new Error("timeout");
      },
    };
    expect((await resolveShortUrl("https://maps.app.goo.gl/abc", down)).ok).toBe(false);

    const gone = depsWith({ "https://maps.app.goo.gl/abc": { status: 404, location: null } });
    expect((await resolveShortUrl("https://maps.app.goo.gl/abc", gone)).ok).toBe(false);
  });

  it("retries HEAD rejections with GET", async () => {
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": {
        status: 302,
        location: "https://www.google.com/maps/place/A",
      },
      "https://www.google.com/maps/place/A": { status: 200, location: null },
    });
    let headRejected = false;
    const rejecting: MapResolveDeps = {
      ...deps,
      fetchFn: async (url, init) => {
        if (init.method === "HEAD" && !headRejected) {
          headRejected = true;
          return { status: 405, location: null };
        }
        return deps.fetchFn(url, init);
      },
    };
    const result = await resolveShortUrl("https://maps.app.goo.gl/abc", rejecting);
    expect(result.ok).toBe(true);
  });
});

describe("resolveMapLink", () => {
  it("extracts direct links without any fetch", async () => {
    const deps = depsWith({});
    const result = await resolveMapLink("https://www.google.com/maps/@30.42,-9.6,15z", deps);
    expect(result).toMatchObject({
      ok: true,
      latitude: 30.42,
      longitude: -9.6,
      source: "direct_map_coordinates",
    });
    expect(deps.calls).toHaveLength(0);
  });

  it("B: resolves short links to the exact !3d/!4d place (viewport ignored)", async () => {
    const final =
      "https://www.google.com/maps/place/Example/@33.5731,-7.5898,14z/data=!3m1!4b1!4m6!3m5!1s0x0!2s0x0!3d30.4278!4d-9.5981";
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": { status: 302, location: final },
      [final]: { status: 200, location: null },
    });
    const result = await resolveMapLink("https://maps.app.goo.gl/abc", deps);
    expect(result).toMatchObject({
      ok: true,
      provider: "google",
      latitude: 30.4278,
      longitude: -9.5981,
      source: "google_place_coordinates",
      resolvedUrl: final,
      normalizedUrl: "https://www.google.com/maps/dir/?api=1&destination=30.4278%2C-9.5981",
    });
    expect(deps.pageCalls).toHaveLength(0);
  });

  it("resolves short links to encoded !3d/!4d place URLs", async () => {
    const final = "https://www.google.com/maps/place/Jet/data=!3m1!4b1!3d33.5731!4d-7.5898";
    const deps = depsWith({
      "https://maps.app.goo.gl/xyz": { status: 302, location: final },
      [final]: { status: 200, location: null },
    });
    const result = await resolveMapLink("https://maps.app.goo.gl/xyz", deps);
    expect(result).toMatchObject({
      ok: true,
      provider: "google",
      latitude: 33.5731,
      longitude: -7.5898,
      source: "google_place_coordinates",
      resolvedUrl: final,
    });
    expect(deps.pageCalls).toHaveLength(0);
  });

  it("falls back to canonical metadata when the final URL has no coordinates", async () => {
    const final = "https://www.google.com/maps/place/Jet+Sakan+Hay+Salam/0x123";
    const deps = depsWith(
      {
        "https://maps.app.goo.gl/abc": { status: 302, location: final },
        [final]: { status: 200, location: null },
      },
      {},
      {
        [final]: {
          status: 200,
          contentType: "text/html; charset=utf-8",
          bodyText:
            '<html><head><link rel="canonical" href="https://www.google.com/maps/place/Jet/data=!3m1!4b1!3d33.5731!4d-7.5898"></head></html>',
        },
      },
    );
    const result = await resolveMapLink("https://maps.app.goo.gl/abc", deps);
    expect(result).toMatchObject({
      ok: true,
      provider: "google",
      latitude: 33.5731,
      longitude: -7.5898,
      source: "google_place_coordinates",
      resolvedUrl: final,
      normalizedUrl: "https://www.google.com/maps/dir/?api=1&destination=33.5731%2C-7.5898",
    });
  });

  it("H: HTML containing unrelated coordinate pairs yields NO coordinates", async () => {
    const base = "https://www.google.com/maps/place/X";
    // Viewport pins, query blobs, and lat/lng JSON in the body are ignored.
    expect(
      extractCoordinatesFromPage(
        '<html><head><title>X</title></head><body><div data-c="view @37.7749,-122.4194 zoom 10">nearby !3d37.7749!4d-122.4194 ?q=37.77,-122.41 {"latitude":37.7749,"longitude":-122.4194}</div></body></html>',
        base,
      ),
    ).toBeNull();
    // A canonical metadata URL with trusted !3d/!4d still resolves.
    expect(
      extractCoordinatesFromPage(
        '<html><head><link rel="canonical" href="https://www.google.com/maps/place/Jet/data=!3m1!4b1!3d33.5731!4d-7.5898"></head><body>Hello Agadir</body></html>',
        base,
      ),
    ).toEqual({
      latitude: 33.5731,
      longitude: -7.5898,
      source: "google_place_coordinates",
    });
    // A canonical /place/ URL with only a viewport @ stays unresolved.
    expect(
      extractCoordinatesFromPage(
        '<html><head><link rel="canonical" href="https://www.google.com/maps/place/Jet/@33.5731,-7.5898,17z"></head></html>',
        base,
      ),
    ).toBeNull();
    expect(extractCoordinatesFromPage("<html><body>Hello Agadir</body></html>", base)).toBeNull();
  });

  it("does not rescue a /place/ viewport URL with decoy page bodies", async () => {
    const final = "https://www.google.com/maps/place/OnlyViewport/@33.5731,-7.5898,17z";
    const deps = depsWith(
      {
        "https://maps.app.goo.gl/vp": { status: 302, location: final },
        [final]: { status: 200, location: null },
      },
      {},
      {
        [final]: {
          status: 200,
          contentType: "text/html; charset=utf-8",
          bodyText:
            '<html><body>viewport @38.9,-77.4 server default {"latitude":38.9072,"longitude":-77.0369} !3d38.9072!4d-77.0369</body></html>',
        },
      },
    );
    expect((await resolveMapLink("https://maps.app.goo.gl/vp", deps)).ok).toBe(false);
  });

  it("fails closed on non-HTML pages, page errors, and timeouts", async () => {
    const final = "https://www.google.com/maps/place/NoCoords/0x123";
    const routes = {
      "https://maps.app.goo.gl/a": { status: 302, location: final },
      [final]: { status: 200, location: null },
    };
    // Non-HTML content type.
    const pdf = depsWith(
      routes,
      {},
      { [final]: { status: 200, contentType: "application/pdf", bodyText: "x" } },
    );
    expect((await resolveMapLink("https://maps.app.goo.gl/a", pdf)).ok).toBe(false);
    // Page fetch throws (timeout / network).
    const down: MapResolveDeps = {
      lookupFn: async () => "142.250.72.14",
      fetchFn: async (url) => {
        if (url === "https://maps.app.goo.gl/a") return { status: 302, location: final };
        return { status: 200, location: null };
      },
      fetchPageFn: async () => {
        throw new Error("timeout");
      },
    };
    expect((await resolveMapLink("https://maps.app.goo.gl/a", down)).ok).toBe(false);
    // No page fetcher configured → URL-only extraction, no crash.
    const bare = depsWith(routes);
    const failing = await resolveMapLink("https://maps.app.goo.gl/a", {
      lookupFn: bare.lookupFn,
      fetchFn: bare.fetchFn,
    });
    expect(failing.ok).toBe(false);
  });

  it("never page-fetches off-allowlist or Apple/OSM links", async () => {
    const deps = depsWith({});
    const apple = await resolveMapLink("https://maps.apple.com/?ll=30.42,-9.6", deps);
    expect(apple).toMatchObject({
      ok: true,
      provider: "apple",
      source: "apple_coordinates",
      normalizedUrl: "https://maps.apple.com/?ll=30.42,-9.6",
    });
    expect(deps.pageCalls).toHaveLength(0);
    const osm = await resolveMapLink("https://www.openstreetmap.org/#map=15/30.42/-9.6", deps);
    expect(osm).toMatchObject({
      ok: true,
      provider: "osm",
      source: "osm_coordinates",
    });
    expect(deps.pageCalls).toHaveLength(0);
  });

  it("resolveMapLocation dispatches per provider", async () => {
    const deps = depsWith({});
    expect(
      await resolveMapLocation("https://www.google.com/maps?q=33.5731,-7.5898", deps),
    ).toMatchObject({ ok: true, provider: "google", source: "explicit_coordinates" });
  });

  it("L: rejects unsupported domains without fetching", async () => {
    const deps = depsWith({});
    const result = await resolveMapLink("https://evil.example.com/place/X", deps);
    expect(result.ok).toBe(false);
    expect(deps.calls).toHaveLength(0);
    expect(deps.pageCalls).toHaveLength(0);
  });

  it("fails closed with the shared message when nothing exact resolves", async () => {
    const deps = depsWith({});
    for (const url of [
      "https://www.google.com/maps/search/coffee",
      "https://evil.example.com/x",
      "javascript:alert(1)",
      "https://maps.apple.com/?q=Agadir",
      "https://www.google.com/maps/place/ViewportOnly/@33.5731,-7.5898,17z",
    ]) {
      const result = await resolveMapLink(url, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("couldn't detect the exact location");
      }
    }
  });
});
