import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackSheet } from "./feedback-sheet";

describe("FeedbackSheet", () => {
  it("renders nothing visible when closed", () => {
    render(
      <FeedbackSheet open={false} onOpenChange={() => {}} onSubmit={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the feedback form when open", () => {
    render(
      <FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("calls onSubmit with the message and the given source/metric when the form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSheet
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        source="vendor"
        metric="nps"
      />,
    );

    await user.type(screen.getByLabelText(/message/i), "Great app!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "Great app!",
      source: "vendor",
      metric: "nps",
    });
  });

  it("does not call onSubmit when the message is empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FeedbackSheet open onOpenChange={() => {}} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) after a successful submit", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSheet open onOpenChange={onOpenChange} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText(/message/i), "hi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
