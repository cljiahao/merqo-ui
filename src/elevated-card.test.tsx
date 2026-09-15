import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ElevatedCard } from "./elevated-card";

describe("ElevatedCard", () => {
  it("renders children inside a div by default", () => {
    render(<ElevatedCard>content</ElevatedCard>);
    const el = screen.getByText("content");
    expect(el.tagName).toBe("DIV");
  });

  it("renders as the given element", () => {
    render(<ElevatedCard as="section">content</ElevatedCard>);
    expect(screen.getByText("content").tagName).toBe("SECTION");
  });

  it("merges a caller className with the base shadow/border classes", () => {
    render(<ElevatedCard className="px-7 py-6">content</ElevatedCard>);
    const el = screen.getByText("content");
    expect(el.className).toContain("px-7 py-6");
    expect(el.className).toContain("rounded-[20px]");
  });
});
