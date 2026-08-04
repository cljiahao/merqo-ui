import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TwoColumnSections } from "./two-column-sections";

describe("TwoColumnSections", () => {
  it("renders both columns", () => {
    render(
      <TwoColumnSections
        columnOne={<div>Column One Content</div>}
        columnTwo={<div>Column Two Content</div>}
      />,
    );
    expect(screen.getByText("Column One Content")).toBeInTheDocument();
    expect(screen.getByText("Column Two Content")).toBeInTheDocument();
  });

  it("never renders a CSS grid class on the wrapper", () => {
    // Regression guard: profile-settings-page-standard.md documents this
    // exact bug shipping twice in qkit (grid row-height coupling caused a
    // shorter section's row to wait on a taller row-mate). Two independent
    // flex-column stacks, not a grid, is the whole point of this component.
    const { container } = render(
      <TwoColumnSections columnOne={<div />} columnTwo={<div />} />,
    );
    expect(container.firstChild).not.toHaveClass("grid");
  });

  it("renders each column as its own independent flex stack", () => {
    const { container } = render(
      <TwoColumnSections columnOne={<div />} columnTwo={<div />} />,
    );
    const columns = container.firstElementChild?.children;
    expect(columns).toHaveLength(2);
    expect(columns?.[0]).toHaveClass("flex-1");
    expect(columns?.[1]).toHaveClass("flex-1");
  });
});
