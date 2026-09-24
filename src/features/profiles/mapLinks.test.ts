import { describe, expect, it } from "vitest";
import {
  extractCoordinates,
  isBlockedIpAddress,
  MAX_MAP_REDIRECTS,
  resolveMapLink,
  resolveShortUrl,
  type MapResolveDeps,
  type RedirectResponse,
} from "./mapLinks";

describe("extractCoordinates", () => {
  it("reads Google @lat,lng pins", () => {
    expect(
      extractCoordinates("https://www.google.com/maps/place/Agadir/@30.42775,-9.59814,15z"),
    ).toEqual({
      latitude: 30.42775,
      longitude: -9.59814,
    });
  });

  it("reads encoded q coordinate pairs", () => {
    expect(
      extractCoordinates("https://www.google.com/maps/search/?api=1&query=30.42%2C-9.6"),
    ).toEqual({
      latitude: 30.42,
      longitude: -9.6,
    });
  });

  it("reads Apple ll parameters", () => {
    expect(extractCoordinates("https://maps.apple.com/?ll=30.42,-9.6&q=Agadir")).toEqual({
      latitude: 30.42,
      longitude: -9.6,
    });
  });

  it("reads OpenStreetMap fragments and marker params", () => {
    expect(extractCoordinates("https://www.openstreetmap.org/#map=15/30.4277/-9.5981")).toEqual({
      latitude: 30.4277,
      longitude: -9.5981,
    });
    expect(
      extractCoordinates("https://www.openstreetmap.org/?mlat=30.42&mlon=-9.6#map=15/30.42/-9.6"),
    ).toEqual({
      latitude: 30.42,
      longitude: -9.6,
    });
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
): MapResolveDeps & {
  calls: { url: string; method: string }[];
} {
  const calls: { url: string; method: string }[] = [];
  return {
    calls,
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
  };
}

describe("resolveShortUrl SSRF safety", () => {
  it("follows a bounded allowlisted chain to Google", async () => {
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": {
        status: 302,
        location: "https://www.google.com/maps/place/A/@30.42,-9.6,15z",
      },
      "https://www.google.com/maps/place/A/@30.42,-9.6,15z": { status: 200, location: null },
    });
    const result = await resolveShortUrl("https://maps.app.goo.gl/abc", deps);
    expect(result).toEqual({
      ok: true,
      finalUrl: "https://www.google.com/maps/place/A/@30.42,-9.6,15z",
    });
    expect(deps.calls[0]).toMatchObject({ method: "HEAD" });
  });

  it("rejects non-HTTPS starts and unsupported domains", async () => {
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

  it("stops after too many redirects", async () => {
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

  it("fails on fetch errors and error statuses", async () => {
    const down: MapResolveDeps = {
      lookupFn: async () => "142.250.72.14",
      fetchFn: async () => {
        throw new Error("boom");
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
    const result = await resolveMapLink(
      "https://www.google.com/maps/place/A/@30.42,-9.6,15z",
      deps,
    );
    expect(result).toMatchObject({ ok: true, latitude: 30.42, longitude: -9.6 });
    expect(deps.calls).toHaveLength(0);
  });

  it("resolves short links then extracts coordinates", async () => {
    const deps = depsWith({
      "https://maps.app.goo.gl/abc": {
        status: 302,
        location: "https://www.google.com/maps/place/A/@30.42,-9.6,15z",
      },
      "https://www.google.com/maps/place/A/@30.42,-9.6,15z": { status: 200, location: null },
    });
    const result = await resolveMapLink("https://maps.app.goo.gl/abc", deps);
    expect(result).toMatchObject({
      ok: true,
      latitude: 30.42,
      longitude: -9.6,
      resolvedUrl: "https://www.google.com/maps/place/A/@30.42,-9.6,15z",
    });
  });

  it("fails closed with the shared message when nothing exact resolves", async () => {
    const deps = depsWith({});
    for (const url of [
      "https://www.google.com/maps/search/coffee",
      "https://evil.example.com/x",
      "javascript:alert(1)",
      "https://maps.apple.com/?q=Agadir",
    ]) {
      const result = await resolveMapLink(url, deps);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("couldn't detect the exact location");
      }
    }
  });
});
