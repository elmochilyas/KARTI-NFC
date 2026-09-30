import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots policy", () => {
  it("allows locale roots and blocks operational paths", () => {
    const policy = robots();
    expect(policy.sitemap).toBe("http://localhost:3000/sitemap.xml");
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const allow = ("allow" in rule ? rule.allow : []) as string[];
    const disallow = ("disallow" in rule ? rule.disallow : []) as string[];
    expect(allow).toEqual(expect.arrayContaining(["/fr", "/ar", "/en"]));
    expect(disallow).toEqual(expect.arrayContaining(["/dashboard", "/login", "/t/", "/api/"]));
  });
});
