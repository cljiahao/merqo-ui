import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { LegalDocument, getNodeText } from "./legal-document";

describe("LegalDocument", () => {
  it("renders a Back button that navigates back in browser history", async () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<LegalDocument doc="terms" />);
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(backSpy).toHaveBeenCalledOnce();
    backSpy.mockRestore();
  });

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

  it("renders the document's own H1 with a slugified id and styling", () => {
    render(<LegalDocument doc="terms" />);
    const heading = screen.getByText("Merqo Vendor Terms of Service");
    expect(heading.tagName).toBe("H1");
    expect(heading.id).toBe("merqo-vendor-terms-of-service");
    expect(heading.className).toContain("font-display");
    expect(heading.className).toContain("text-2xl");
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
