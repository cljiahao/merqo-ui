import { describe, it, expect } from "vitest";
import { KIT_FAMILY, getSwitchKits } from "./kit-family";

describe("KIT_FAMILY", () => {
  it("lists all four live kits with a slug/name/url", () => {
    expect(KIT_FAMILY.map((k) => k.slug).sort()).toEqual([
      "loopkit",
      "paykit",
      "qkit",
      "stockkit",
    ]);
    for (const kit of KIT_FAMILY) {
      expect(kit.url).toMatch(/^https:\/\/[a-z]+-sg\.vercel\.app$/);
    }
  });
});

describe("getSwitchKits", () => {
  it("returns the other three kits, excluding the current one", () => {
    const result = getSwitchKits("qkit");
    expect(result).toHaveLength(3);
    expect(result.map((k) => k.label).sort()).toEqual([
      "loopkit",
      "paykit",
      "stockkit",
    ]);
    expect(result.every((k) => k.href.startsWith("https://"))).toBe(true);
  });

  it("fails open to the full family for an unrecognized slug", () => {
    expect(getSwitchKits("shopkit")).toHaveLength(4);
  });
});
