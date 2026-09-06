import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalFooterLinks } from "./legal-footer-links";

describe("LegalFooterLinks", () => {
  it("links to /legal/terms and /legal/privacy by default", () => {
    render(<LegalFooterLinks />);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("respects a custom basePath", () => {
    render(<LegalFooterLinks basePath="/en/legal" />);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/en/legal/terms",
    );
  });
});
