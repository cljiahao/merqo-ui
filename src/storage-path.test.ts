import { describe, expect, it } from "vitest";

import { storagePathFromPublicUrl } from "./storage-path";

const BASE = "https://abc.supabase.co/storage/v1/object/public";

describe("storagePathFromPublicUrl", () => {
  it("returns the object path for a public URL in the bucket", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars/v1/a1b2.webp`,
        "vendor-avatars",
      ),
    ).toBe("v1/a1b2.webp");
  });

  it("ignores a query string", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars/v1/a.webp?v=123`,
        "vendor-avatars",
      ),
    ).toBe("v1/a.webp");
  });

  it("decodes percent-encoded segments", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars/v1/my%20pic.jpg`,
        "vendor-avatars",
      ),
    ).toBe("v1/my pic.jpg");
  });

  it("returns null for an OAuth provider avatar", () => {
    expect(
      storagePathFromPublicUrl(
        "https://lh3.googleusercontent.com/a/ACg8ocK-photo=s96-c",
        "vendor-avatars",
      ),
    ).toBeNull();
  });

  it("returns null for a URL in a different bucket", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/booth-images/v1/a.webp`,
        "vendor-avatars",
      ),
    ).toBeNull();
  });

  it("does not match a bucket whose name only starts the same", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars-old/v1/a.webp`,
        "vendor-avatars",
      ),
    ).toBeNull();
  });

  it("returns null for a signed (non-public) URL", () => {
    expect(
      storagePathFromPublicUrl(
        "https://abc.supabase.co/storage/v1/object/sign/vendor-avatars/v1/a.webp?token=x",
        "vendor-avatars",
      ),
    ).toBeNull();
  });

  it.each([null, undefined, "", "not a url", `${BASE}/vendor-avatars/`])(
    "returns null for %j",
    (input) => {
      expect(storagePathFromPublicUrl(input, "vendor-avatars")).toBeNull();
    },
  );

  // The URL parser resolves dot-segments (including percent-encoded ones)
  // before we ever see the path, so a crafted URL either stays inside the
  // bucket or loses the bucket marker entirely.
  it("resolves dot-segments that stay inside the bucket", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars/v1/%2E%2E/other/a.webp`,
        "vendor-avatars",
      ),
    ).toBe("other/a.webp");
  });

  it("returns null for dot-segments that climb out of the bucket", () => {
    expect(
      storagePathFromPublicUrl(
        `${BASE}/vendor-avatars/%2E%2E/booth-images/v1/a.webp`,
        "vendor-avatars",
      ),
    ).toBeNull();
  });
});
