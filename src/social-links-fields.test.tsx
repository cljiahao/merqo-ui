import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialLinksFields } from "./social-links-fields";

describe("SocialLinksFields", () => {
  it("renders one input per social field, prefilled from value", () => {
    render(
      <SocialLinksFields
        value={{ website: "https://mystall.com" }}
        onChange={vi.fn()}
        idPrefix="p"
      />,
    );
    expect(screen.getByLabelText(/website/i)).toHaveValue(
      "https://mystall.com",
    );
    expect(screen.getByLabelText(/instagram/i)).toHaveValue("");
  });

  it("adds a field on input and removes it when cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <SocialLinksFields value={{}} onChange={onChange} idPrefix="p" />,
    );
    await user.type(screen.getByLabelText(/website/i), "x");
    expect(onChange).toHaveBeenLastCalledWith({ website: "x" });

    rerender(
      <SocialLinksFields
        value={{ website: "x" }}
        onChange={onChange}
        idPrefix="p"
      />,
    );
    await user.clear(screen.getByLabelText(/website/i));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
