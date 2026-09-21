import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  SAVE_CONTACT_ATTEMPT_KEY,
  SAVE_CONTACT_ATTEMPT_MAX_AGE_MS,
  SAVE_CONTACT_OPENING_TIMEOUT_MS,
  SaveContactAction,
  SaveContactFallback,
  buildInsertContactIntentUrl,
  buildViewDownloadsIntentUrl,
  consumeSaveAttempt,
  markSaveAttempt,
  shouldAttemptAndroidIntent,
  supportsVCardFileShare,
  vcardShareFilename,
  type InsertContactFields,
} from "./SaveContactAction";

const HREF = "/api/vcard/ahmed-benali.vcf";

const CONTACT: InsertContactFields = {
  name: "Ahmed Benali",
  phone: "+212600000000",
  email: "ahmed@example.com",
  company: "Atlas",
  title: "Developer",
};

function render(variant: "cta" | "sticky"): string {
  return renderToStaticMarkup(
    createElement(SaveContactAction, {
      href: HREF,
      accent: "#0e7c5b",
      variant,
      contact: CONTACT,
    }),
  );
}

describe("SaveContactAction", () => {
  it("targets the canonical vCard endpoint without a download attribute", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      expect(html).toContain(`href="${HREF}"`);
      expect(html).not.toMatch(/\bdownload\b/i);
    }
  });

  it("shows one clear Save Contact action with no technical wording", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      // Visible label is exactly Save Contact…
      expect(html).toContain(">Save Contact<");
      // …with no technical file-format words facing normal users.
      // (The href path legitimately contains `/api/vcard/`.)
      expect(html).not.toContain("Download file");
      expect(html).not.toContain(">VCF<");
      expect(html).not.toContain(">vCard<");
    }
  });

  it("navigates directly: no Blob download, no intent URL, no new tab", () => {
    for (const variant of ["cta", "sticky"] as const) {
      const html = render(variant);
      expect(html).not.toContain("intent://");
      expect(html).not.toContain("javascript:");
      // The Save anchor itself carries no target/download attributes.
      const anchors = html.match(/<a[^>]*href="\/api\/vcard[^"]*"[^>]*>/g) ?? [];
      expect(anchors).toHaveLength(1);
      for (const anchor of anchors) {
        expect(anchor).not.toMatch(/\btarget\s*=/i);
        expect(anchor).not.toMatch(/\bdownload\s*=/i);
      }
    }
  });

  it("waits a sane beat before offering the fallback", () => {
    expect(SAVE_CONTACT_OPENING_TIMEOUT_MS).toBeGreaterThanOrEqual(2000);
    expect(SAVE_CONTACT_OPENING_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });

  it("keeps the Downloads floor out of SSR markup (mount-gated, no hydration mismatch)", () => {
    for (const variant of ["cta", "sticky"] as const) {
      expect(render(variant)).not.toContain("Open Downloads");
    }
  });
});

describe("SaveContactFallback", () => {
  it("reuses the canonical endpoint when the native flow did not open", () => {
    const html = renderToStaticMarkup(createElement(SaveContactFallback, { href: HREF }));
    expect(html).toContain("Couldn");
    expect(html).toContain("open it from your notifications");
    expect(html).toContain(`href="${HREF}"`);
    // The fallback reuses the canonical endpoint as a plain same-tab link:
    // no forced-download attribute, no intent URL.
    expect(html).not.toMatch(/\bdownload\s*=/i);
    expect(html).not.toContain("intent://");
  });

  it("names the real next step instead of looping a silent download", () => {
    const html = renderToStaticMarkup(createElement(SaveContactFallback, { href: HREF }));
    expect(html).toContain("Download the file");
    expect(html).toContain("notifications");
  });

  it("surfaces the failing delivery path as a subtle diagnostic code", () => {
    for (const reason of ["S", "I", "D"] as const) {
      const html = renderToStaticMarkup(createElement(SaveContactFallback, { href: HREF, reason }));
      expect(html).toContain(`(${reason})`);
    }
    const withoutReason = renderToStaticMarkup(createElement(SaveContactFallback, { href: HREF }));
    expect(withoutReason).not.toMatch(/\([SID]\)/);
  });

  it("offers the guided Downloads floor only when wired", () => {
    const withButton = renderToStaticMarkup(
      createElement(SaveContactFallback, { href: HREF, reason: "I", onOpenDownloads: () => {} }),
    );
    expect(withButton).toContain("Open Downloads");
    expect(withButton).toContain("<button");
    expect(withButton).toContain('type="button"');
    const withoutButton = renderToStaticMarkup(
      createElement(SaveContactFallback, { href: HREF, reason: "I" }),
    );
    expect(withoutButton).not.toContain("Open Downloads");
    expect(withoutButton).not.toContain("<button");
  });
});

