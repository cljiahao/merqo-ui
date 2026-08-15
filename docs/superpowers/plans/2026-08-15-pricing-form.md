# PricingForm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract qkit's admin-editable pricing pattern (`src/app/admin/
pricing-form.tsx`) into a generalized `@merqo/ui` component so paykit,
stockkit, and loopkit can each get their own admin-tunable price (no
redeploy needed to change it) instead of the hardcoded `PRO_PRICE`/similar
constant each currently uses.

**Why this shape.** qkit's `PricingForm` is hardcoded to exactly two
fields (event pass + monthly) because qkit is the only kit with a day-pass
concept (`2026-07-30-cross-kit-pricing-and-billing-plan.md`'s own decision:
day-pricing stays qkit-only). The other three kits each need exactly one
field (their single Pro price). Rather than copy qkit's 2-field component
three times and strip one field out, this extracts a field-list-driven
component: `fields: { key, label }[]` in, `Record<key, cents>` out — one
field for paykit/stockkit/loopkit, two for qkit's own eventual migration
onto it (qkit's own adoption is a separate future plan, not in this one —
see Global Constraints).

**Architecture:** Mirrors `profile-form.tsx`'s established shape in this
same package — `useAsyncAction` for pending/error state, `AsyncSubmitButton`
for the submit control, no `toast` import inside the component (the
consumer's `onSave` resolving or its `onError` prop firing is how success/
failure surfaces — same contract `ProfileForm`, `FeedbackSheet`, and
`HelpSheet` already use). Dollar-string parsing/formatting is internal to
the component — the public contract is cents in, cents out; no kit needs to
import a separate parse/format helper.

**Tech Stack:** React 19, TypeScript strict, Vitest + Testing Library
(jsdom), Tailwind v4, tsup (package build).

## Global Constraints

- **This plan does NOT migrate qkit onto the new component.** qkit's own
  `pricing-form.tsx` stays as-is — it already works, and its 2-field shape
  needs its own follow-up plan to adopt the generalized component without
  disrupting its live `/admin` page mid-review. Out of scope here.
- **Component is presentational only.** It never talks to Supabase
  directly — `initial` values and the `onSave` callback are both provided
  by the consuming kit's own server action, exactly like every other form
  in this package (`ProfileForm`, `FeedbackSheet`).
- **Cents in, cents out — no dollar strings cross the component boundary.**
  Internal parse/format helpers are private to this file, not exported from
  `index.ts`. A kit's own plan/offer page (displaying "$4.99/mo" to a
  vendor) keeps using its own existing display-formatting helper
  (`formatCents` in paykit, etc.) — this component only owns the admin
  edit form, not vendor-facing price display.
- **No `toast` import inside the component.** Matches `ProfileForm`'s
  established pattern — success/failure notification is the consuming
  kit's responsibility via `onSave`'s resolution / the `onError` prop.
- TypeScript strict — no `any`, no `@ts-ignore`.
- Work on a feature branch, never commit directly to `main`.
- Commit messages follow Conventional Commits.
- Run `pnpm test` and `pnpm build` before considering any task done — this
  package ships compiled (`tsup` + `tsc -p tsconfig.build.json`), so a
  build failure here breaks every consuming kit's install.

---

### Task 0: Branch setup

**Files:** none

- [ ] **Step 1: Create and switch to a feature branch off `main`**

```bash
git fetch origin main
git checkout -b feat/pricing-form origin/main
```

- [ ] **Step 2: Confirm baseline tests pass**

Run: `pnpm test`
Expected: all existing tests PASS.

---

### Task 1: Build `PricingForm`

**Files:**

- Create: `src/pricing-form.tsx`
- Create: `src/pricing-form.test.tsx`
- Modify: `src/index.ts`

**Interfaces:**

- Consumes: `useAsyncAction` (`./use-async-action`), `AsyncSubmitButton`
  (`./async-submit-button`), `Input`/`Label` (`./ui/input`, `./ui/label`).
- Produces: `PricingForm`, `PricingFormProps`, `PricingFieldConfig` —
  exported from `index.ts`, consumed by every adopting kit's own admin page.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/pricing-form.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PricingForm } from "./pricing-form";

const ONE_FIELD = [{ key: "monthly_cents", label: "Monthly (SGD)" }];
const TWO_FIELDS = [
  { key: "event_pass_cents", label: "Event pass (SGD)" },
  { key: "monthly_cents", label: "Monthly (SGD)" },
];

describe("PricingForm", () => {
  it("renders one labeled input per configured field, pre-filled from initial cents as a dollar string", () => {
    render(
      <PricingForm
        fields={TWO_FIELDS}
        initial={{
          values: { event_pass_cents: 1499, monthly_cents: 2499 },
          currency: "SGD",
        }}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Event pass (SGD)")).toHaveValue("14.99");
    expect(screen.getByLabelText("Monthly (SGD)")).toHaveValue("24.99");
  });

  it("calls onSave with every field's value converted back to cents", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("Monthly (SGD)"), {
      target: { value: "9.99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ monthly_cents: 999 }),
    );
  });

  it("rejects an invalid or blank field without calling onSave", async () => {
    const onSave = vi.fn();
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText("Monthly (SGD)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(screen.getByText(/enter a valid/i)).toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onError, not a thrown exception the caller has to catch, when onSave rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("network down"));
    const onError = vi.fn();
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("disables the save button while onSave is pending", async () => {
    let resolve: () => void = () => {};
    const onSave = vi.fn(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    render(
      <PricingForm
        fields={ONE_FIELD}
        initial={{ values: { monthly_cents: 499 }, currency: "SGD" }}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/pricing-form.test.tsx`
