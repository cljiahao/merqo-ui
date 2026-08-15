import type { AnchorHTMLAttributes } from "react";
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
  it("passes switchKits through to the account menu's Switch products submenu", async () => {
    const user = userEvent.setup();
    render(
      <DashboardNav
        {...baseProps}
        switchKits={[{ label: "loopkit", href: "https://loopkit-sg.vercel.app" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    await user.click(await screen.findByText(/switch products/i));
    const loopkit = await screen.findByRole("menuitem", { name: "loopkit" });
    expect(loopkit).toHaveAttribute("href", "https://loopkit-sg.vercel.app");
  });

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

  it("stamps data-tour=\"nav-menu\" on the mobile burger button", () => {
    render(<DashboardNav {...baseProps} navLinks={[]} />);
    expect(
      screen.getByRole("button", { name: /mobile navigation menu/i }),
    ).toHaveAttribute("data-tour", "nav-menu");
  });

  it("applies tourAnchor's return value as data-tour on each nav link when given", () => {
    render(
      <DashboardNav
        {...baseProps}
        navLinks={[{ href: "/dashboard", label: "Home" }]}
        tourAnchor={(href) => `nav-${href.split("/").pop()}`}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "data-tour",
      "nav-dashboard",
    );
  });

  it("does not set data-tour on links when tourAnchor is not given", () => {
    render(<DashboardNav {...baseProps} navLinks={[{ href: "/dashboard", label: "Home" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("data-tour");
  });

  it("marks the active link via aria-current when isActiveHref returns true", () => {
    render(
      <DashboardNav
        {...baseProps}
        navLinks={[
          { href: "/dashboard", label: "Home" },
          { href: "/dashboard/stats", label: "Stats" },
        ]}
        isActiveHref={(href) => href === "/dashboard"}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Stats" })).not.toHaveAttribute("aria-current");
  });

  it("no link has aria-current when isActiveHref is not given", () => {
    render(<DashboardNav {...baseProps} navLinks={[{ href: "/dashboard", label: "Home" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("active desktop link gets pill-style active classes (bg-primary/10 text-primary)", () => {
    render(
      <DashboardNav
        {...baseProps}
        navLinks={[{ href: "/dashboard", label: "Home" }]}
        isActiveHref={(href) => href === "/dashboard"}
      />,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveClass("bg-primary/10", "text-primary");
  });

  it("inactive desktop link does not get the pill-active classes", () => {
    render(
      <DashboardNav
        {...baseProps}
        navLinks={[{ href: "/dashboard", label: "Home" }]}
        isActiveHref={() => false}
      />,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).not.toHaveClass("bg-primary/10");
  });

  it("renders nav links (desktop and mobile) through a given LinkComponent instead of a plain <a>", async () => {
    const user = userEvent.setup();
    const CustomLink = ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} data-custom-link="true" {...rest}>
        {children}
      </a>
    );
    render(
      <DashboardNav
        {...baseProps}
        navLinks={[{ href: "/dashboard", label: "Home" }]}
        LinkComponent={CustomLink}
      />,
    );
    for (const link of screen.getAllByRole("link", { name: "Home" })) {
      expect(link).toHaveAttribute("data-custom-link", "true");
    }

    await user.click(screen.getByRole("button", { name: "Mobile navigation menu" }));
    const nav = screen.getByRole("navigation", { name: "Mobile navigation menu" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute(
      "data-custom-link",
      "true",
    );
  });

  it("defaults to a plain <a> when LinkComponent is not given", () => {
    render(<DashboardNav {...baseProps} navLinks={[{ href: "/dashboard", label: "Home" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("data-custom-link");
  });
});
