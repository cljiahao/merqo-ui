import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PricingForm } from "./pricing-form";

const ONE_FIELD = [{ key: "monthly_cents", label: "Monthly (SGD)" }];
const TWO_FIELDS = [
  { key: "event_pass_cents", label: "Event pass (SGD)" },
  { key: "monthly_cents", label: "Monthly (SGD)" },
];

describe("PricingForm", () => {
  it("renders one labeled input per configured field, pre-filled from initial cents as a dollar string", () => {
    render(
      <PricingForm
        fields={TWO_FIELDS}
        initial={{
          values: { event_pass_cents: 1499, monthly_cents: 2499 },
          currency: "SGD",
        }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Event pass (SGD)")).toHaveValue("14.99");
    expect(screen.getByLabelText("Monthly (SGD)")).toHaveValue("24.99");
  });

  it("calls onSave with every field's value converted back to cents", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("Monthly (SGD)"), {
      target: { value: "9.99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ monthly_cents: 999 }),
    );
  });

  it("rejects an invalid or blank field without calling onSave", async () => {
    const onSave = vi.fn();
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("Monthly (SGD)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByText(/enter a valid/i)).toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onError, not a thrown exception the caller has to catch, when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("network down"));
    const onError = vi.fn();
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("disables the save button while onSave is pending", async () => {
    let resolve: () => void = () => {};
    const onSave = vi.fn(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled(),
    );
  });
});
