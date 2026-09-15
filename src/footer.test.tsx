import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./footer";

describe("Footer", () => {
  it("renders the given wordmark, tagline, and kit-name copyright", () => {
    render(
      <Footer
        wordmark={<a href="/">QKit</a>}
        tagline="Built for booths."
        kitName="qkit"
      />,
    );
    expect(screen.getByRole("link", { name: "QKit" })).toBeInTheDocument();
    expect(screen.getByText("Built for booths.")).toBeInTheDocument();
    expect(screen.getByText("© 2026 qkit · a Merqo kit")).toBeInTheDocument();
  });

  it("renders About, legal, and sign-in links", () => {
    render(
      <Footer wordmark={<a href="/">Kit</a>} tagline="t" kitName="kit" />,
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(
      screen.getByRole("link", { name: /vendor sign in/i }),
    ).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
  });
});
