import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("falls back to a generic icon (not an empty avatar) when the vendor name is empty", async () => {
    render(<AccountMenu {...baseProps} vendor={{ name: "" }} />);
    const trigger = screen.getByRole("button", { name: /account menu/i });
    expect(trigger.textContent?.trim()).toBe("");
    expect(trigger.querySelector("svg")).toBeInTheDocument();
  });
});
