import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SOCIAL_LINK_FIELDS } from "./social-icons";

describe("SOCIAL_LINK_FIELDS", () => {
  it("lists website, instagram, facebook, and tiktok in that order", () => {
    expect(SOCIAL_LINK_FIELDS.map((f) => f.key)).toEqual([
      "website",
      "instagram",
      "facebook",
      "tiktok",
    ]);
  });

  it("renders every field's icon without throwing", () => {
    for (const { icon: Icon } of SOCIAL_LINK_FIELDS) {
      expect(() => render(<Icon className="size-4" />)).not.toThrow();
    }
  });
});
