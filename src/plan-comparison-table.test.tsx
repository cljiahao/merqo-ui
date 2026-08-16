import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlanComparisonTable } from "./plan-comparison-table";

describe("PlanComparisonTable", () => {
  const threeTiers = [
    { key: "free", label: "Free" },
    { key: "pass", label: "Pass" },
    { key: "pro", label: "Pro" },
  ];

  const twoTiers = [
    { key: "free", label: "Free" },
    { key: "pro", label: "Pro" },
  ];

  it("renders one header column per tier plus the leading Feature column (3 tiers)", () => {
    render(<PlanComparisonTable tiers={threeTiers} rows={[]} />);
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("renders one header column per tier plus the leading Feature column (2 tiers)", () => {
    render(<PlanComparisonTable tiers={twoTiers} rows={[]} />);
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.queryByText("Pass")).not.toBeInTheDocument();
  });

  it("a boolean-true cell renders a check icon", () => {
    render(
      <PlanComparisonTable
        tiers={threeTiers}
        rows={[{ label: "Live order board", values: { free: true, pass: true, pro: true } }]}
      />,
    );
    const row = screen.getByText("Live order board").closest("div");
    expect(row?.querySelectorAll("svg").length).toBe(3);
  });

  it("a boolean-false cell renders a muted dash, not a check icon", () => {
    render(
      <PlanComparisonTable
        tiers={threeTiers}
        rows={[
          {
            label: "Extra booths",
            values: { free: false, pass: true, pro: true },
          },
        ]}
      />,
    );
    const row = screen.getByText("Extra booths").closest("div");
    expect(row?.querySelectorAll("svg").length).toBe(2);
    expect(row?.textContent).toContain("-");
  });

  it("a string cell value renders as plain centered text, not an icon", () => {
    render(
      <PlanComparisonTable
        tiers={twoTiers}
        rows={[
          {
            label: "Loyalty programs",
            values: { free: "1", pro: "∞" },
          },
        ]}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("∞")).toBeInTheDocument();
    const row = screen.getByText("Loyalty programs").closest("div");
    expect(row?.querySelectorAll("svg").length).toBe(0);
  });

  it("renders rows in input order", () => {
    const { container } = render(
      <PlanComparisonTable
        tiers={twoTiers}
        rows={[
          { label: "First feature", values: { free: true, pro: true } },
          { label: "Second feature", values: { free: false, pro: true } },
          { label: "Third feature", values: { free: false, pro: false } },
        ]}
      />,
    );
    const rowLabels = Array.from(
      container.querySelectorAll(".border-t > span:first-child"),
    ).map((el) => el.textContent);
    expect(rowLabels).toEqual(["First feature", "Second feature", "Third feature"]);
  });

  it("computes gridTemplateColumns from tier count via inline style, not a Tailwind class (3 tiers)", () => {
    render(
      <PlanComparisonTable
        tiers={threeTiers}
        rows={[{ label: "A feature", values: { free: true, pass: true, pro: true } }]}
      />,
    );
    const row = screen.getByText("A feature").closest("div") as HTMLElement;
    expect(row.style.gridTemplateColumns).toBe("1fr 2.75rem 2.75rem 2.75rem");
    expect(row.className).not.toMatch(/grid-cols-\[/);
  });

  it("computes gridTemplateColumns from tier count via inline style, not a Tailwind class (2 tiers)", () => {
    render(
      <PlanComparisonTable
        tiers={twoTiers}
        rows={[{ label: "A feature", values: { free: true, pro: true } }]}
      />,
    );
    const row = screen.getByText("A feature").closest("div") as HTMLElement;
    expect(row.style.gridTemplateColumns).toBe("1fr 2.75rem 2.75rem");
    expect(row.className).not.toMatch(/grid-cols-\[/);
  });
});
