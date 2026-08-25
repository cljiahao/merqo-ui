import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "./lib/utils";

export interface DeltaPillProps {
  pct: number | null;
  /** Native title tooltip, e.g. "vs the previous period". */
  tooltip?: string;
  /** "xs" matches loopkit's smaller pill; "sm" (default) matches qkit's. */
  size?: "xs" | "sm";
  /** Overrides the down-state background/text classes (up-state stays a fixed emerald across every kit). */
  downClassName?: string;
}

const DEFAULT_DOWN = "bg-destructive/12 text-destructive";

export function DeltaPill({ pct, tooltip, size = "sm", downClassName = DEFAULT_DOWN }: DeltaPillProps) {
  if (pct === null) return null;
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
        size === "xs" ? "text-[0.65rem]" : "font-mono text-[0.7rem]",
        up ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : downClassName,
      )}
      title={tooltip}
    >
      <Icon className="size-3" />
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

export interface StatTileProps {
  label: string;
  value: string;
  /** Font treatment for the value — callers pick mono/display/plain instead of it being fixed. */
  valueClassName?: string;
  caption?: string;
  captionClassName?: string;
  /** Hover tooltip on the whole tile (native title), e.g. the cancelled count behind Fulfilled. */
  hint?: string;
  primary?: boolean;
  /** Renders value above label instead of the default label-above-value. */
  reverse?: boolean;
  /** Renders the standard 2-state up/down pill. Mutually exclusive with deltaSlot. */
  delta?: number | null;
  /** Renders arbitrary content in the label row instead of the standard pill (e.g. a breakdown-popover trigger, or an icon). Mutually exclusive with delta. */
  deltaSlot?: React.ReactNode;
  deltaTooltip?: string;
  deltaSize?: "xs" | "sm";
  deltaDownClassName?: string;
  /** Arbitrary content rendered beside the value itself (e.g. a 3-state trend indicator that doesn't fit DeltaPill's 2-state contract). */
  valueTrailing?: React.ReactNode;
}

/**
 * The label/value/delta content shared across every kit's stat strip. Deliberately
 * has no outer card shell (border/background/padding/hover treatment) — each kit's
 * outer wrapping differs too much to unify, so callers wrap this in their own container.
 */
export function StatTile({
  label,
  value,
  valueClassName,
  caption,
  captionClassName,
  hint,
  primary,
  reverse,
  delta,
  deltaSlot,
  deltaTooltip,
  deltaSize,
  deltaDownClassName,
  valueTrailing,
}: StatTileProps) {
  const deltaContent =
    deltaSlot !== undefined
      ? deltaSlot
      : delta !== undefined && (
          <DeltaPill pct={delta} tooltip={deltaTooltip} size={deltaSize} downClassName={deltaDownClassName} />
        );

  const labelRow = (
    <div className="flex items-start justify-between gap-2">
      <p
        className={cn(
          "text-[0.7rem] font-semibold uppercase tracking-wider",
          primary ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      {deltaContent}
    </div>
  );

  const valueRow = valueTrailing ? (
    <div className="flex items-baseline gap-2">
      <p className={cn("truncate text-2xl font-bold leading-none tabular-nums", valueClassName)}>{value}</p>
      {valueTrailing}
    </div>
  ) : (
    <p className={cn("truncate text-2xl font-bold leading-none tabular-nums", valueClassName)}>{value}</p>
  );

  return (
    <div title={hint} className={cn("flex flex-col gap-2", hint && "cursor-help")}>
      {reverse ? (
        <>
          <div className="flex items-center justify-between gap-2">
            {valueRow}
            {deltaContent}
          </div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </>
      ) : (
        <>
          {labelRow}
          {valueRow}
        </>
      )}
      {caption && (
        <p className={cn("truncate text-xs text-muted-foreground tabular-nums", captionClassName)}>{caption}</p>
      )}
    </div>
  );
}
