import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditLogTable, type AuditLogEntry } from "./audit-log-table";

describe("AuditLogTable", () => {
  const entries: AuditLogEntry[] = [
    {
      id: "1",
      actor: "clarence@merqo.io",
      action: "set_vendor_plan",
      target: "Auntie Lim's Kopitiam",
      detail: "plan: pro",
      createdAt: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "2",
      actor: "clarence@merqo.io",
      action: "set_pricing",
      target: null,
      detail: null,
      createdAt: new Date("2026-08-18T09:00:00.000Z"),
    },
  ];

  it("renders the header columns", () => {
    render(<AuditLogTable entries={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeInTheDocument();
  });

  it("renders a custom empty state", () => {
    render(<AuditLogTable entries={[]} emptyState="Nothing to see." />);
    expect(screen.getByText("Nothing to see.")).toBeInTheDocument();
    expect(screen.queryByText("No activity recorded yet.")).not.toBeInTheDocument();
  });

  it("renders one row per entry, actor and target as given", () => {
    render(<AuditLogTable entries={entries} />);
    expect(screen.getAllByText("clarence@merqo.io")).toHaveLength(2);
    expect(screen.getByText("Auntie Lim's Kopitiam")).toBeInTheDocument();
  });

  it("renders a raw action string when formatAction is omitted", () => {
    render(<AuditLogTable entries={entries} />);
    expect(screen.getByText("set_vendor_plan")).toBeInTheDocument();
  });

  it("maps the action through formatAction when given", () => {
    render(
      <AuditLogTable
        entries={entries}
        formatAction={(action) => (action === "set_vendor_plan" ? "Plan changed" : action)}
      />,
    );
    expect(screen.getByText("Plan changed")).toBeInTheDocument();
    expect(screen.queryByText("set_vendor_plan")).not.toBeInTheDocument();
  });

  it("renders an em dash for a missing target, not a blank cell", () => {
    render(<AuditLogTable entries={[entries[1]]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders detail as a secondary line under the action when present", () => {
    render(<AuditLogTable entries={[entries[0]]} />);
    expect(screen.getByText("plan: pro")).toBeInTheDocument();
  });

  it("uses a custom dateFormatter when given", () => {
    render(<AuditLogTable entries={[entries[0]]} dateFormatter={() => "just now"} />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });
});
