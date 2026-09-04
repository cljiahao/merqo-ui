// Regression guard for the version-skew finding: a released legal-doc
// version's content must never be silently edited. This test hashes each
// current document and compares it to a checked-in manifest; a content
// change with no version bump fails the test, forcing a version bump.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { getLegalDocSource, LEGAL_VERSIONS } from "./legal";
import manifest from "./legal/version-manifest.json";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

describe("legal document version manifest", () => {
  it("terms.md content hash matches the manifest for the current version", () => {
    expect(manifest[LEGAL_VERSIONS.terms]?.terms).toBe(sha256(getLegalDocSource("terms")));
  });

  it("privacy.md content hash matches the manifest for the current version", () => {
    expect(manifest[LEGAL_VERSIONS.privacy]?.privacy).toBe(
      sha256(getLegalDocSource("privacy")),
    );
  });
});
