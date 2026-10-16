import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ArrowGlyph,
  BlockedCircleIcon,
  CheckSealIcon,
  DemoSparkIcon,
  DirectTapMark,
  IdentityTapMark,
  ImagePlusMark,
  LinkChainIcon,
  OrderBagIcon,
  PackageIcon,
  PreorderClockIcon,
  SlidersIcon,
  StorefrontIcon,
  UserRoundIcon,
} from "./icons";

const MARKS = {
  IdentityTapMark,
  DirectTapMark,
  OrderBagIcon,
  PackageIcon,
  PreorderClockIcon,
  BlockedCircleIcon,
  UserRoundIcon,
  StorefrontIcon,
  LinkChainIcon,
  SlidersIcon,
  DemoSparkIcon,
  ImagePlusMark,
  CheckSealIcon,
  ArrowGlyph,
} as const;

describe("PDP icon set", () => {
  for (const [name, Mark] of Object.entries(MARKS)) {
    it(`${name} renders a decorative accessible SVG`, () => {
      const html = renderToStaticMarkup(Mark({}));
      expect(html).toContain("<svg");
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain("undefined");
    });
  }

  it("keeps profile and direct tap marks distinct", () => {
    const identity = renderToStaticMarkup(IdentityTapMark({}));
    const direct = renderToStaticMarkup(DirectTapMark({}));
    expect(identity).not.toBe(direct);
  });
});
