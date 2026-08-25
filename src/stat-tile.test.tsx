import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatTile, DeltaPill } from "./stat-tile";

describe("DeltaPill", () => {
  it("renders nothing for a null pct", () => {
    const { container } = render(<DeltaPill pct={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an up arrow and percentage for a positive pct", () => {
    render(<DeltaPill pct={12.4} />);
    expect(screen.getByText("12%")).toBeInTheDocument();
  });

  it("renders a down arrow and the default down color for a negative pct", () => {
    render(<DeltaPill pct={-8} />);
    const pill = screen.getByText("8%").closest("span");
    expect(pill).toHaveClass("bg-destructive/12");
  });

  it("applies a custom downClassName override", () => {
    render(<DeltaPill pct={-8} downClassName="bg-status-cancelled/12 text-status-cancelled" />);
    const pill = screen.getByText("8%").closest("span");
    expect(pill).toHaveClass("bg-status-cancelled/12");
    expect(pill).not.toHaveClass("bg-destructive/12");
  });

  it("applies the tooltip as a native title", () => {
    render(<DeltaPill pct={5} tooltip="vs the previous period" />);
    expect(screen.getByText("5%").closest("span")).toHaveAttribute("title", "vs the previous period");
  });
});

describe("StatTile", () => {
  it("renders label and value in label-above-value order by default", () => {
    render(<StatTile label="Revenue" value="$120" />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
  });

  it("renders value-above-label when reverse is set", () => {
    render(<StatTile label="Enrolled" value="42" reverse />);
    const root = screen.getByText("42").closest("div")?.parentElement;
    const children = Array.from(root?.children ?? []);
    const valueRowIndex = children.findIndex((c) => c.textContent?.includes("42"));
    const labelIndex = children.findIndex((c) => c.textContent === "Enrolled");
    expect(valueRowIndex).toBeLessThan(labelIndex);
  });

  it("renders a delta pill from a numeric delta prop", () => {
    render(<StatTile label="Orders" value="10" delta={7} />);
    expect(screen.getByText("7%")).toBeInTheDocument();
  });

  it("renders deltaSlot content instead of a pill when both could apply", () => {
    render(<StatTile label="Orders" value="10" delta={7} deltaSlot={<span>custom</span>} />);
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.queryByText("7%")).not.toBeInTheDocument();
  });

  it("renders a caption when provided", () => {
    render(<StatTile label="Revenue" value="$120" caption="$900 all time" />);
    expect(screen.getByText("$900 all time")).toBeInTheDocument();
  });

  it("applies valueClassName to the value element", () => {
    render(<StatTile label="Revenue" value="$120" valueClassName="font-mono" />);
    expect(screen.getByText("$120")).toHaveClass("font-mono");
  });

  it("renders valueTrailing content beside the value", () => {
    render(<StatTile label="Revenue" value="$120" valueTrailing={<span>flat</span>} />);
    expect(screen.getByText("flat")).toBeInTheDocument();
  });

  it("applies the hint as a native title on the root", () => {
    const { container } = render(<StatTile label="Fulfilled" value="8/10" hint="2 cancelled" />);
    expect(container.firstChild).toHaveAttribute("title", "2 cancelled");
  });
});
