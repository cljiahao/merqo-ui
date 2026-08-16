import * as React from "react";
import { Check } from "lucide-react";

export interface PlanComparisonTier {
  key: string;
  label: string;
}

export interface PlanComparisonRow {
  label: string;
  values: Record<string, boolean | string>;
}

export interface PlanComparisonTableProps {
  tiers: PlanComparisonTier[];
  rows: PlanComparisonRow[];
}

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-center">{value}</span>;
  }
  return (
    <span className="flex justify-center">
      {value ? (
        <Check className="size-4 text-status-ready" />
      ) : (
        <span className="text-muted-foreground/40">-</span>
      )}
    </span>
  );
}

export function PlanComparisonTable({ tiers, rows }: PlanComparisonTableProps) {
  const gridTemplateColumns = `1fr ${tiers.map(() => "2.75rem").join(" ")}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div
        className="grid gap-x-5 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        style={{ gridTemplateColumns }}
      >
        <span>Feature</span>
        {tiers.map((tier) => (
          <span key={tier.key} className="text-center">
            {tier.label}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid items-center gap-x-5 border-t border-border px-5 py-3 text-sm"
          style={{ gridTemplateColumns }}
        >
          <span>{row.label}</span>
          {tiers.map((tier) => (
            <Cell key={tier.key} value={row.values[tier.key]} />
          ))}
        </div>
      ))}
    </div>
  );
}
