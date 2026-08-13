import type { AnchorHTMLAttributes } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountMenu } from "./account-menu";

const signOutAction = vi.fn().mockResolvedValue(undefined);
const onFeedbackSubmit = vi.fn().mockResolvedValue(undefined);

const baseProps = {
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

async function openMenu(props: Partial<Parameters<typeof AccountMenu>[0]> = {}) {
  const user = userEvent.setup();
  render(<AccountMenu {...baseProps} {...props} />);
  await user.click(screen.getByRole("button", { name: /account menu/i }));
  return user;
}

describe("AccountMenu", () => {
  it("renders the trigger with the vendor name", () => {
    render(<AccountMenu {...baseProps} />);
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
  });

  it("shows Profile linking to /dashboard/profile", async () => {
    await openMenu();
    const profile = await screen.findByRole("menuitem", { name: /profile/i });
    expect(profile).toHaveAttribute("href", "/dashboard/profile");
  });

  it("omits kit-local settings when no href is given", async () => {
    await openMenu();
    await screen.findByRole("menuitem", { name: /profile/i });
    expect(screen.queryByRole("menuitem", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("shows kit-local settings linking to the given href when one is provided", async () => {
    await openMenu({ kitLocalSettingsHref: "/dashboard/board" });
    const settings = await screen.findByRole("menuitem", { name: /settings/i });
    expect(settings).toHaveAttribute("href", "/dashboard/board");
  });

  it("shows Plan by default", async () => {
    await openMenu();
    expect(await screen.findByRole("menuitem", { name: /plan/i })).toBeInTheDocument();
  });

  it("hides Plan when showPlanItem is false", async () => {
    await openMenu({ showPlanItem: false });
    // give the dropdown a tick to open before asserting absence
    await screen.findByRole("menuitem", { name: /profile/i });
    expect(screen.queryByRole("menuitem", { name: /plan/i })).not.toBeInTheDocument();
  });

  it("renders a mailto Get help item for mode 'mailto'", async () => {
    await openMenu();
    const helpLink = await screen.findByRole("menuitem", { name: /get help/i });
    expect(helpLink).toHaveAttribute("href", "mailto:support@merqo.app");
  });

  it("mode 'drawer': clicking Get help opens a sheet with the given content", async () => {
    const user = await openMenu({
      getHelp: { type: "drawer", content: <p>Custom help content</p> },
    });
    const helpItem = await screen.findByRole("menuitem", { name: /get help/i });
    await user.click(helpItem);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Custom help content")).toBeInTheDocument();
  });

  it("mode 'form': clicking Get help opens the shared HelpSheet form and submits through it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = await openMenu({ getHelp: { type: "form", onSubmit } });
    const helpItem = await screen.findByRole("menuitem", { name: /get help/i });
    await user.click(helpItem);

    await user.type(await screen.findByLabelText(/message/i), "I'm stuck");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({ message: "I'm stuck" });
  });

  it("mode 'submenu': renders a Get help submenu trigger with the given items as links", async () => {
    const user = await openMenu({
      getHelp: {
        type: "submenu",
        items: [
          { label: "FAQ", href: "/help/faq" },
          { label: "Contact", href: "/help/contact" },
        ],
      },
    });
    const subTrigger = await screen.findByText(/get help/i);
    await user.click(subTrigger);

    const faq = await screen.findByRole("menuitem", { name: "FAQ" });
    expect(faq).toHaveAttribute("href", "/help/faq");
    const contact = await screen.findByRole("menuitem", { name: "Contact" });
    expect(contact).toHaveAttribute("href", "/help/contact");
  });

  it("clicking Feedback opens the FeedbackSheet", async () => {
    const user = await openMenu();
    await user.click(await screen.findByRole("menuitem", { name: /feedback/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("forwards feedbackSource/feedbackMetric to the internal FeedbackSheet (I3)", async () => {
    const user = await openMenu({ feedbackSource: "account-menu", feedbackMetric: "csat" });
    await user.click(await screen.findByRole("menuitem", { name: /feedback/i }));
    await user.type(await screen.findByLabelText(/message/i), "great!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onFeedbackSubmit).toHaveBeenCalledWith({
      message: "great!",
      source: "account-menu",
      metric: "csat",
    });
  });

  it("Sign out is present, last, immediately preceded by a separator, destructive-styled, and calls signOutAction when clicked", async () => {
    const user = await openMenu();
    const items = await screen.findAllByRole("menuitem");
    const signOut = items[items.length - 1];

    expect(signOut).toHaveTextContent(/sign out/i);
    expect(signOut).toHaveAttribute("data-variant", "destructive");
    expect(signOut.previousElementSibling).toHaveAttribute(
      "data-slot",
      "dropdown-menu-separator",
    );

    await user.click(signOut);
    await waitFor(() => expect(signOutAction).toHaveBeenCalled());
  });

  it("C2: a failed sign-out surfaces a visible inline error and keeps the menu open", async () => {
    signOutAction.mockRejectedValue(new Error("network unreachable"));
    const onError = vi.fn();
    const user = await openMenu({ onError });

    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    await user.click(signOut);

    expect(await screen.findByText("network unreachable")).toBeInTheDocument();
    // menu must still be open - Profile should still be queryable
    expect(screen.getByRole("menuitem", { name: /profile/i })).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it("C2: a successful sign-out closes the menu", async () => {
    const user = await openMenu();
    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    await user.click(signOut);

    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: /profile/i })).not.toBeInTheDocument(),
    );
  });

  it("N2: closing the menu after a failed sign-out clears the error, so reopening it doesn't show a stale failure", async () => {
    signOutAction.mockRejectedValue(new Error("network unreachable"));
    const user = await openMenu();

    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    await user.click(signOut);
    expect(await screen.findByText("network unreachable")).toBeInTheDocument();

    // close via Escape (menu stays mounted, just closed)
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: /profile/i })).not.toBeInTheDocument(),
    );

    // reopen - the stale error must be gone
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    await screen.findByRole("menuitem", { name: /profile/i });
    expect(screen.queryByText("network unreachable")).not.toBeInTheDocument();
  });

  it("shows a bullet fallback (not an empty avatar) when the vendor name is empty", async () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "" }} />);
    expect(screen.getByText("•")).toBeInTheDocument();
  });

  it("avatar fallback uses a rounded-md ring shape, not a plain circle", () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "Kopi Corner" }} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    const avatar = trigger.querySelector("span");
    expect(avatar).toHaveClass("rounded-md", "ring-1", "ring-inset", "ring-primary/25");
  });

  it("avatar fallback shows up to 2 initials from a multi-word name", () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "Kopi Corner" }} />);
    expect(screen.getByText("KC")).toBeInTheDocument();
  });

  it("avatar fallback shows 2 initials from a single dot/underscore/dash-separated name", () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "jane.doe" }} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("avatar fallback shows a bullet for a blank (whitespace-only) name", () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "   " }} />);
    expect(screen.getByText("•")).toBeInTheDocument();
  });

  it("does not render an extra link when extraLink is not set", async () => {
    await openMenu();
    await screen.findByRole("menuitem", { name: /feedback/i });
    expect(
      screen.queryByRole("menuitem", { name: /go to admin/i }),
    ).not.toBeInTheDocument();
  });

  it("renders extraLink as a menu item linking to the given href when provided", async () => {
    await openMenu({ extraLink: { href: "/admin", label: "Go to admin" } });
    const link = await screen.findByRole("menuitem", { name: /go to admin/i });
    expect(link).toHaveAttribute("href", "/admin");
  });

  it("forwards showNps to the internal FeedbackSheet, rendering the NPS score grid", async () => {
    const user = await openMenu({ showNps: true });
    await user.click(await screen.findByRole("menuitem", { name: /feedback/i }));

    expect(
      await screen.findByRole("radiogroup", { name: /recommend score, 0 to 10/i }),
    ).toBeInTheDocument();
  });

  it("does not render the NPS score grid in the internal FeedbackSheet when showNps is not set", async () => {
    const user = await openMenu();
    await user.click(await screen.findByRole("menuitem", { name: /feedback/i }));
    await screen.findByLabelText(/message/i);

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("forwards getHelp.categories to the internal HelpSheet, rendering the category grid", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = await openMenu({
      getHelp: {
        type: "form",
        onSubmit,
        categories: [
          { value: "vendor_access", label: "Vendor access" },
          { value: "billing", label: "Billing" },
        ],
      },
    });
    const helpItem = await screen.findByRole("menuitem", { name: /get help/i });
    await user.click(helpItem);

    const group = await screen.findByRole("radiogroup", { name: /what's it about/i });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);

    await user.click(screen.getByRole("radio", { name: "Billing" }));
    await user.type(await screen.findByLabelText(/message/i), "I'm stuck");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({ message: "I'm stuck", category: "billing" });
  });

  it("does not render subtitle text in the trigger or dropdown label when vendor.subtitle is not set", async () => {
    render(<AccountMenu {...baseProps} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    // Subtitle should not be in the trigger
    expect(trigger).not.toHaveTextContent("manfred@example.com");
  });

  it("renders vendor.subtitle in the trigger button when provided", async () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "Manfred", subtitle: "manfred@example.com" }} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger).toHaveTextContent("manfred@example.com");
  });

  it("renders vendor.subtitle as a DropdownMenuLabel at the top of the dropdown when provided", async () => {
    await openMenu({ vendor: { name: "Manfred", subtitle: "manfred@example.com" } });
    // Find the label by its data-slot attribute (subtitle text is nested in a child span)
    const label = screen.getByText(
      (_content, element) =>
        element?.getAttribute("data-slot") === "dropdown-menu-label" &&
        element.textContent === "manfred@example.com",
    );
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("text-muted-foreground", "text-xs", "font-normal");
  });

  it("places the subtitle label before the Profile item with a separator", async () => {
    await openMenu({ vendor: { name: "Manfred", subtitle: "manfred@example.com" } });
    // Find the label by its data-slot attribute (subtitle text is nested in a child span)
    const label = screen.getByText(
      (_content, element) =>
        element?.getAttribute("data-slot") === "dropdown-menu-label" &&
        element.textContent === "manfred@example.com",
    );
    expect(label).toBeInTheDocument();

    const separator = label.nextElementSibling;
    expect(separator).toHaveAttribute("data-slot", "dropdown-menu-separator");
  });

  it("does not render a label or separator in the dropdown when vendor.subtitle is not set", async () => {
    await openMenu();
    // Profile should be the first item (no label/separator before it)
    const profileItem = await screen.findByRole("menuitem", { name: /profile/i });
    const previousElement = profileItem.previousElementSibling;
    // Should not be a label (previousElement should be null or not a label)
    if (previousElement) {
      expect(previousElement).not.toHaveAttribute("data-slot", "dropdown-menu-label");
    } else {
      expect(previousElement).toBeNull();
    }
  });

  it("renders a leading icon on every standard item (Profile, Settings, Plan, Get help, Feedback, Sign out)", async () => {
    await openMenu({ kitLocalSettingsHref: "/dashboard/settings" });
    for (const name of [
      /profile/i,
      /settings/i,
      /plan/i,
      /get help/i,
      /feedback/i,
      /sign out/i,
    ]) {
      const item = screen.getByRole("menuitem", { name });
      expect(item.querySelector("svg")).toBeInTheDocument();
    }
  });

  it("renders a leading icon on the Get help sub-trigger in 'submenu' mode", async () => {
    const user = await openMenu({
      getHelp: {
        type: "submenu",
        items: [{ label: "FAQ", href: "/help/faq" }],
      },
    });
    const subTrigger = screen.getByText(/get help/i).closest('[data-slot="dropdown-menu-sub-trigger"]');
    expect(subTrigger?.querySelector("svg")).toBeInTheDocument();
    // sub-content items (FAQ) are consumer-supplied labels, not restyled with a fixed icon
    await user.click(screen.getByText(/get help/i));
    expect(
      (await screen.findByRole("menuitem", { name: "FAQ" })).querySelector("svg"),
    ).not.toBeInTheDocument();
  });

  it("stamps data-tour=\"nav-account\" on the trigger button", () => {
    render(<AccountMenu {...baseProps} />);
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveAttribute(
      "data-tour",
      "nav-account",
    );
  });

  it("does not render a tier badge when tierBadge is not set, even with a subtitle", async () => {
    await openMenu({ vendor: { ...baseProps.vendor, subtitle: "a@b.com" } });
    expect(screen.queryByTestId("tier-badge-slot")).not.toBeInTheDocument();
  });

  it("renders tierBadge next to the vendor name in the dropdown header when both subtitle and tierBadge are set", async () => {
    await openMenu({
      vendor: { ...baseProps.vendor, subtitle: "a@b.com" },
      tierBadge: <span data-testid="tier-badge-slot">Pro</span>,
    });
    expect(screen.getByTestId("tier-badge-slot")).toBeInTheDocument();
  });

  it("renders Profile/Plan/extraLink through a given LinkComponent instead of a plain <a>", async () => {
    const CustomLink = ({
      href,
      children,
      ...rest
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} data-custom-link="true" {...rest}>
        {children}
      </a>
    );
    await openMenu({
      extraLink: { href: "/admin", label: "Admin" },
      LinkComponent: CustomLink,
    });
    expect(
      await screen.findByRole("menuitem", { name: /profile/i }),
    ).toHaveAttribute("data-custom-link", "true");
    expect(screen.getByRole("menuitem", { name: /^plan/i })).toHaveAttribute(
      "data-custom-link",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute(
      "data-custom-link",
      "true",
    );
  });

  it("keeps the mailto Get help item a plain <a> even when LinkComponent is given", async () => {
    const CustomLink = ({
      href,
      children,
      ...rest
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} data-custom-link="true" {...rest}>
        {children}
      </a>
    );
    await openMenu({ LinkComponent: CustomLink });
    expect(
      await screen.findByRole("menuitem", { name: /get help/i }),
    ).not.toHaveAttribute("data-custom-link");
  });
});
