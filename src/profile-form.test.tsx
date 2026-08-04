import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./profile-form";

function makeProps(overrides: Partial<Parameters<typeof ProfileForm>[0]> = {}) {
  return {
    initial: {
      stallName: "Manfred's Coffee Cart",
      socialLinks: { instagram: "", website: "" },
      displayName: "Manfred",
      avatarUrl: undefined,
    },
    onSaveStallIdentity: vi.fn().mockResolvedValue(undefined),
    onSaveDisplayName: vi.fn().mockResolvedValue(undefined),
    onSaveAvatar: vi.fn().mockResolvedValue(undefined),
    onSavePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ProfileForm", () => {
  it("renders column 1 in locked order: stall name, then photo, then password", () => {
    render(<ProfileForm {...makeProps()} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    const col1Order = ["Stall name", "Profile picture", "Change password"];
    const indices = col1Order.map((t) => headings.indexOf(t));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(indices.every((i) => i !== -1)).toBe(true);
  });

  it("renders column 2 in locked order: display name, then social links", () => {
    render(<ProfileForm {...makeProps()} />);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    const displayNameIndex = headings.indexOf("Display name");
    const socialLinksIndex = headings.indexOf("Social links");
    expect(displayNameIndex).toBeGreaterThanOrEqual(0);
    expect(socialLinksIndex).toBeGreaterThan(displayNameIndex);
  });

  it("uses a custom stallNameLabel when provided", () => {
    render(<ProfileForm {...makeProps({ stallNameLabel: "Shop name" })} />);
    expect(screen.getByRole("heading", { name: "Shop name" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Stall name" })).not.toBeInTheDocument();
  });

  it("saving the stall name section calls onSaveStallIdentity with the updated name and the current social links", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    const stallNameInput = screen.getByLabelText("Stall name");
    await user.clear(stallNameInput);
    await user.type(stallNameInput, "New Cart Name");
    await user.click(screen.getByRole("button", { name: /save stall name/i }));

    expect(props.onSaveStallIdentity).toHaveBeenCalledWith({
      stallName: "New Cart Name",
      socialLinks: { instagram: "", website: "" },
    });
    expect(props.onSaveDisplayName).not.toHaveBeenCalled();
  });

  it("saving the display name section calls only onSaveDisplayName", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    const displayNameInput = screen.getByLabelText("Display name");
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Manny");
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(props.onSaveDisplayName).toHaveBeenCalledWith("Manny");
    expect(props.onSaveStallIdentity).not.toHaveBeenCalled();
  });

  it("saving the password section calls only onSavePassword", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.type(screen.getByLabelText("New password"), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: /save password/i }));

    expect(props.onSavePassword).toHaveBeenCalledWith("hunter2hunter2");
    expect(props.onSaveDisplayName).not.toHaveBeenCalled();
  });

  it("does not call onSaveStallIdentity when the stall name is emptied out", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.click(screen.getByRole("button", { name: /save stall name/i }));

    expect(props.onSaveStallIdentity).not.toHaveBeenCalled();
  });

  it("uses TwoColumnSections, never a CSS grid, for the overall layout", () => {
    const { container } = render(<ProfileForm {...makeProps()} />);
    expect(container.querySelector(".grid")).not.toBeInTheDocument();
  });
});
