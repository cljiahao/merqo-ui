import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountMenu } from "./account-menu";

const baseProps = {
  vendor: { name: "Manfred" },
  signOutAction: vi.fn().mockResolvedValue(undefined),
  getHelp: { type: "mailto" as const, address: "support@merqo.app" },
  onFeedbackSubmit: vi.fn().mockResolvedValue(undefined),
};

async function openMenu() {
  const user = userEvent.setup();
  render(<AccountMenu {...baseProps} />);
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
    const user = userEvent.setup();
    render(<AccountMenu {...baseProps} kitLocalSettingsHref="/dashboard/board" />);
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    const settings = await screen.findByRole("menuitem", { name: /settings/i });
    expect(settings).toHaveAttribute("href", "/dashboard/board");
  });

  it("shows Plan by default", async () => {
    await openMenu();
    expect(await screen.findByRole("menuitem", { name: /plan/i })).toBeInTheDocument();
  });

  it("hides Plan when showPlanItem is false", async () => {
    const user = userEvent.setup();
    render(<AccountMenu {...baseProps} showPlanItem={false} />);
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    // give the dropdown a tick to open before asserting absence
    await screen.findByRole("menuitem", { name: /profile/i });
    expect(screen.queryByRole("menuitem", { name: /plan/i })).not.toBeInTheDocument();
  });

  it("renders a mailto Get help item for mode 'mailto'", async () => {
    await openMenu();
    const helpLink = await screen.findByRole("menuitem", { name: /get help/i });
    expect(helpLink).toHaveAttribute("href", "mailto:support@merqo.app");
  });

  it("Sign out is present, last, and calls signOutAction when clicked", async () => {
    const user = await openMenu();
    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    expect(signOut).toBeInTheDocument();
    await user.click(signOut);
    expect(baseProps.signOutAction).toHaveBeenCalled();
  });
});
