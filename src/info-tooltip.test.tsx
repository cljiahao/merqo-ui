import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the tooltip content when the trigger is focused", async () => {
    // TooltipProvider's delayDuration defaults to 0 (src/ui/tooltip.tsx), so
    // focusing the trigger should open the tooltip without needing to fake
    // timers. This exercises test-setup.ts's pointer-capture/ResizeObserver
    // polyfills, which the Radix open path relies on.
    render(
      <InfoTooltip content="More detail" ariaLabel="More about this setting" />,
    );
    const trigger = screen.getByRole("button", {
      name: "More about this setting",
    });

    fireEvent.focus(trigger);

    await waitFor(() => {
      expect(screen.getByText("More detail")).toBeInTheDocument();
    });
  });

  it('ariaLabel defaults to "More info" when omitted', () => {
    render(<InfoTooltip content="Some detail" />);
    expect(
      screen.getByRole("button", { name: "More info" }),
    ).toBeInTheDocument();
  });

  it("trigger defaults to hover: renders inside a Tooltip, not a Popover", async () => {
    render(<InfoTooltip content="Some detail" ariaLabel="Detail" />);
    const trigger = screen.getByRole("button", { name: "Detail" });
    expect(screen.queryByText("Some detail")).not.toBeInTheDocument();
    await userEvent.hover(trigger);
    expect(await screen.findByText("Some detail")).toBeInTheDocument();
  });

  it('trigger="tap": content opens on click, not on hover', async () => {
    const user = userEvent.setup();
    render(
      <InfoTooltip content="Some detail" ariaLabel="Detail" trigger="tap" />,
    );
    const trigger = screen.getByRole("button", { name: "Detail" });
    await user.hover(trigger);
    expect(screen.queryByText("Some detail")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(await screen.findByText("Some detail")).toBeInTheDocument();
  });
});
