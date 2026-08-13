import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Info } from "lucide-react";
import { Section } from "./section";

describe("Section", () => {
  it("renders eyebrow, title, and children", () => {
    render(
      <Section icon={<Info />} eyebrow="Just for you" title="Display name">
        <div>field content</div>
      </Section>,
    );
    expect(screen.getByText("Just for you")).toBeInTheDocument();
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByText("field content")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(
      <Section icon={<Info />} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders icon as a passed-in element, not a component reference", () => {
    render(
      <Section icon={<span data-testid="my-icon" />} title="Stall name">
        <p>content</p>
      </Section>,
    );
    expect(screen.getByTestId("my-icon")).toBeInTheDocument();
  });

  it("renders without an eyebrow when none is given", () => {
    render(
      <Section icon={<span />} title="Stall name">
        <p>content</p>
      </Section>,
    );
    expect(screen.queryByText(/eyebrow/i)).not.toBeInTheDocument();
    // No eyebrow-styled element rendered at all - the header still shows only the title.
    expect(screen.getByText("Stall name")).toBeInTheDocument();
  });

  it("renders a description when provided, omits it when not", () => {
    const { rerender } = render(
      <Section icon={<Info />} eyebrow="e" title="t" description="extra info">
        <div />
      </Section>,
    );
    expect(screen.getByText("extra info")).toBeInTheDocument();

    rerender(
      <Section icon={<Info />} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    expect(screen.queryByText("extra info")).not.toBeInTheDocument();
  });

  it("renders an InfoTooltip trigger when a tooltip is provided, omits it when not", () => {
    const { rerender } = render(
      <Section icon={<Info />} eyebrow="e" title="Display name" tooltip="more detail">
        <div />
      </Section>,
    );
    expect(
      screen.getByRole("button", { name: "More about Display name" }),
    ).toBeInTheDocument();

    rerender(
      <Section icon={<Info />} eyebrow="e" title="Display name">
        <div />
      </Section>,
    );
    expect(
      screen.queryByRole("button", { name: "More about Display name" }),
    ).not.toBeInTheDocument();
  });

  it("renders a ReactNode tooltip's content when the tooltip is opened", async () => {
    const user = userEvent.setup();
    render(
      <Section
        icon={<span />}
        title="Stall name"
        tooltip={
          <span>
            Rich <strong data-testid="tooltip-rich-content">content</strong>
          </span>
        }
      >
        <p>content</p>
      </Section>,
    );
    await user.hover(screen.getByRole("button", { name: /more about stall name/i }));
    expect(await screen.findByTestId("tooltip-rich-content")).toBeInTheDocument();
  });

  it("merges a custom className onto the root element", () => {
    const { container } = render(
      <Section icon={<Info />} eyebrow="e" title="t" className="custom-class">
        <div />
      </Section>,
    );
    expect(container.firstChild).toHaveClass("custom-class");
    // still carries the base neutral card classes
    expect(container.firstChild).toHaveClass("rounded-xl", "border", "bg-card");
  });

  it("never uses a literal color, font, or radius value", () => {
    const { container } = render(
      <Section icon={<Info />} eyebrow="e" title="t">
        <div />
      </Section>,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(html).not.toMatch(/rounded-\[/);
  });

  it("wrapper: renders the wrapper's own output instead of the default <section> shell", () => {
    render(
      <Section
        icon={<span />}
        title="Stall name"
        wrapper={(content) => <article data-testid="custom-shell">{content}</article>}
      >
        <p>content</p>
      </Section>,
    );
    expect(screen.getByTestId("custom-shell")).toBeInTheDocument();
    expect(screen.getByText("Stall name")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("wrapper: the default section shell's classes are not applied when wrapper is set", () => {
    const { container } = render(
      <Section
        icon={<span />}
        title="Stall name"
        wrapper={(content) => <article>{content}</article>}
      >
        <p>content</p>
      </Section>,
    );
    expect(container.querySelector("section")).not.toBeInTheDocument();
    expect(container.querySelector("article")).toBeInTheDocument();
  });

  it("no wrapper: still renders the default <section> shell (regression guard)", () => {
    const { container } = render(
      <Section icon={<span />} title="Stall name">
        <p>content</p>
      </Section>,
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("wrapper: still keeps a gap between header and children even though the default section shell (and its own gap-4) is bypassed", () => {
    const { container } = render(
      <Section
        icon={<span />}
        title="Stall name"
        wrapper={(content) => <article data-testid="custom-shell">{content}</article>}
      >
        <p>content</p>
      </Section>,
    );
    const shell = screen.getByTestId("custom-shell");
    expect(shell.firstElementChild).toHaveClass("flex", "flex-col", "gap-4");
    expect(container.querySelector("header")?.parentElement).toBe(
      shell.firstElementChild,
    );
  });
});
