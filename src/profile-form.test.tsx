import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
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
    avatarBucket: "vendor-avatars",
    avatarPathPrefix: "vendor-123",
    onAvatarUpload: vi.fn().mockResolvedValue("https://cdn.example.test/avatar.jpg"),
    ...overrides,
  };
}

function avatarFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("no avatar file input rendered");
  return input as HTMLInputElement;
}

async function uploadAvatarFile(container: HTMLElement, file: File) {
  const input = avatarFileInput(container);
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
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

  it("shows an inline validation error and does not call onSaveStallIdentity when the stall name is emptied out (I2)", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.click(screen.getByRole("button", { name: /save stall name/i }));

    expect(props.onSaveStallIdentity).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a name customers will see/i)).toBeInTheDocument();
  });

  it("C1: saving social links succeeds even when the stall name is blank", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.type(screen.getByLabelText("Instagram"), "@manfreds");
    await user.click(screen.getByRole("button", { name: /save social links/i }));

    await waitFor(() => expect(props.onSaveStallIdentity).toHaveBeenCalled());
    expect(props.onSaveDisplayName).not.toHaveBeenCalled();
  });

  it("N1: saving social links after a stall-name edit-without-save sends the ORIGINAL persisted stall name, not the live unsaved edit", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.type(screen.getByLabelText("Stall name"), "Half-typed Name");
    await user.type(screen.getByLabelText("Instagram"), "@manfreds");
    await user.click(screen.getByRole("button", { name: /save social links/i }));

    expect(props.onSaveStallIdentity).toHaveBeenCalledWith({
      stallName: "Manfred's Coffee Cart",
      socialLinks: { instagram: "@manfreds", website: "" },
    });
  });

  it("N1: saving social links after clearing (but not saving) the stall name still sends the original persisted stall name, not an empty string", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.type(screen.getByLabelText("Instagram"), "@manfreds");
    await user.click(screen.getByRole("button", { name: /save social links/i }));

    expect(props.onSaveStallIdentity).toHaveBeenCalledWith({
      stallName: "Manfred's Coffee Cart",
      socialLinks: { instagram: "@manfreds", website: "" },
    });
  });

  it("N1: after the stall-name section's own save succeeds, a subsequent social-links save uses the newly-saved name", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Stall name"));
    await user.type(screen.getByLabelText("Stall name"), "New Cart Name");
    await user.click(screen.getByRole("button", { name: /save stall name/i }));
    await waitFor(() => expect(props.onSaveStallIdentity).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Instagram"), "@manfreds");
    await user.click(screen.getByRole("button", { name: /save social links/i }));

    await waitFor(() => expect(props.onSaveStallIdentity).toHaveBeenCalledTimes(2));
    expect(props.onSaveStallIdentity).toHaveBeenLastCalledWith({
      stallName: "New Cart Name",
      socialLinks: { instagram: "@manfreds", website: "" },
    });
  });

  it("C1: saving social links does not call onSaveDisplayName or onSavePassword", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.type(screen.getByLabelText("Instagram"), "@manfreds");
    await user.click(screen.getByRole("button", { name: /save social links/i }));

    await waitFor(() => expect(props.onSaveStallIdentity).toHaveBeenCalled());
    expect(props.onSaveDisplayName).not.toHaveBeenCalled();
    expect(props.onSavePassword).not.toHaveBeenCalled();
  });

  it("I1: the social-links save button is not disabled while the stall-name save is pending", async () => {
    const user = userEvent.setup();
    let resolveStallName!: () => void;
    const props = makeProps({
      onSaveStallIdentity: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveStallName = resolve;
          }),
      ),
    });
    render(<ProfileForm {...props} />);

    await user.click(screen.getByRole("button", { name: /save stall name/i }));

    expect(screen.getByRole("button", { name: /save stall name/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save social links/i })).not.toBeDisabled();

    resolveStallName();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save stall name/i })).not.toBeDisabled(),
    );
  });

  it("I1: the stall-name save button is not disabled while the social-links save is pending", async () => {
    const user = userEvent.setup();
    let resolveSocialLinks!: () => void;
    const props = makeProps({
      onSaveStallIdentity: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSocialLinks = resolve;
          }),
      ),
    });
    render(<ProfileForm {...props} />);

    await user.click(screen.getByRole("button", { name: /save social links/i }));

    expect(screen.getByRole("button", { name: /save social links/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save stall name/i })).not.toBeDisabled();

    resolveSocialLinks();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save social links/i })).not.toBeDisabled(),
    );
  });

  it("I2: rejects a password shorter than 8 characters without calling onSavePassword", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.click(screen.getByRole("button", { name: /save password/i }));

    expect(props.onSavePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it("I2: rejects a blank display name without calling onSaveDisplayName", async () => {
    const user = userEvent.setup();
    const props = makeProps();
    render(<ProfileForm {...props} />);

    await user.clear(screen.getByLabelText("Display name"));
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(props.onSaveDisplayName).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a display name/i)).toBeInTheDocument();
  });

  it("I6: renders the given avatarUrl as a preview (via ImageUploader) in the Profile picture section", () => {
    render(
      <ProfileForm
        {...makeProps({
          initial: {
            stallName: "Manfred's Coffee Cart",
            socialLinks: { instagram: "", website: "" },
            displayName: "Manfred",
            avatarUrl: "https://example.com/avatar.png",
          },
        })}
      />,
    );
    // Scope the <img> lookup to the same wrapper as the "Remove image"
    // button (both are rendered by ImageUploader's own preview block) so
    // this stays correct if the form ever grows a second image elsewhere.
    const removeButton = screen.getByRole("button", { name: "Remove image" });
    const avatarPreviewContainer = removeButton.closest("div");
    const avatar = avatarPreviewContainer?.querySelector("img");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("I6: renders the ImageUploader upload trigger (no preview) when avatarUrl is undefined", () => {
    render(<ProfileForm {...makeProps()} />);
    expect(screen.getByRole("button", { name: /add photo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove image" })).not.toBeInTheDocument();
  });

  it("C3: surfaces an inline error and calls onError when the stall name save rejects", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const props = makeProps({
      onSaveStallIdentity: vi.fn().mockRejectedValue(new Error("network down")),
      onError,
    });
    render(<ProfileForm {...props} />);

    await user.click(screen.getByRole("button", { name: /save stall name/i }));

    expect(await screen.findByText("network down")).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("C3: surfaces an inline error when the social links save rejects", async () => {
    const user = userEvent.setup();
    const props = makeProps({
      onSaveStallIdentity: vi.fn().mockRejectedValue(new Error("social save failed")),
    });
    render(<ProfileForm {...props} />);

    await user.click(screen.getByRole("button", { name: /save social links/i }));

    expect(await screen.findByText("social save failed")).toBeInTheDocument();
  });

  it("C3: surfaces an inline error when the display name save rejects", async () => {
    const user = userEvent.setup();
    const props = makeProps({
      onSaveDisplayName: vi.fn().mockRejectedValue(new Error("display name save failed")),
    });
    render(<ProfileForm {...props} />);

    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(await screen.findByText("display name save failed")).toBeInTheDocument();
  });

  it("C3: surfaces an inline error when the avatar save rejects", async () => {
    const props = makeProps({
      onSaveAvatar: vi.fn().mockRejectedValue(new Error("avatar save failed")),
      onAvatarUpload: vi.fn().mockResolvedValue("https://cdn.example.test/avatar.jpg"),
    });
    const { container } = render(<ProfileForm {...props} />);

    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    await uploadAvatarFile(container, file);

    expect(await screen.findByText("avatar save failed")).toBeInTheDocument();
  });

  it("renders ImageUploader in the avatar section, wired to the avatar* props", () => {
    render(
      <ProfileForm
        {...makeProps({
          avatarBucket: "vendor-avatars",
          avatarPathPrefix: "vendor-123",
          onAvatarUpload: vi.fn(),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /add photo/i })).toBeInTheDocument();
  });

  it("calls onSaveAvatar with the uploaded URL, not a raw File", async () => {
    const onSaveAvatar = vi.fn().mockResolvedValue(undefined);
    const onAvatarUpload = vi.fn().mockResolvedValue("https://cdn.example.test/uploaded.jpg");
    const { container } = render(
      <ProfileForm
        {...makeProps({
          onSaveAvatar,
          avatarBucket: "vendor-avatars",
          avatarPathPrefix: "vendor-123",
          onAvatarUpload,
        })}
      />,
    );

    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    await uploadAvatarFile(container, file);

    await waitFor(() =>
      expect(onSaveAvatar).toHaveBeenCalledWith("https://cdn.example.test/uploaded.jpg"),
    );
    expect(onSaveAvatar).not.toHaveBeenCalledWith(file);
  });

  it("REGRESSION: after a successful avatar upload, the visible DOM updates to show the preview/remove button, not just onSaveAvatar being called", async () => {
    const onSaveAvatar = vi.fn().mockResolvedValue(undefined);
    const onAvatarUpload = vi.fn().mockResolvedValue("https://cdn.example.test/uploaded.jpg");
    const { container } = render(
      <ProfileForm
        {...makeProps({
          onSaveAvatar,
          avatarBucket: "vendor-avatars",
          avatarPathPrefix: "vendor-123",
          onAvatarUpload,
        })}
      />,
    );

    expect(screen.getByRole("button", { name: /add photo/i })).toBeInTheDocument();

    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    await uploadAvatarFile(container, file);

    await waitFor(() => expect(onSaveAvatar).toHaveBeenCalled());

    // The DOM must reflect the new avatar immediately, without waiting for
    // the parent to re-render with a fresh `initial.avatarUrl` from outside.
    const removeButton = screen.getByRole("button", { name: "Remove image" });
    expect(screen.queryByRole("button", { name: /add photo/i })).not.toBeInTheDocument();
    const preview = removeButton.closest("div")?.querySelector("img");
    expect(preview).toHaveAttribute("src", "https://cdn.example.test/uploaded.jpg");
  });

  it("REGRESSION: clicking Remove image clears the visible preview immediately", async () => {
    const onSaveAvatar = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfileForm
        {...makeProps({
          onSaveAvatar,
          initial: {
            stallName: "Manfred's Coffee Cart",
            socialLinks: { instagram: "", website: "" },
            displayName: "Manfred",
            avatarUrl: "https://example.com/avatar.png",
          },
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove image" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove image" }));

    await waitFor(() => expect(onSaveAvatar).toHaveBeenCalledWith(null));
    expect(screen.getByRole("button", { name: /add photo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove image" })).not.toBeInTheDocument();
  });

  it("saving social links includes facebook and tiktok fields", async () => {
    const onSaveStallIdentity = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfileForm
        {...makeProps({
          onSaveStallIdentity,
          initial: {
            stallName: "Manfred's Coffee Cart",
            socialLinks: {
              website: "https://a.com",
              facebook: "https://fb.com/a",
              tiktok: "https://tiktok.com/@a",
            },
            displayName: "Manfred",
            avatarUrl: undefined,
          },
        })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save social links/i }));
    expect(onSaveStallIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        socialLinks: expect.objectContaining({
          website: "https://a.com",
          facebook: "https://fb.com/a",
          tiktok: "https://tiktok.com/@a",
        }),
      }),
    );
  });

  it("social links form has facebook and tiktok inputs", () => {
    render(<ProfileForm {...makeProps()} />);
    expect(screen.getByLabelText(/facebook/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tiktok/i)).toBeInTheDocument();
  });

  it("C3: surfaces an inline error when the password save rejects", async () => {
    const user = userEvent.setup();
    const props = makeProps({
      onSavePassword: vi.fn().mockRejectedValue(new Error("password save failed")),
    });
    render(<ProfileForm {...props} />);

    await user.type(screen.getByLabelText("New password"), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: /save password/i }));

    expect(await screen.findByText("password save failed")).toBeInTheDocument();
  });

  it("uses TwoColumnSections, never a CSS grid, for the overall layout", () => {
    const { container } = render(<ProfileForm {...makeProps()} />);
    expect(container.querySelector(".grid")).not.toBeInTheDocument();
  });
});
