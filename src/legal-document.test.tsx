import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { LegalDocument, getNodeText } from "./legal-document";

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

describe("getNodeText", () => {
  it("extracts plain text unchanged", () => {
    expect(getNodeText("Who we are")).toBe("Who we are");
  });

  it("recursively extracts text from nested React elements (e.g. inline bold/code/link markdown)", () => {
    const children = [
      "The ",
      React.createElement("strong", { key: "b" }, "Vendor"),
      " Agreement (see ",
      React.createElement(
        "a",
        { key: "a", href: "#x" },
        React.createElement("code", { key: "c" }, "terms.md"),
      ),
      ")",
    ];
    expect(getNodeText(children)).toBe("The Vendor Agreement (see terms.md)");
  });

  it("skips null, undefined, and boolean children", () => {
    expect(getNodeText([null, undefined, false, "Hi", true])).toBe("Hi");
  });

  it("coerces numbers to strings", () => {
    expect(getNodeText([1, " item"])).toBe("1 item");
  });
});
