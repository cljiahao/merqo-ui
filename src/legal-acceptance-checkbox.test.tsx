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

  it("includes the legal name input in native form submission via FormData", () => {
    render(
      <form>
        <TermsAcceptanceCheckbox
          checked={false}
          onCheckedChange={() => {}}
          legalName="Acme Pte Ltd"
          onLegalNameChange={() => {}}
        />
      </form>,
    );
    const input = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(input).toHaveAttribute("name", "legal_name");
    const formData = new FormData(input.closest("form")!);
    expect(formData.get("legal_name")).toBe("Acme Pte Ltd");
  });
});
