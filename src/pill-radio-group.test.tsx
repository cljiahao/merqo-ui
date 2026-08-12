import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillRadioGroup } from "./pill-radio-group";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("PillRadioGroup", () => {
  it("renders a radiogroup with one radio per option", () => {
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value={null}
        onChange={() => {}}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Pick one" });
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(group).toBeInTheDocument();
  });

  it("marks the option matching `value` as checked, others not", () => {
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value="b"
        onChange={() => {}}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("aria-checked", "false");
  });

  it("clicking an option calls onChange with its value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value={null}
        onChange={onChange}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("roving tabindex: only the checked option (or the first, if none checked) is a Tab stop", () => {
    const { rerender } = render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value={null}
        onChange={() => {}}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("tabindex", "-1");

    rerender(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value="c"
        onChange={() => {}}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("radio", { name: "Gamma" })).toHaveAttribute("tabindex", "0");
  });

  it("ArrowRight moves focus and selection to the next option, wrapping past the last", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value="c"
        onChange={onChange}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    screen.getByRole("radio", { name: "Gamma" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("ArrowLeft moves focus and selection to the previous option, wrapping before the first", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value="a"
        onChange={onChange}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    screen.getByRole("radio", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("Home/End jump to the first/last option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value="b"
        onChange={onChange}
        gridClassName="grid-cols-3 gap-1"
      />,
    );
    screen.getByRole("radio", { name: "Beta" }).focus();
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("c");

    onChange.mockClear();
    screen.getByRole("radio", { name: "Beta" }).focus();
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("applies optionClassName to every option button", () => {
    render(
      <PillRadioGroup
        ariaLabel="Pick one"
        options={options}
        value={null}
        onChange={() => {}}
        gridClassName="grid-cols-3 gap-1"
        optionClassName="tabular-nums"
      />,
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveClass("tabular-nums");
    }
  });
});
