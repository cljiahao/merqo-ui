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

  it("privacy and pilot sources are their own file content", () => {
    expect(getLegalDocSource("privacy")).toContain("Our roles");
    expect(getLegalDocSource("pilot")).toContain("What this pilot is");
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
      isLegalCurrent(
        { terms: "2026-01-01", privacy: "2026-01-01" },
        { terms: "2026-09-04", privacy: "2026-09-04", pilot: "2026-09-04" },
      ),
    ).toBe(false);
  });

  it("is true when both accepted versions are current or newer", () => {
    expect(
      isLegalCurrent(
        { terms: "2026-09-04", privacy: "2026-09-04" },
        { terms: "2026-09-04", privacy: "2026-09-04", pilot: "2026-09-04" },
      ),
    ).toBe(true);
  });
});