Expected: FAIL — `./pricing-form` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
// src/pricing-form.tsx
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
      <div className="flex flex-wrap items-end gap-4">
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
      </div>
      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
```

Note: `AsyncSubmitButton` renders a native `type="submit"` button but this
form has no `<form>` wrapper (matches qkit's original — click-driven, not
submit-driven, since multiple independent dollar inputs don't need native
form submission semantics). Confirm in Step 4 that `AsyncSubmitButton`'s
`type="submit"` with no enclosing `<form>` still fires its `onClick`
normally in jsdom (it does — `type="submit"` only matters inside a
`<form>`); if this proves flaky under test, wrap the `fields.map` block in
a plain `<form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>`
instead of relying on a bare `onClick` — either is acceptable, pick
whichever the test run actually needs.

Add the `onClick={onSubmit}` prop to `AsyncSubmitButton` in the JSX above
(omitted from the snippet for brevity — wire it in Step 3's actual edit).

Update `src/index.ts`:

```ts
export { PricingForm } from "./pricing-form";
export type { PricingFormProps, PricingFormInitial, PricingFieldConfig } from "./pricing-form";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/pricing-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Package build check**

Run: `pnpm build`
Expected: PASS — confirms the new export compiles cleanly through
`tsup`/`tsc -p tsconfig.build.json`, the same gate every consuming kit's
install depends on.

- [ ] **Step 6: Commit**

```bash
git add src/pricing-form.tsx src/pricing-form.test.tsx src/index.ts
git commit -m "feat: add generalized PricingForm component"
```

---

### Task 2: Version bump and changelog

**Files:**

- Modify: `package.json`
- Modify: `CHANGELOG.md` (if this package keeps one — check first)

- [ ] **Step 1: Confirm the real current published version**

`package.json`'s `"version"` field has been observed out of sync with the
actual latest git tag before (`package.json` read `0.1.0` while `git tag`
showed `v0.11.1` as of 2026-08-15) — **do not trust the working-tree
`package.json` value**. Run `git tag --sort=-v:refname | head -1` and bump
from the real latest tag, not from whatever `package.json` currently says.

- [ ] **Step 2: Bump to the next minor version**

A new exported component is a backward-compatible addition — minor bump
(e.g. `0.11.1` → `0.12.0`). Update `package.json`'s `"version"` to match.

- [ ] **Step 3: Commit and tag**

```bash
git add package.json
git commit -m "chore: bump to v0.12.0 for PricingForm"
git tag v0.12.0
```

(Confirm this repo's actual publish/tag convention — e.g. whether tagging
happens on `main` post-merge rather than on the feature branch — before
running the tag command; adjust if this repo's real workflow differs.)

---

## Self-Review Notes

- **Spec coverage:** `PricingForm` component + tests (Task 1); version
  bump (Task 2). qkit's own adoption is explicitly out of scope (Global
  Constraints) — correctly, since qkit's live `/admin` page already works
  and migrating it is a separate, lower-urgency follow-up.
- **Placeholder scan:** none — full component implementation and full test
  suite included, not a skeleton.
- **Type consistency:** `PricingFieldConfig.key` is a plain `string` (not a
  union) since it's consumer-defined per kit — `Record<string, number>` on
  both `initial.values` and `onSave`'s payload keeps the two symmetric; a
  kit passing a `key` with no matching `initial.values` entry gets `0` as
  the pre-filled value (`?? 0]` in `centsToDollarString(initial.values[f.key] ?? 0)`),
  not a crash.
- **No Supabase/data-layer code in this package**, confirmed — `onSave` is
  the only I/O seam, provided entirely by the consumer, matching this
  package's existing architecture (it has no Supabase dependency anywhere
  else either).