describe("buildViewDownloadsIntentUrl", () => {
  it("opens the system Downloads list with an encoded fallback", () => {
    expect(buildViewDownloadsIntentUrl("https://karti.app/ilyas-el-moch")).toBe(
      "intent:#Intent;action=android.intent.action.VIEW_DOWNLOADS" +
        ";S.browser_fallback_url=https%3A%2F%2Fkarti.app%2Filyas-el-moch;end",
    );
  });

  it("rejects malformed and non-HTTP(S) fallbacks", () => {
    expect(buildViewDownloadsIntentUrl("not a url")).toBeNull();
    expect(buildViewDownloadsIntentUrl("javascript:alert(1)")).toBeNull();
    expect(buildViewDownloadsIntentUrl("file:///sdcard/Download")).toBeNull();
  });
});

describe("vcardShareFilename", () => {
  it("keeps the .vcf name from suffixed hrefs", () => {
    expect(vcardShareFilename("/api/vcard/ahmed-benali.vcf")).toBe("ahmed-benali.vcf");
  });

  it("adds the suffix for extension-less hrefs and strips queries", () => {
    expect(vcardShareFilename("/api/vcard/ahmed-benali")).toBe("ahmed-benali.vcf");
    expect(vcardShareFilename("/api/vcard/ahmed-benali.vcf?x=1")).toBe("ahmed-benali.vcf");
  });

  it("falls back to a safe name for empty paths", () => {
    expect(vcardShareFilename("/")).toBe("karti-contact.vcf");
    expect(vcardShareFilename("")).toBe("karti-contact.vcf");
  });
});

describe("buildInsertContactIntentUrl", () => {
  const FALLBACK = "https://karti.app/ahmed-benali";

  it("opens the raw-contact editor with extras and an encoded fallback", () => {
    expect(
      buildInsertContactIntentUrl(
        {
          name: "Ahmed Benali",
          phone: "+212 600 000000",
          email: "ahmed@example.com",
          company: "Atlas, SARL",
          title: "Developer",
        },
        FALLBACK,
      ),
    ).toBe(
      "intent://vnd.android.cursor.dir/contact/" +
        "#Intent;action=android.intent.action.INSERT" +
        ";S.name=Ahmed%20Benali" +
        ";S.phone=%2B212%20600%20000000" +
        ";S.email=ahmed%40example.com" +
        ";S.company=Atlas%2C%20SARL" +
        ";S.job_title=Developer" +
        ";S.browser_fallback_url=https%3A%2F%2Fkarti.app%2Fahmed-benali;end",
    );
  });

  it("skips blank optional fields", () => {
    expect(buildInsertContactIntentUrl({ name: "Ahmed" }, FALLBACK)).toBe(
      "intent://vnd.android.cursor.dir/contact/" +
        "#Intent;action=android.intent.action.INSERT" +
        ";S.name=Ahmed" +
        ";S.browser_fallback_url=https%3A%2F%2Fkarti.app%2Fahmed-benali;end",
    );
    expect(
      buildInsertContactIntentUrl(
        { name: "Ahmed", phone: "   ", email: null, company: "", title: undefined },
        FALLBACK,
      ),
    ).toBe(
      "intent://vnd.android.cursor.dir/contact/" +
        "#Intent;action=android.intent.action.INSERT" +
        ";S.name=Ahmed" +
        ";S.browser_fallback_url=https%3A%2F%2Fkarti.app%2Fahmed-benali;end",
    );
  });

  it("neutralizes intent-breaking characters while keeping Unicode intact", () => {
    // A raw `;` would split the intent URI — it must arrive encoded.
    const intent = buildInsertContactIntentUrl({ name: "Doe; John", company: "A;B" }, FALLBACK);
    expect(intent).toContain("S.name=Doe%3B%20John");
    expect(intent).toContain("S.company=A%3BB");
    const arabic = buildInsertContactIntentUrl({ name: "أحمد بن علي" }, FALLBACK);
    expect(arabic).toContain(`S.name=${encodeURIComponent("أحمد بن علي")}`);
  });

  it("rejects blank names and non-HTTP(S) fallbacks", () => {
    expect(buildInsertContactIntentUrl({ name: "   " }, FALLBACK)).toBeNull();
    expect(buildInsertContactIntentUrl({ name: "Ahmed" }, "not a url")).toBeNull();
    expect(buildInsertContactIntentUrl({ name: "Ahmed" }, "javascript:alert(1)")).toBeNull();
  });
});

