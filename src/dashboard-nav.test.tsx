import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardNav } from "./dashboard-nav";

const baseProps = {
  wordmark: <span>QKit</span>,
  navLinks: [
    { href: "/dashboard/orders", label: "Orders" },
    { href: "/dashboard/stats", label: "Stats" },
  ],
  vendor: { name: "Manfred" },
  signOutAction: vi.fn().mockResolvedValue(undefined),
  getHelp: { type: "mailto" as const, address: "support@merqo.app" },
  onFeedbackSubmit: vi.fn().mockResolvedValue(undefined),
};

describe("DashboardNav", () => {
  it("renders the wordmark", () => {
    render(<DashboardNav {...baseProps} />);
    expect(screen.getByText("QKit")).toBeInTheDocument();
  });

  it("renders the account menu trigger at all times", () => {
    render(<DashboardNav {...baseProps} />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
  });

  it("renders a burger button that toggles a mobile link panel with the given nav links", async () => {
    const user = userEvent.setup();
    render(<DashboardNav {...baseProps} />);

    const burger = screen.getByRole("button", { name: "Menu" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user.click(burger);
    const nav = screen.getByRole("navigation", { name: "Mobile" });
    expect(within(nav).getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/dashboard/orders",
    );
    expect(within(nav).getByRole("link", { name: "Stats" })).toHaveAttribute(
      "href",
      "/dashboard/stats",
    );
  });

  it("closes the mobile panel when a link is clicked", async () => {
    const user = userEvent.setup();
    render(<DashboardNav {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const nav = screen.getByRole("navigation", { name: "Mobile" });
    await user.click(within(nav).getByRole("link", { name: "Orders" }));

    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("also renders the same links inline for desktop viewports (sm:flex)", () => {
    render(<DashboardNav {...baseProps} />);
    // inline links exist in the DOM regardless of viewport (visibility is CSS-driven)
    const inlineLinks = screen.getAllByRole("link", { name: "Orders" });
    expect(inlineLinks.length).toBeGreaterThan(0);
  });
});
