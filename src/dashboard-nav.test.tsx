import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardNav } from "./dashboard-nav";

const signOutAction = vi.fn().mockResolvedValue(undefined);
const onFeedbackSubmit = vi.fn().mockResolvedValue(undefined);

const baseProps = {
  wordmark: <span>QKit</span>,
  navLinks: [
    { href: "/dashboard/orders", label: "Orders" },
    { href: "/dashboard/stats", label: "Stats" },
  ],
  vendor: { name: "Manfred" },
  signOutAction,
  getHelp: { type: "mailto" as const, address: "support@merqo.app" },
  onFeedbackSubmit,
};

beforeEach(() => {
  vi.clearAllMocks();
  signOutAction.mockResolvedValue(undefined);
  onFeedbackSubmit.mockResolvedValue(undefined);
});

describe("DashboardNav", () => {
  it("renders the wordmark", () => {
    render(<DashboardNav {...baseProps} />);
    expect(screen.getByText("QKit")).toBeInTheDocument();
  });

  it("renders the account menu trigger at all times", () => {
    render(<DashboardNav {...baseProps} />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
  });

  it("renders a burger button with aria-expanded/aria-controls that toggles a mobile link panel with the given nav links", async () => {
    const user = userEvent.setup();
    render(<DashboardNav {...baseProps} />);

    const burger = screen.getByRole("button", { name: "Mobile navigation menu" });
    expect(burger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation menu" })).not.toBeInTheDocument();

    await user.click(burger);
    expect(burger).toHaveAttribute("aria-expanded", "true");
    const nav = screen.getByRole("navigation", { name: "Mobile navigation menu" });
    expect(burger).toHaveAttribute("aria-controls", nav.id);
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

    await user.click(screen.getByRole("button", { name: "Mobile navigation menu" }));
    const nav = screen.getByRole("navigation", { name: "Mobile navigation menu" });
    await user.click(within(nav).getByRole("link", { name: "Orders" }));

    expect(screen.queryByRole("navigation", { name: "Mobile navigation menu" })).not.toBeInTheDocument();
  });

  it("I7: renders a tap-away scrim that closes the panel when clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<DashboardNav {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Mobile navigation menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile navigation menu" })).toBeInTheDocument();

    const scrim = container.querySelector('[aria-hidden="true"]');
    expect(scrim).not.toBeNull();
    await user.click(scrim as Element);

    expect(screen.queryByRole("navigation", { name: "Mobile navigation menu" })).not.toBeInTheDocument();
  });

  it("I7: closes the mobile panel on Escape", async () => {
    const user = userEvent.setup();
    render(<DashboardNav {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Mobile navigation menu" }));
    expect(screen.getByRole("navigation", { name: "Mobile navigation menu" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Mobile navigation menu" })).not.toBeInTheDocument();
  });

  it("also renders the same links inline for desktop viewports (sm:flex)", () => {
    render(<DashboardNav {...baseProps} />);
    // inline links exist in the DOM regardless of viewport (visibility is CSS-driven)
    const inlineLinks = screen.getAllByRole("link", { name: "Orders" });
    expect(inlineLinks.length).toBeGreaterThan(0);
  });
});
