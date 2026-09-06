import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutMerqo } from "./about-merqo";

describe("AboutMerqo", () => {
  it("renders the origin story", () => {
    render(<AboutMerqo />);
    expect(screen.getByText("Why Merqo")).toBeInTheDocument();
    expect(
      screen.getByText(/wedding, in the queue for a coffee cart/),
    ).toBeInTheDocument();
  });

  it("does not name the reader's kit when kitName is omitted", () => {
    render(<AboutMerqo />);
    expect(screen.queryByText(/one kit in that/)).not.toBeInTheDocument();
  });

  it("names the reader's kit when kitName is given", () => {
    render(<AboutMerqo kitName="qkit" />);
    expect(screen.getByText(/reading this on qkit/)).toBeInTheDocument();
  });

  it("renders children (a caller-supplied CTA) inside its own container", () => {
    render(
      <AboutMerqo>
        <button>See the kits</button>
      </AboutMerqo>,
    );
    expect(screen.getByRole("button", { name: "See the kits" })).toBeInTheDocument();
  });
});
