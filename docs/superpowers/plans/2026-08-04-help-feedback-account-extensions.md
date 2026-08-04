# Help/Feedback/Account Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three additive, backward-compatible optional-prop extensions to `FeedbackSheet`, `HelpSheet`, and `AccountMenu` so the merqo kit migration can express its NPS feedback score, support-category selector, and admin-switch link without losing functionality.

**Architecture:** Each extension is an opt-in prop on an existing component. When the prop is absent, behavior is byte-identical to today (verified by the existing test suites continuing to pass unmodified). No new files, no new dependencies, no backend calls — same props-in/promise-out pattern as the rest of the package.

**Tech Stack:** React 18+, TypeScript, Vitest, @testing-library/react, @testing-library/user-event — same as the rest of `@merqo/ui`.

## Global Constraints

- Semantic-tokens-only styling: only Tailwind/shadcn semantic classes already present in this package's files (`bg-primary`, `text-primary-foreground`, `border-input`, `text-muted-foreground`, `border-border`, `text-destructive`, etc.). No literal colors, no new radius values.
- Backend-agnostic injected side-effects: no direct backend/router/storage calls. Everything stays props-in, promise-out.
- Every changed component gets Vitest + Testing Library tests added to its existing test file, following that file's established structure (see each task below).
- These are pure additions to existing files. Do not create new component files. Do not touch `dashboard-tour.tsx`, `profile-form.tsx`, `image-uploader.tsx`, `section.tsx`, `info-tooltip.tsx`, `use-async-action.ts`, `dashboard-nav.tsx`, `two-column-sections.tsx` — out of scope.
- Tasks are independent (different files) but execute sequentially — same shared-branch SDD practice used for every prior plan in this repo. Do not parallelize via worktrees.
- Full test suite command: `pnpm test --run` (Vitest). Full build command: `pnpm build` (tsup).

---

### Task 1: FeedbackSheet NPS opt-in

