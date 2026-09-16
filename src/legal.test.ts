import { describe, it, expect } from "vitest";
import {
  LEGAL_VERSIONS,
  getLegalDocSource,
  getEndCustomerNoticeSource,
  isLegalCurrent,
} from "./legal";

describe("legal content getters", () => {
  it("terms source includes the base document and every kit schedule", () => {
    const source = getLegalDocSource("terms");
    expect(source).toContain("Who we are");
    expect(source).toContain("Annex: Per-Kit Schedules");
    for (const slug of ["qkit", "loopkit", "paykit", "stockkit", "printkit"]) {
      expect(source.toLowerCase()).toContain(slug);
    }
  });

  it("terms source scoped to one kit includes only that kit's schedule", () => {
    const source = getLegalDocSource("terms", "loopkit");
    expect(source).toContain("Who we are");
    expect(source).toContain("Annex: Schedule");
    expect(source).toContain("## loopkit schedule");
    for (const slug of ["qkit", "paykit", "stockkit", "printkit"]) {
      expect(source.toLowerCase()).not.toContain(`## ${slug} schedule`);
    }
  });

  it("privacy and pilot sources are their own file content", () => {
    expect(getLegalDocSource("privacy")).toContain("Our roles");
    expect(getLegalDocSource("pilot")).toContain("What this pilot is");
  });

  it("composed terms source has no leftover H1 lines from any schedule", () => {
    const source = getLegalDocSource("terms");
    const h1Lines = source.match(/^# .+$/gm) ?? [];
    // the only H1 in the composed document is the base ToS's own title
    expect(h1Lines).toEqual(["# Merqo Vendor Terms of Service"]);
  });

  it("demotes a schedule's own sub-headings by one level so they nest under its divider", () => {
    const source = getLegalDocSource("terms");
    // loopkit.md has "## Rewards are the Vendor's, not Merqo's" in its raw file
    expect(source).toContain("### Rewards are the Vendor's, not Merqo's");
    expect(source.split("\n")).not.toContain("## Rewards are the Vendor's, not Merqo's");
    // the per-schedule divider itself stays at H2
    expect(source).toContain("## loopkit schedule");
  });

  it("end-customer notice source is separate from the ToS", () => {
    expect(getEndCustomerNoticeSource()).toContain("Privacy Policy");
  });

  it("LEGAL_VERSIONS uses ISO YYYY-MM-DD strings", () => {
    for (const v of Object.values(LEGAL_VERSIONS)) {
      expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("isLegalCurrent", () => {
  it("is false when a doc was never accepted", () => {
    expect(isLegalCurrent({ terms: null, privacy: null })).toBe(false);
  });

  it("is false when an accepted version is older than required", () => {
    expect(
      isLegalCurrent({ terms: "2026-01-01", privacy: "2026-01-01" }, LEGAL_VERSIONS),
    ).toBe(false);
  });

  it("is true when both accepted versions are current or newer", () => {
    expect(
      isLegalCurrent(
        { terms: LEGAL_VERSIONS.terms, privacy: LEGAL_VERSIONS.privacy },
        LEGAL_VERSIONS,
      ),
    ).toBe(true);
  });
});
