import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TermsAcceptanceCheckbox } from "./legal-acceptance-checkbox";

describe("TermsAcceptanceCheckbox", () => {
  it("fires onCheckedChange with the new value on click", async () => {
    const onCheckedChange = vi.fn();
    render(
      <TermsAcceptanceCheckbox
        checked={false}
        onCheckedChange={onCheckedChange}
        legalName=""
        onLegalNameChange={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("links out to Terms and Privacy Policy", () => {
    render(
      <TermsAcceptanceCheckbox
        checked={false}
        onCheckedChange={() => {}}
        legalName=""
        onLegalNameChange={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("captures the accepting vendor's legal name", async () => {
    const onLegalNameChange = vi.fn();
    render(
      <TermsAcceptanceCheckbox
        checked={false}
        onCheckedChange={() => {}}
        legalName=""
        onLegalNameChange={onLegalNameChange}
      />,
    );
    await userEvent.type(screen.getByLabelText(/your name/i), "A");
    expect(onLegalNameChange).toHaveBeenCalled();
  });
});
