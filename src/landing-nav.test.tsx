import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingNav } from "./landing-nav";

describe("LandingNav", () => {
  it("renders the wordmark and end slots", () => {
    render(<LandingNav wordmark={<span>QKit</span>} end={<a href="/login">Sign in</a>} />);
    expect(screen.getByText("QKit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("wraps both slots in a header with the shared sticky/shape classes", () => {
    const { container } = render(<LandingNav wordmark={<span>Kit</span>} end={<span>End</span>} />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("sticky", "top-0", "z-20", "bg-background/85");
  });
});