**Files:**
- Modify: `src/feedback-sheet.tsx`
- Test: `src/feedback-sheet.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `FeedbackSheetProps` gains `showNps?: boolean` (default `undefined`/falsy = current behavior). `FeedbackData` gains `nps?: number`. Task 3 (AccountMenu) does not touch this file and has no dependency on this prop, but note for context: `AccountMenuProps.onFeedbackSubmit` already types its payload as `FeedbackData`, so the wider `nps?: number` field flows through automatically — no AccountMenu changes needed for this task.

Current `FeedbackData` (in `src/feedback-sheet.tsx`):
```typescript
export interface FeedbackData {
  message: string;
  source: string;
  metric?: string;
}
```

New shape:
```typescript
export interface FeedbackData {
  message: string;
  source: string;
  metric?: string;
  nps?: number;
}
```

Behavior when `showNps` is `true`:
- Render an 11-button `0`–`10` score grid **above** the existing message textarea, inside the same `<form>`.
- Grid container: `role="radiogroup"` `aria-label="Recommend score, 0 to 10"`.
- Each button: `type="button"` `role="radio"` `aria-checked={score === n}` `aria-label={String(n)}`, displays `n`.
- Selected-state styling reuses classes already in this package (check `src/ui/*.tsx` and `src/image-uploader.tsx` for the exact selected/unselected button classes already used elsewhere in the repo — e.g. a bordered button that switches to `border-primary bg-primary text-primary-foreground` when selected and `border-input text-muted-foreground hover:border-primary/50` when not). Use `grid grid-cols-11 gap-1` for the row layout and `tabular-nums` on the button text (matches the reference implementation's number alignment).
- Clicking a button sets the selected score in local state (`React.useState<number | null>(null)`).
- Submit validation: when `showNps` is `true` and no score has been selected (`score === null`), submitting must NOT call `onSubmit` — instead show an inline validation message `"Pick a score first"` using the same inline-error text treatment already used in this file for the async-action error (`<p className="text-destructive text-sm" role="alert">`). Clear this validation message as soon as the user picks a score.
- When `showNps` is `true` and a score IS selected, `onSubmit` is called with `{ message, source, metric, nps: score }`.
- When `showNps` is falsy, behavior and payload are unchanged from today (no `nps` key in the call — do not pass `nps: undefined` explicitly; omit the key entirely, matching how `metric` is already conditionally included via the existing `source`/`metric` destructure-and-forward pattern in the file).

- [ ] **Step 1: Write the failing tests**

Add to `src/feedback-sheet.test.tsx` (append inside the existing `describe("FeedbackSheet", ...)` block, after the last test):

```typescript
  it("does not render the NPS score grid when showNps is not set", () => {
    render(<FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("showNps: renders an 11-button 0-10 score radiogroup", () => {
    render(
      <FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} showNps />,
    );
    const group = screen.getByRole("radiogroup", {
      name: /recommend score, 0 to 10/i,
    });
    const buttons = within(group).getAllByRole("radio");
    expect(buttons).toHaveLength(11);
    expect(screen.getByRole("radio", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "10" })).toBeInTheDocument();
  });

  it("showNps: blocks submit and shows inline validation when no score is picked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FeedbackSheet open onOpenChange={() => {}} onSubmit={onSubmit} showNps />,
    );

    await user.type(screen.getByLabelText(/message/i), "Great app!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Pick a score first")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("showNps: includes the picked score in the onSubmit payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSheet
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
        showNps
        source="vendor"
      />,
    );

    await user.click(screen.getByRole("radio", { name: "9" }));
    await user.type(screen.getByLabelText(/message/i), "Great app!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "Great app!",
      source: "vendor",
      metric: undefined,
      nps: 9,
    });
  });
```

Add `within` to the existing `@testing-library/react` import at the top of the test file:

```typescript
import { render, screen, within } from "@testing-library/react";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/feedback-sheet.test.tsx`
Expected: 4 new tests FAIL (no `showNps` prop, no radiogroup rendered).

- [ ] **Step 3: Implement `showNps` in `src/feedback-sheet.tsx`**

Update the interfaces and component to match the behavior spec above. The submit handler must check `showNps && score === null` before calling `onSubmit`, and must not call `onSubmit` in that case (mirror the existing empty-message early-return already in the file's `useAsyncAction` callback — add the score check alongside it, not instead of it).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/feedback-sheet.test.tsx`
Expected: all tests PASS (existing 6 + 4 new = 10).

- [ ] **Step 5: Commit**

```bash
git add src/feedback-sheet.tsx src/feedback-sheet.test.tsx
git commit -m "feat: add opt-in NPS score widget to FeedbackSheet"
```

---

### Task 2: HelpSheet category opt-in (form mode)

**Files:**
- Modify: `src/help-sheet.tsx`
- Test: `src/help-sheet.test.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: the `mode: "form"` branch of `HelpSheetProps` gains `categories?: { value: string; label: string }[]`. `SupportRequest` gains `category?: string`. Task 3 (AccountMenu) references `AccountMenuGetHelp`'s `{ type: "form"; onSubmit: (data: SupportRequest) => Promise<void> }` variant — the wider `SupportRequest` type flows through automatically, no AccountMenu changes needed for this task.

Current `SupportRequest` and form-mode props (in `src/help-sheet.tsx`):
```typescript
export interface SupportRequest {
  message: string;
}

export type HelpSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (error: unknown) => void;
} & (
  | { mode: "mailto"; address: string }
  | { mode: "form"; onSubmit: (data: SupportRequest) => Promise<void> }
);
```

New shape:
```typescript
export interface SupportRequest {
  message: string;
  category?: string;
}

export type HelpSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (error: unknown) => void;
} & (
  | { mode: "mailto"; address: string }
  | {
      mode: "form";
      onSubmit: (data: SupportRequest) => Promise<void>;
      categories?: { value: string; label: string }[];
    }
);
```

Behavior when `categories` is provided (form mode only):
- Render a 2-column category grid **above** the existing message textarea, inside `<form>`.
- Grid container: `role="radiogroup"` `aria-label="What's it about?"`, `className="grid grid-cols-2 gap-1.5"`.
- Each button: `type="button"` `role="radio"` `aria-checked={category === c.value}`, displays `c.label`.
- Selected-state styling: reuse the same selected/unselected pattern as Task 1's NPS buttons for consistency within this repo (bordered button, `border-primary bg-primary/10 text-primary` when selected, `border-input text-muted-foreground hover:border-primary/50` when not) — match whatever exact classes Task 1 lands on for the equivalent states, since both are choice-grid patterns in the same package.
- Default-selected: on mount, `category` state initializes to `categories[0]?.value` (first category pre-selected — matches the reference implementation's default-select-first behavior, not an empty state).
- Clicking a category button updates the selected category.
- `onSubmit` is called with `{ message, category }` when `categories` is provided (category is always defined in this case since one is pre-selected by default).
- When `categories` is not provided, behavior and payload are unchanged from today (`{ message }` only, no `category` key).
- This applies to `mode: "form"` only. `mode: "mailto"` is untouched.

- [ ] **Step 1: Write the failing tests**

Add to `src/help-sheet.test.tsx` (append inside the existing `describe("HelpSheet", ...)` block):

```typescript
  it("form mode: does not render a category grid when categories is not set", () => {
    render(<HelpSheet open onOpenChange={() => {}} mode="form" onSubmit={vi.fn()} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("form mode: renders a category radiogroup with the first category pre-selected", () => {
    render(
      <HelpSheet
        open
        onOpenChange={() => {}}
        mode="form"
        onSubmit={vi.fn()}
        categories={[
          { value: "vendor_access", label: "Vendor access" },
          { value: "billing", label: "Billing" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: /what's it about/i });
    const buttons = within(group).getAllByRole("radio");
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Vendor access" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Billing" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("form mode: includes the selected category in the onSubmit payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <HelpSheet
        open
        onOpenChange={() => {}}
        mode="form"
        onSubmit={onSubmit}
        categories={[
          { value: "vendor_access", label: "Vendor access" },
          { value: "billing", label: "Billing" },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Billing" }));
    await user.type(screen.getByLabelText(/message/i), "Can't access my account");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      message: "Can't access my account",
      category: "billing",
    });
  });
```

Add `within` to the existing `@testing-library/react` import at the top of the test file:

```typescript
import { render, screen, within } from "@testing-library/react";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/help-sheet.test.tsx`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Implement `categories` in `src/help-sheet.tsx`**

Update `SupportRequest`, `HelpSheetProps`'s form-mode branch, and `HelpForm` (the inner component holding the form logic) to match the behavior spec above. `HelpForm` needs to receive `categories` as a new optional prop from `HelpSheet`'s form-mode branch.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/help-sheet.test.tsx`
Expected: all tests PASS (existing 5 + 3 new = 8).

- [ ] **Step 5: Commit**

```bash
git add src/help-sheet.tsx src/help-sheet.test.tsx
git commit -m "feat: add opt-in category selector to HelpSheet form mode"
```

---

### Task 3: AccountMenu extraLink opt-in

**Files:**
- Modify: `src/account-menu.tsx`
- Test: `src/account-menu.test.tsx`

**Interfaces:**
- Consumes: `FeedbackData` and `SupportRequest` types from Tasks 1 and 2 (already re-exported/used by this file's existing imports — no import changes needed since this task only adds a new independent prop, not one that touches those types).
- Produces: `AccountMenuProps` gains `extraLink?: { href: string; label: string }`. No other component consumes this.

Behavior:
- When `extraLink` is provided, render one additional `DropdownMenuItem` (as a plain `<a href={extraLink.href}>{extraLink.label}</a>`, `asChild` pattern matching the existing "Profile" item's structure) directly after the "Feedback" `DropdownMenuItem` and before the existing `DropdownMenuSeparator` that precedes "Sign out".
- When `extraLink` is absent (default), menu structure is unchanged from today.
- This is a fully generic slot — no conditional logic beyond presence/absence, no special-casing of the label or href.

- [ ] **Step 1: Write the failing tests**

The file already has an `openMenu(props)` async helper (opens the dropdown against `baseProps` merged with the given partial overrides) and asserts on Radix's `menuitem` role with `toHaveAttribute("href", ...)` for `asChild` link items (see the existing "shows Profile linking to /dashboard/profile" test). Follow that exact pattern. Append inside the existing `describe("AccountMenu", ...)` block:

```typescript
  it("does not render an extra link when extraLink is not set", async () => {
    await openMenu();
    await screen.findByRole("menuitem", { name: /feedback/i });
    expect(
      screen.queryByRole("menuitem", { name: /go to admin/i }),
    ).not.toBeInTheDocument();
  });

  it("renders extraLink as a menu item linking to the given href when provided", async () => {
    await openMenu({ extraLink: { href: "/admin", label: "Go to admin" } });
    const link = await screen.findByRole("menuitem", { name: /go to admin/i });
    expect(link).toHaveAttribute("href", "/admin");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/account-menu.test.tsx`
Expected: 2nd new test FAILs (no extraLink rendered); 1st passes trivially (already true today) — confirm both run, then proceed.

- [ ] **Step 3: Implement `extraLink` in `src/account-menu.tsx`**

Add `extraLink?: { href: string; label: string }` to `AccountMenuProps`, destructure it in the component, and render the conditional `DropdownMenuItem` in the position described above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/account-menu.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/account-menu.tsx src/account-menu.test.tsx
git commit -m "feat: add generic optional extraLink slot to AccountMenu"
```

---

### Task 4: Release v0.5.0

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: all three prior tasks merged and passing.
- Produces: tagged, pushed `v0.5.0` release.

- [ ] **Step 1: Run the full test suite and full build**

Run: `pnpm test --run`
Expected: all tests PASS (no regressions in any other component's suite).

Run: `pnpm build`
Expected: build succeeds with no errors.

- [ ] **Step 2: Bump version**

In `package.json`, change `"version": "0.4.0"` to `"version": "0.5.0"`.

- [ ] **Step 3: Update README version pin**

In `README.md`, change every occurrence of `github:cljiahao/merqo-ui#v0.4.0` to `github:cljiahao/merqo-ui#v0.5.0`.

- [ ] **Step 4: Commit, tag, push**

```bash
git add package.json README.md
git commit -m "chore: release v0.5.0"
git tag v0.5.0
git push origin main
git push origin v0.5.0
```

- [ ] **Step 5: Verify the pushed tag in a clean clone**

```bash
cd /tmp && git clone --branch v0.5.0 https://github.com/cljiahao/merqo-ui.git merqo-ui-verify
cd merqo-ui-verify && pnpm install && pnpm test --run && pnpm build
```

Expected: all tests pass, build succeeds, against the real pushed tag — not just the local working tree.

Clean up afterward:

```bash
cd /tmp && rm -rf merqo-ui-verify
```
