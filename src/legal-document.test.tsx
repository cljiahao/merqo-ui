import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalDocument } from "./legal-document";

describe("LegalDocument", () => {
  it("renders the version/effective-date line, not a draft banner", () => {
    render(<LegalDocument doc="terms" />);
    expect(screen.getByText(/^Version \d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();
  });

  it("renders headings with stable, slugified ids for anchor links", () => {
    render(<LegalDocument doc="terms" />);
    const heading = screen.getByText("Who we are");
    expect(heading.id).toBe("who-we-are");
  });

  it("renders the end-customer notice", () => {
    render(<LegalDocument doc="end-customer-notice" />);
    expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument();
  });
});
