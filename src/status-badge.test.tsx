import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

type OrderStatus = "pending" | "confirmed";

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Waiting for you", className: "text-status-pending border-status-pending/35 bg-status-pending/12" },
  confirmed: { label: "Confirmed", className: "text-status-confirmed border-status-confirmed/35 bg-status-confirmed/12" },
};

describe("StatusBadge", () => {
  it("renders the label for the given status", () => {
    render(<StatusBadge status="pending" config={CONFIG} />);
    expect(screen.getByText("Waiting for you")).toBeInTheDocument();
  });

  it("applies that status's className", () => {
    render(<StatusBadge status="confirmed" config={CONFIG} />);
    const badge = screen.getByText("Confirmed").closest("span");
    expect(badge).toHaveClass("text-status-confirmed");
  });

  it("switches label and class when status changes", () => {
    const { rerender } = render(<StatusBadge status="pending" config={CONFIG} />);
    expect(screen.getByText("Waiting for you")).toBeInTheDocument();
    rerender(<StatusBadge status="confirmed" config={CONFIG} />);
    expect(screen.queryByText("Waiting for you")).not.toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("always renders the leading dot indicator", () => {
    render(<StatusBadge status="pending" config={CONFIG} />);
    const badge = screen.getByText("Waiting for you").closest("span");
    expect(badge?.querySelector("span.rounded-full.bg-current")).toBeInTheDocument();
  });
});
