import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable, type DataTableColumn } from "./data-table";

type Row = { id: string; name: string; amount: number };

const ROWS: Row[] = [
  { id: "1", name: "Alice", amount: 500 },
  { id: "2", name: "Bob", amount: 1200 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { header: "Name", cell: (r) => r.name },
  { header: "Amount", cell: (r) => `$${r.amount}`, className: "text-right" },
];

describe("DataTable", () => {
  it("renders the default empty state when rows is empty", () => {
    render(<DataTable rows={[]} columns={COLUMNS} getRowKey={(r) => r.id} />);
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
  });

  it("renders a custom empty state", () => {
    render(<DataTable rows={[]} columns={COLUMNS} getRowKey={(r) => r.id} emptyState="No bookings yet." />);
    expect(screen.getByText("No bookings yet.")).toBeInTheDocument();
    expect(screen.queryByText("No data yet.")).not.toBeInTheDocument();
  });

  it("renders one header per column and one row per data row", () => {
    render(<DataTable rows={ROWS} columns={COLUMNS} getRowKey={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("$1200")).toBeInTheDocument();
  });

  it("applies a column's className to both its header and its cells", () => {
    render(<DataTable rows={ROWS} columns={COLUMNS} getRowKey={(r) => r.id} />);
    expect(screen.getByText("Amount")).toHaveClass("text-right");
    expect(screen.getByText("$500")).toHaveClass("text-right");
  });
});
