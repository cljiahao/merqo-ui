import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoTooltip } from "./info-tooltip";

describe("InfoTooltip", () => {
  it("renders a trigger button with the given aria-label", () => {
    render(
      <InfoTooltip content="More detail" ariaLabel="More about this setting" />,
    );
    expect(
      screen.getByRole("button", { name: "More about this setting" }),
    ).toBeInTheDocument();
  });

  it("renders the default Info icon", () => {
    render(<InfoTooltip content="x" ariaLabel="y" />);
    const button = screen.getByRole("button", { name: "y" });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a custom icon when provided", () => {
    function CustomIcon({ className }: { className?: string }) {
      return <svg data-testid="custom-icon" className={className} />;
    }
    render(<InfoTooltip content="x" ariaLabel="y" icon={CustomIcon} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
