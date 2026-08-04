import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
