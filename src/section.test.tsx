import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { Section } from "./section";

describe("Section", () => {
  it("renders eyebrow, title, and children", () => {
    render(
      <Section icon={Info} eyebrow="Just for you" title="Display name">
        <div>field content</div>
      </Section>,
    );
    expect(screen.getByText("Just for you")).toBeInTheDocument();
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByText("field content")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(
      <Section icon={Info} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a description when provided, omits it when not", () => {
    const { rerender } = render(
      <Section icon={Info} eyebrow="e" title="t" description="extra info">
        <div />
      </Section>,
    );
    expect(screen.getByText("extra info")).toBeInTheDocument();

    rerender(
      <Section icon={Info} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    expect(screen.queryByText("extra info")).not.toBeInTheDocument();
  });

  it("renders an InfoTooltip trigger when a tooltip is provided, omits it when not", () => {
    const { rerender } = render(
      <Section icon={Info} eyebrow="e" title="Display name" tooltip="more detail">
        <div />
      </Section>,
    );
    expect(
      screen.getByRole("button", { name: "More about Display name" }),
    ).toBeInTheDocument();

    rerender(
      <Section icon={Info} eyebrow="e" title="Display name">
        <div />
      </Section>,
    );
    expect(
      screen.queryByRole("button", { name: "More about Display name" }),
    ).not.toBeInTheDocument();
  });

  it("merges a custom className onto the root element", () => {
    const { container } = render(
      <Section icon={Info} eyebrow="e" title="t" className="custom-class">
        <div />
      </Section>,
    );
    expect(container.firstChild).toHaveClass("custom-class");
    // still carries the base neutral card classes
    expect(container.firstChild).toHaveClass("rounded-xl", "border", "bg-card");
  });

  it("never uses a literal color, font, or radius value", () => {
    const { container } = render(
      <Section icon={Info} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(html).not.toMatch(/rounded-\[/);
  });
});
