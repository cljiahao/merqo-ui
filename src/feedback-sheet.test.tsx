import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

  it("C3: shows an inline error and calls onError when onSubmit rejects, and does not close the sheet", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error("submit failed"));
    render(
      <FeedbackSheet
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        onError={onError}
      />,
    );

    await user.type(screen.getByLabelText(/message/i), "hi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("submit failed")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("does not render the NPS score grid when showNps is not set", () => {
    render(<FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("showNps: renders an 11-button 0-10 score radiogroup", () => {
    render(
      <FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} showNps />,
    );
    const group = screen.getByRole("radiogroup", {
      name: /recommend score, 0 to 10/i,
    });
    const buttons = within(group).getAllByRole("radio");
    expect(buttons).toHaveLength(11);
    expect(screen.getByRole("radio", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "10" })).toBeInTheDocument();
  });

  it("showNps: blocks submit and shows inline validation when no score is picked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedbackSheet open onOpenChange={() => {}} onSubmit={onSubmit} showNps />,
    );

    await user.type(screen.getByLabelText(/message/i), "Great app!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Pick a score first")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("showNps: submits successfully with an empty message when a score is picked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <FeedbackSheet
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        showNps
        source="vendor"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "9" }));
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "",
      source: "vendor",
      metric: undefined,
      nps: 9,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("showNps: includes the picked score in the onSubmit payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSheet
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        showNps
        source="vendor"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "9" }));
    await user.type(screen.getByLabelText(/message/i), "Great app!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "Great app!",
      source: "vendor",
      metric: undefined,
      nps: 9,
    });
  });

  it("uses the default title/description when none are given", () => {
    render(<FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} />);
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Tell us what's working, or what isn't.")).toBeInTheDocument();
  });

  it("uses the given title/description when provided", () => {
    render(
      <FeedbackSheet
        open
        onOpenChange={() => {}}
        onSubmit={vi.fn()}
        title="Share feedback"
        description="What's working, what's missing, what's broken?"
      />,
    );
    expect(screen.getByText("Share feedback")).toBeInTheDocument();
    expect(screen.getByText("What's working, what's missing, what's broken?")).toBeInTheDocument();
  });
});
