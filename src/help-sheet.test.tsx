import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpSheet } from "./help-sheet";

describe("HelpSheet", () => {
  it("mailto mode: renders a mailto link with the given address, no form", () => {
    render(
      <HelpSheet open onOpenChange={() => {}} mode="mailto" address="support@merqo.app" />,
    );
    const link = screen.getByRole("link", { name: /email support/i });
    expect(link).toHaveAttribute("href", "mailto:support@merqo.app");
    expect(screen.queryByRole("button", { name: /send/i })).not.toBeInTheDocument();
  });

  it("form mode: renders a support form, no mailto link", () => {
    render(<HelpSheet open onOpenChange={() => {}} mode="form" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /email support/i })).not.toBeInTheDocument();
  });

  it("form mode: calls onSubmit with the message on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<HelpSheet open onOpenChange={() => {}} mode="form" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/message/i), "I can't sign in");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({ message: "I can't sign in" });
  });

  it("renders nothing visible when closed", () => {
    render(
      <HelpSheet open={false} onOpenChange={() => {}} mode="mailto" address="a@b.com" />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("C3: form mode shows an inline error and calls onError when onSubmit rejects", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error("could not send"));
    render(
      <HelpSheet
        open
        onOpenChange={() => {}}
        mode="form"
        onSubmit={onSubmit}
        onError={onError}
      />,
    );

    await user.type(screen.getByLabelText(/message/i), "help!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("could not send")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("form mode: does not render a category grid when categories is not set", () => {
    render(<HelpSheet open onOpenChange={() => {}} mode="form" onSubmit={vi.fn()} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("form mode: renders a category radiogroup with the first category pre-selected", () => {
    render(
      <HelpSheet
        open
        onOpenChange={() => {}}
        mode="form"
        onSubmit={vi.fn()}
        categories={[
          { value: "vendor_access", label: "Vendor access" },
          { value: "billing", label: "Billing" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: /what's it about/i });
    const buttons = within(group).getAllByRole("radio");
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Vendor access" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Billing" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("form mode: includes the selected category in the onSubmit payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <HelpSheet
        open
        onOpenChange={() => {}}
        mode="form"
        onSubmit={onSubmit}
        categories={[
          { value: "vendor_access", label: "Vendor access" },
          { value: "billing", label: "Billing" },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Billing" }));
    await user.type(screen.getByLabelText(/message/i), "Can't access my account");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "Can't access my account",
      category: "billing",
    });
  });
});