describe("save-attempt flag", () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return {
      getItem: (key: string): string | null => (key in data ? data[key] : null),
      setItem: (key: string, value: string): void => {
        data[key] = value;
      },
      removeItem: (key: string): void => {
        delete data[key];
      },
    };
  }

  it("round-trips an attempt exactly once", () => {
    const storage = fakeStorage();
    markSaveAttempt(storage, "insert");
    expect(storage.getItem(SAVE_CONTACT_ATTEMPT_KEY)).toContain('"insert"');
    expect(consumeSaveAttempt(storage)).toBe("insert");
    // Single-shot: already consumed.
    expect(consumeSaveAttempt(storage)).toBeNull();
  });

  it("ignores stale, malformed, and foreign payloads", () => {
    expect(consumeSaveAttempt(fakeStorage())).toBeNull();
    expect(consumeSaveAttempt(fakeStorage({ [SAVE_CONTACT_ATTEMPT_KEY]: "not-json" }))).toBeNull();
    expect(
      consumeSaveAttempt(fakeStorage({ [SAVE_CONTACT_ATTEMPT_KEY]: '{"kind":"nope","ts":1}' })),
    ).toBeNull();
    expect(
      consumeSaveAttempt(fakeStorage({ [SAVE_CONTACT_ATTEMPT_KEY]: '{"kind":"insert"}' })),
    ).toBeNull();
    const stale = fakeStorage();
    markSaveAttempt(stale, "view");
    expect(
      consumeSaveAttempt(stale, Date.now() + SAVE_CONTACT_ATTEMPT_MAX_AGE_MS + 1000),
    ).toBeNull();
  });

  it("survives hostile storage without throwing", () => {
    const throwing = {
      getItem: (): string | null => {
        throw new Error("denied");
      },
      setItem: (): void => {
        throw new Error("denied");
      },
      removeItem: (): void => {
        throw new Error("denied");
      },
    };
    expect(() => markSaveAttempt(throwing, "insert")).not.toThrow();
    expect(consumeSaveAttempt(throwing)).toBeNull();
  });

  it("keeps the key namespaced and the window sane", () => {
    expect(SAVE_CONTACT_ATTEMPT_KEY).toContain("karti:");
    expect(SAVE_CONTACT_ATTEMPT_MAX_AGE_MS).toBeGreaterThanOrEqual(60_000);
    expect(SAVE_CONTACT_ATTEMPT_MAX_AGE_MS).toBeLessThanOrEqual(600_000);
  });
});

describe("shouldAttemptAndroidIntent", () => {
  const CHROME_ANDROID =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
  const SAMSUNG =
    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/126.0.0.0 Mobile Safari/537.36";
  const FIREFOX_ANDROID = "Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0";
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const DESKTOP_CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

  it("allows Chrome on Android only", () => {
    expect(shouldAttemptAndroidIntent(CHROME_ANDROID)).toBe(true);
    expect(shouldAttemptAndroidIntent(SAMSUNG)).toBe(false);
    expect(shouldAttemptAndroidIntent(FIREFOX_ANDROID)).toBe(false);
    expect(shouldAttemptAndroidIntent(IPHONE)).toBe(false);
    expect(shouldAttemptAndroidIntent(DESKTOP_CHROME)).toBe(false);
  });

  it("honors an explicit Android platform hint", () => {
    expect(shouldAttemptAndroidIntent("Chrome/126.0.0.0", "Android")).toBe(true);
    expect(shouldAttemptAndroidIntent(CHROME_ANDROID, "Windows")).toBe(true);
  });
});

describe("supportsVCardFileShare", () => {
  it("reports false without share/canShare functions", () => {
    expect(supportsVCardFileShare({})).toBe(false);
    expect(supportsVCardFileShare({ share: async () => {} })).toBe(false);
  });

  it("defers to the platform canShare verdict", () => {
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => true,
      }),
    ).toBe(true);
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => false,
      }),
    ).toBe(false);
    expect(
      supportsVCardFileShare({
        share: async () => {},
        canShare: () => {
          throw new Error("unsupported");
        },
      }),
    ).toBe(false);
  });
});
