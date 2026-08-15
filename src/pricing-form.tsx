"use client";

import * as React from "react";
import { AsyncSubmitButton } from "./async-submit-button";
import { useAsyncAction } from "./use-async-action";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface PricingFieldConfig {
  /** Matches a key in `initial.values` and in the `onSave` payload. */
  key: string;
  label: string;
}

export interface PricingFormInitial {
  values: Record<string, number>;
  currency: string;
}

export interface PricingFormProps {
  fields: PricingFieldConfig[];
  initial: PricingFormInitial;
  /** Persists the new prices (already converted to cents). Throwing/
   * rejecting surfaces via `onError`, not an exception the caller must
   * catch — same contract as every other form in this package. */
  onSave: (values: Record<string, number>) => Promise<void>;
  onError?: (error: unknown) => void;
  /** e.g. "Shown on the vendor plan page." Optional trailing help line. */
  helpText?: string;
}

function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

export function PricingForm({
  fields,
  initial,
  onSave,
  onError,
  helpText,
}: PricingFormProps) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.key, centsToDollarString(initial.values[f.key] ?? 0)]),
    ),
  );
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const save = useAsyncAction(async (values: Record<string, number>) => {
    await onSave(values);
  });

  function onSubmit() {
    const parsed: Record<string, number> = {};
    for (const field of fields) {
      const cents = parseDollarsToCents(drafts[field.key] ?? "");
      if (cents === null) {
        setValidationError(`Enter a valid ${field.label.toLowerCase()}.`);
        return;
      }
      parsed[field.key] = cents;
    }
    setValidationError(null);
    save.run(parsed).catch((err) => onError?.(err));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`pricing-${field.key}`} className="text-xs font-medium text-muted-foreground">
              {field.label}
            </Label>
            <div className="relative w-32">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id={`pricing-${field.key}`}
                inputMode="decimal"
                value={drafts[field.key] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [field.key]: e.target.value }))
                }
                className="rounded-lg pl-7"
              />
            </div>
          </div>
        ))}
        <AsyncSubmitButton
          pending={save.pending}
          pendingChildren="Saving…"
          className="rounded-lg"
        >
          Save prices
        </AsyncSubmitButton>
      </form>
      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
