# Cross-Kit Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 real, multi-kit-evidenced gaps in `@merqo/ui` (currently v0.6.0) found by auditing every component's actual current prop/behavior contract against the real local implementation in all 5 sibling kits (loopkit, merqo, paykit, qkit, stockkit), so the package is genuinely ready for kit migration instead of being patched reactively component-by-component during migration.

**Architecture:** Each fix is either an additive optional prop (backward compatible with the one existing consumer's usage, `merqo-ui`'s own internal `ProfileForm`) or, where audit evidence shows the package's *default* shape is itself wrong (Section's `icon`/`eyebrow`/`tooltip` types, ProfileForm's avatar/social-links contract), a corrected default — safe because **zero kits have migrated onto this package yet**, so there is no external back-compat surface to preserve for those specific defaults. Every fix ships with a test proving the fixed behavior, following each file's existing test patterns.

**Tech Stack:** React 18+, TypeScript, Vitest, @testing-library/react, @testing-library/user-event, Radix UI primitives — same as the rest of `@merqo/ui`.

## Global Constraints

- Semantic-tokens-only styling: only Tailwind/shadcn semantic classes already present in this package's files (`bg-primary`, `text-muted-foreground`, `border-input`, etc.), or classes copied verbatim from a kit's own file when the fix's whole purpose is porting that kit's exact CSS (Task 8). No new literal colors, no new radius values outside of what's copied verbatim from an existing kit file.
- Backend-agnostic injected side-effects: no direct backend/router/storage calls anywhere in this package. Every new capability is a prop (a value, a callback, or a `ReactNode` slot).
- Every changed/new file gets Vitest + Testing Library tests, following that file's (or its closest sibling's) existing test structure.
- Full test suite command: `pnpm test --run`. Full build command: `pnpm build`. Typecheck: `pnpm tsc --noEmit`.
- Tasks execute sequentially on one shared branch (this project's established SDD practice — no worktree parallelism), **except Task 3 (Section) must complete before Task 7 (ProfileForm)** — this is a real interface dependency, not just git-conflict avoidance: Task 7 changes `ProfileForm`'s own internal `<Section icon={...}>` calls to match Task 3's new `icon` contract, and cannot be written correctly against the old contract.
- Where a task says "add optional prop with a default matching current behavior," the default's exact value must make the component's output byte-identical to today when the prop is omitted — verify this with a regression test, not just by inspection.

---

### Task 1: InfoTooltip — restore default label, add tap-triggered mode

**Files:**
- Modify: `src/info-tooltip.tsx`
- Create: `src/ui/popover.tsx`
- Modify: `package.json` (new dependency)
- Test: `src/info-tooltip.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `InfoTooltipProps.ariaLabel` becomes optional (default `"More info"`). New optional `trigger?: "hover" | "tap"` (default `"hover"`, preserving current behavior). Task 3 (Section) calls `InfoTooltip` internally (`<InfoTooltip content={tooltip} ariaLabel={...} />`) and is unaffected by either change (it always passes `ariaLabel` explicitly and never sets `trigger`).

**Why:** loopkit's real `InfoTooltip` (`loopkit/src/components/info-tooltip.tsx`) deliberately uses a tap/click-triggered Radix `Popover`, not a hover-only `Tooltip` — its own comment: *"Tap/click-triggered (not hover-only) so it works on touch — most vendors on this app are on their phone."* Meanwhile paykit's and qkit's own local `InfoTooltip` both default an optional `label` prop to `"More about this setting"`, but this package made `ariaLabel` required with no default, so every call site that previously relied on the default now needs one supplied explicitly.

**Step 1: Add the `@radix-ui/react-popover` dependency**

In `package.json`, in `dependencies` (alphabetical, matching the existing block), add a line after `"@radix-ui/react-dropdown-menu": "^2.1.4",`:
```json
    "@radix-ui/react-popover": "^1.1.4",
```

Run `pnpm install` to update the lockfile.

- [ ] **Step 2: Vendor the Popover primitive**

Create `src/ui/popover.tsx`:
```typescript
"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-xl border p-3 text-sm shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
```

This mirrors `src/ui/tooltip.tsx`'s existing structure exactly (same `data-slot` convention, same per-package Radix import style already used by this repo's `@radix-ui/react-tooltip`/`@radix-ui/react-dialog`/`@radix-ui/react-dropdown-menu`, rather than the newer unified `radix-ui` package some kits use — stay consistent with this repo's own existing imports).

- [ ] **Step 3: Write the failing tests**

Read `src/info-tooltip.test.tsx` first to match its existing structure and imports exactly (render/screen/userEvent patterns already established there). Add these cases (adapt names/imports to match the file's real existing style):

```typescript
it("ariaLabel defaults to \"More info\" when omitted", () => {
  render(<InfoTooltip content="Some detail" />);
  expect(screen.getByRole("button", { name: "More info" })).toBeInTheDocument();
});

it("trigger defaults to hover: renders inside a Tooltip, not a Popover", async () => {
  render(<InfoTooltip content="Some detail" ariaLabel="Detail" />);
  const trigger = screen.getByRole("button", { name: "Detail" });
  expect(screen.queryByText("Some detail")).not.toBeInTheDocument();
  await userEvent.hover(trigger);
  expect(await screen.findByText("Some detail")).toBeInTheDocument();
});

it("trigger=\"tap\": content opens on click, not on hover", async () => {
  const user = userEvent.setup();
  render(<InfoTooltip content="Some detail" ariaLabel="Detail" trigger="tap" />);
  const trigger = screen.getByRole("button", { name: "Detail" });
  await user.hover(trigger);
  expect(screen.queryByText("Some detail")).not.toBeInTheDocument();
  await user.click(trigger);
  expect(await screen.findByText("Some detail")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm vitest run src/info-tooltip.test.tsx`
Expected: 3 new tests FAIL (`ariaLabel` still required by TypeScript/no default; no `trigger` prop; `Popover` unused).

- [ ] **Step 5: Implement**

In `src/info-tooltip.tsx`:
```typescript
"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export interface InfoTooltipProps {
  content: React.ReactNode;
  ariaLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** "hover" (default) shows on hover/focus via a Tooltip. "tap" shows on
   *  click via a Popover — for touch-first flows where hover never fires. */
  trigger?: "hover" | "tap";
}

export function InfoTooltip({
  content,
  ariaLabel = "More info",
  icon: Icon = Info,
  trigger = "hover",
}: InfoTooltipProps) {
  const triggerButton = (
    <button
      type="button"
      aria-label={ariaLabel}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-4 items-center justify-center rounded-full outline-none focus-visible:ring-2"
    >
      <Icon className="size-3.5" />
    </button>
  );

  if (trigger === "tap") {
    return (
      <Popover>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="text-muted-foreground">{content}</PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/info-tooltip.test.tsx`
Expected: all tests PASS.

- [ ] **Step 7: Run the full suite and build**

Run: `pnpm test --run` — expect no regressions elsewhere (Section calls `InfoTooltip` with `ariaLabel` always supplied, so its tests are unaffected).
Run: `pnpm build` — expect success.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/info-tooltip.tsx src/info-tooltip.test.tsx src/ui/popover.tsx
git commit -m "feat: default InfoTooltip's ariaLabel, add tap-triggered mode via a new Popover primitive"
```

---

### Task 2: useAsyncAction — add navigatingAway companion export

**Files:**
- Modify: `src/use-async-action.ts`
- Modify: `src/index.ts`
- Test: `src/use-async-action.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a new named export `navigatingAway(): Promise<never>` from `src/use-async-action.ts`, re-exported from `src/index.ts`.

**Why:** loopkit's, qkit's, and stockkit's own local `use-async-action.ts` (3 of 5 kits) all export this companion alongside the hook itself. `router.push`/`router.replace` fire navigation without waiting for it to land, so a success-and-navigate branch's `fn()` returning right after one lets `run`'s `finally` flip `pending` back to `false` while the old page is still showing — the button re-enables mid-transition. `await navigatingAway()` at the end of a success-and-navigate branch keeps `pending` true forever; the component unmounts once the new route lands, so the promise never needs to resolve.

- [ ] **Step 1: Write the failing test**

Read `src/use-async-action.test.tsx` first to match its existing structure. Add:

```typescript
it("navigatingAway returns a promise that never resolves or rejects", async () => {
  const p = navigatingAway();
  let settled = false;
  p.then(
    () => { settled = true; },
    () => { settled = true; },
  );
  await new Promise((r) => setTimeout(r, 10));
  expect(settled).toBe(false);
});

it("run() keeps pending true when the action awaits navigatingAway", async () => {
  const { result } = renderHook(() =>
    useAsyncAction(async () => {
      await navigatingAway();
    }),
  );
  act(() => {
    void result.current.run();
  });
  await waitFor(() => expect(result.current.pending).toBe(true));
  await new Promise((r) => setTimeout(r, 10));
  expect(result.current.pending).toBe(true);
});
```

Add the necessary imports at the top of the test file if not already present (`renderHook`, `act`, `waitFor` from `@testing-library/react`) — check what's already imported first and only add what's missing.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/use-async-action.test.tsx`
Expected: FAIL — `navigatingAway` is not exported.

- [ ] **Step 3: Implement**

Append to `src/use-async-action.ts` (after the existing `useAsyncAction` function, same file):
```typescript
/**
 * `router.push`/`router.replace` fire the navigation without waiting for it
 * to land, so `fn()` returning right after one lets `run`'s `finally` flip
 * `pending` back to `false` while the old page is still showing — the
 * button re-enables mid-transition. `await navigatingAway()` at the end of
 * a success-and-navigate branch keeps `pending` true forever; the component
 * unmounts once the new route lands, so the promise never needs to resolve.
 */
export function navigatingAway(): Promise<never> {
  return new Promise(() => {});
}
```

In `src/index.ts`, find the existing export line for `use-async-action` (something like `export { useAsyncAction } from "./use-async-action";`) and widen it:
```typescript
export { useAsyncAction, navigatingAway } from "./use-async-action";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/use-async-action.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test --run` and `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/use-async-action.ts src/use-async-action.test.tsx src/index.ts
git commit -m "feat: add navigatingAway companion export to useAsyncAction"
```

---

### Task 3: Section — fix icon/eyebrow/tooltip contract to match unanimous real usage

**Files:**
- Modify: `src/section.tsx`
- Test: `src/section.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `SectionProps.icon` changes from `React.ComponentType<{className?}>` to `React.ReactNode`. `SectionProps.eyebrow` changes from required `string` to optional `string`. `SectionProps.tooltip` changes from `string` to `React.ReactNode`. `description?: string` is UNCHANGED (already optional today — do not touch it; a prior audit pass incorrectly flagged it as required, verify this yourself by reading the current file before starting). **Task 7 (ProfileForm) depends on this task** — it calls `Section` internally and must be updated to pass rendered elements (`icon={<Store className="size-5" />}`) instead of bare component references (`icon={Store}`) once this lands; do not start Task 7 before this task's commit exists.

**Why:** checked loopkit's `section.tsx`, paykit's `section.tsx`, qkit's `ticket-section.tsx` (its real Section equivalent), stockkit's `section.tsx`, and merqo's `section.tsx` — all 5 kits unanimously pass an already-rendered icon element (e.g. `<Store className="size-5" />`), not a bare component reference; all 5 treat `eyebrow` as optional; paykit's and qkit's both allow rich `ReactNode` tooltip content, not just a plain string.

- [ ] **Step 1: Write the failing tests**

Read `src/section.test.tsx` first to match its existing structure. Add/adapt tests covering:

```typescript
it("renders icon as a passed-in element, not a component reference", () => {
  render(
    <Section icon={<span data-testid="my-icon" />} title="Stall name">
      <p>content</p>
    </Section>,
  );
  expect(screen.getByTestId("my-icon")).toBeInTheDocument();
});

it("renders without an eyebrow when none is given", () => {
  render(
    <Section icon={<span />} title="Stall name">
      <p>content</p>
    </Section>,
  );
  expect(screen.queryByText(/eyebrow/i)).not.toBeInTheDocument();
  // No eyebrow-styled element rendered at all - the header still shows only the title.
  expect(screen.getByText("Stall name")).toBeInTheDocument();
});

it("renders a ReactNode tooltip's content when the tooltip is opened", async () => {
  const user = userEvent.setup();
  render(
    <Section
      icon={<span />}
      title="Stall name"
      tooltip={<span>Rich <strong>content</strong></span>}
    >
      <p>content</p>
    </Section>,
  );
  await user.hover(screen.getByRole("button", { name: /more about stall name/i }));
  expect(await screen.findByText("content")).toBeInTheDocument(); // "content" inside the tooltip - adjust selector if ambiguous with children's own "content" text; prefer a more specific query if the existing test file already establishes one for InfoTooltip content lookups
});
```

If the existing test file already has an established pattern/helper for asserting tooltip content (since `Section` already renders one when `tooltip` is set), reuse that pattern instead of writing a new one from scratch — read the file fully before adding.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/section.test.tsx`
Expected: FAIL — TypeScript error on `icon` (component vs. element), `eyebrow` is required, `tooltip` typed as `string`.

- [ ] **Step 3: Implement**

Rewrite `src/section.tsx`:
```typescript
"use client";

import * as React from "react";

import { InfoTooltip } from "./info-tooltip";
import { cn } from "./lib/utils";

export interface SectionProps {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  tooltip?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Section({
  icon,
  eyebrow,
  title,
  description,
  tooltip,
  className,
  children,
}: SectionProps) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            {icon}
          </span>
          <div className="flex flex-col">
            {eyebrow ? (
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {eyebrow}
              </span>
            ) : null}
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold">{title}</h3>
              {tooltip ? (
                <InfoTooltip content={tooltip} ariaLabel={`More about ${title}`} />
              ) : null}
            </div>
          </div>
        </div>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
```

The only structural change beyond the type signatures: `<Icon className="size-4" />` becomes `{icon}` (the icon element now carries its own sizing, matching every real kit's own call site, e.g. `<Store className="size-5" />`), and the eyebrow `<span>` is now conditionally rendered.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/section.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test --run` — **expect `src/profile-form.test.tsx` and/or `pnpm build`'s typecheck to now FAIL**, since `src/profile-form.tsx` still calls `<Section icon={Store} .../>` (bare component reference) against the new `ReactNode` contract. This is expected and intentional — Task 7 fixes `profile-form.tsx` itself. Confirm the failure is exactly this (a type error / rendering issue localized to `profile-form.tsx`'s `Section` usage), not something else, then proceed — do NOT fix `profile-form.tsx` in this task.

- [ ] **Step 6: Commit**

```bash
git add src/section.tsx src/section.test.tsx
git commit -m "fix: correct Section's icon/eyebrow/tooltip contract to match unanimous real kit usage"
```

Note in your report to the controller: `pnpm build`/`pnpm test --run` will NOT be fully green after this commit (profile-form.tsx is now broken against the new contract) — this is expected, flag it explicitly as DONE_WITH_CONCERNS with this exact explanation, so the controller knows Task 7 must follow before the branch is whole again.

---

### Task 4: AccountMenu — add nav-account tour anchor and a tier-badge slot

**Files:**
- Modify: `src/account-menu.tsx`
- Test: `src/account-menu.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the trigger `<button>` gains a hardcoded `data-tour="nav-account"` attribute. `AccountMenuProps` gains optional `tierBadge?: React.ReactNode`, rendered next to the vendor name inside the `DropdownMenuLabel` header (only when `vendor.subtitle` is ALSO set, since the header itself only renders when `subtitle` is present — see `src/account-menu.tsx`'s existing `vendor.subtitle &&` guard).

**Why:** every kit's own nav (qkit `dashboard-nav.tsx:173`, and the same pattern in loopkit/paykit/stockkit) stamps `data-tour="nav-account"` on the avatar trigger button — this is what a migrated kit's `DashboardTour` step selectors (`element: '[data-tour="nav-account"]'`) target; without it, that step silently fails to find its anchor. Separately, 4 of 5 kits (qkit `dashboard-nav.tsx:82-94,198`, and the same pattern in loopkit/paykit/stockkit) render a small tier badge (e.g. "Free"/"Pass"/"Pro") inline with the vendor name in the dropdown header — a `ReactNode` slot lets each kit bring its own tier taxonomy/styling without this package knowing about any kit's plan tiers.

- [ ] **Step 1: Write the failing tests**

Read `src/account-menu.test.tsx` first (it has an `openMenu(props)` helper and `baseProps` — reuse both). Add:

```typescript
it("stamps data-tour=\"nav-account\" on the trigger button", () => {
  render(<AccountMenu {...baseProps} />);
  expect(screen.getByRole("button", { name: /account menu/i })).toHaveAttribute(
    "data-tour",
    "nav-account",
  );
});

it("does not render a tier badge when tierBadge is not set, even with a subtitle", async () => {
  await openMenu({ vendor: { ...baseProps.vendor, subtitle: "a@b.com" } });
  expect(screen.queryByTestId("tier-badge-slot")).not.toBeInTheDocument();
});

it("renders tierBadge next to the vendor name in the dropdown header when both subtitle and tierBadge are set", async () => {
  await openMenu({
    vendor: { ...baseProps.vendor, subtitle: "a@b.com" },
    tierBadge: <span data-testid="tier-badge-slot">Pro</span>,
  });
  expect(screen.getByTestId("tier-badge-slot")).toBeInTheDocument();
});
```

Adjust `baseProps.vendor`/spread pattern to whatever the file's real existing shape is — read it first, don't assume beyond what's already confirmed in this plan (`vendor: { name: "Manfred" }` is the file's known base).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/account-menu.test.tsx`
Expected: FAIL — no `data-tour` attribute, no `tierBadge` prop.

- [ ] **Step 3: Implement**

In `src/account-menu.tsx`:

1. Add `tierBadge?: React.ReactNode;` to `AccountMenuProps`, after the existing `extraLink?: { href: string; label: string };` line.
2. Destructure `tierBadge` in the `AccountMenu` function signature, alongside the other props.
3. On the trigger `<button>` (the one with `aria-label="Account menu"`), add `data-tour="nav-account"` as a static attribute (not conditional — always present).
4. In the `DropdownMenuLabel` header block (the one gated on `vendor.subtitle &&`), wrap the subtitle text and the badge in a flex row. The current block looks like:
   ```tsx
   {vendor.subtitle ? (
     <>
       <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
         {vendor.subtitle}
       </DropdownMenuLabel>
       <DropdownMenuSeparator />
     </>
   ) : null}
   ```
   Change the `DropdownMenuLabel`'s content to:
   ```tsx
   <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 truncate text-xs font-normal">
     <span className="truncate">{vendor.subtitle}</span>
     {tierBadge}
   </DropdownMenuLabel>
   ```
   (Read the file first to confirm the exact current JSX before editing — this plan describes the shape added in the prior session's subtitle task; match it exactly, don't guess at whitespace/structure.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/account-menu.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test --run` and `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/account-menu.tsx src/account-menu.test.tsx
git commit -m "feat: stamp data-tour=nav-account on AccountMenu's trigger, add optional tierBadge slot"
```

---

### Task 5: DashboardNav — add nav-menu tour anchor, per-link tour anchors, and active-link support

**Files:**
- Modify: `src/dashboard-nav.tsx`
- Test: `src/dashboard-nav.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the burger `<button>` gains a hardcoded `data-tour="nav-menu"` attribute. `DashboardNavProps.navLinks` items gain no new required fields, but `DashboardNavProps` gains two new optional props: `isActiveHref?: (href: string) => boolean` and `tourAnchor?: (href: string) => string`. Both apply to every rendered nav `<a>` (desktop row and mobile panel).

**Why:** qkit's/loopkit's/paykit's/stockkit's own `dashboard-nav.tsx` (4 of 5 — merqo's `DashboardTour`/nav pattern is split across separate files, already covered by Tasks 4 above) all: (1) stamp `data-tour="nav-menu"` on the burger button; (2) stamp `data-tour={tourAnchor(link.href)}` on every nav link (e.g. qkit's `tourAnchor`: `` `nav-${href === "/dashboard" ? "orders" : href.split("/").pop()}` ``); (3) compute `isActive(pathname, href)` and apply active styling + implicitly indicate current location. This package has no Next.js/router dependency (confirmed by its own existing doc comments elsewhere, e.g. `DashboardTour`'s `navigateHome`), so both must be injected callbacks — the calling kit's own `usePathname()`-derived function, not something this package computes itself.

- [ ] **Step 1: Write the failing tests**

Read `src/dashboard-nav.test.tsx` first to match its existing structure/props baseline. Add:

```typescript
it("stamps data-tour=\"nav-menu\" on the mobile burger button", () => {
  render(<DashboardNav {...baseProps} navLinks={[]} />);
  expect(
    screen.getByRole("button", { name: /mobile navigation menu/i }),
  ).toHaveAttribute("data-tour", "nav-menu");
});

it("applies tourAnchor's return value as data-tour on each nav link when given", () => {
  render(
    <DashboardNav
      {...baseProps}
      navLinks={[{ href: "/dashboard", label: "Home" }]}
      tourAnchor={(href) => `nav-${href.split("/").pop()}`}
    />,
  );
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
    "data-tour",
    "nav-dashboard",
  );
});

it("does not set data-tour on links when tourAnchor is not given", () => {
  render(<DashboardNav {...baseProps} navLinks={[{ href: "/dashboard", label: "Home" }]} />);
  expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("data-tour");
});

it("marks the active link via aria-current when isActiveHref returns true", () => {
  render(
    <DashboardNav
      {...baseProps}
      navLinks={[
        { href: "/dashboard", label: "Home" },
        { href: "/dashboard/stats", label: "Stats" },
      ]}
      isActiveHref={(href) => href === "/dashboard"}
    />,
  );
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Stats" })).not.toHaveAttribute("aria-current");
});

it("no link has aria-current when isActiveHref is not given", () => {
  render(<DashboardNav {...baseProps} navLinks={[{ href: "/dashboard", label: "Home" }]} />);
  expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
});
```

Read the file's existing `baseProps`/render pattern first (it spreads `AccountMenuProps` — `vendor`, `signOutAction`, `getHelp`, `onFeedbackSubmit` at minimum) and use whatever helper/base object it already establishes rather than inlining these from scratch.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/dashboard-nav.test.tsx`
Expected: FAIL — no `data-tour` on burger, no `tourAnchor`/`isActiveHref` props.

- [ ] **Step 3: Implement**

In `src/dashboard-nav.tsx`:

1. Add `isActiveHref?: (href: string) => boolean;` and `tourAnchor?: (href: string) => string;` to `DashboardNavProps` (alongside `wordmark`/`navLinks`, before the `& AccountMenuProps` intersection).
2. Destructure both in the `DashboardNav` function signature.
3. Add `data-tour="nav-menu"` (static, always present) to the burger `<button>`.
4. For BOTH nav-link render blocks (desktop `<nav className="hidden items-center gap-4 sm:flex">` and the mobile panel's `<nav id={MOBILE_PANEL_ID} ...>`), change each `<a>` to:
   ```tsx
   <a
     key={link.href}
     href={link.href}
     data-tour={tourAnchor ? tourAnchor(link.href) : undefined}
     aria-current={isActiveHref?.(link.href) ? "page" : undefined}
     className={cn(
       "text-muted-foreground hover:text-foreground text-sm font-medium",
       isActiveHref?.(link.href) && "text-foreground",
     )}
     onClick={/* keep the mobile panel's existing onClick={() => setMobileOpen(false)} where it already exists — desktop nav has none */}
   >
     {link.label}
   </a>
   ```
   Import `cn` from `./lib/utils` if not already imported in this file (check first). Keep each block's own existing `className` base string and `onClick` (mobile-only) — only ADD the `data-tour`/`aria-current`/conditional class, don't restructure anything else. The desktop link currently has no `cn()` call at all (plain string className) — introduce `cn()` only there if needed; the mobile link's className is also currently a plain string, same treatment.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/dashboard-nav.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test --run` and `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/dashboard-nav.tsx src/dashboard-nav.test.tsx
git commit -m "feat: add nav-menu/per-link tour anchors and active-link support to DashboardNav"
```

---

### Task 6: FeedbackSheet / HelpSheet — add title/description overrides

**Files:**
- Modify: `src/feedback-sheet.tsx`
- Modify: `src/help-sheet.tsx`
- Test: `src/feedback-sheet.test.tsx`
- Test: `src/help-sheet.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `FeedbackSheetProps` gains optional `title?: string` (default `"Feedback"`) and `description?: string` (default `"Tell us what's working, or what isn't."`). `HelpSheetProps`'s `mode: "form"` branch gains optional `title?: string` (default `"Get help"`) and `description?: string` (default `"Tell us what you're stuck on."`) — the `mode: "mailto"` branch's description stays as-is (its own hardcoded copy is fine, not flagged by the audit).

**Why:** every one of the 5 kits customizes both strings on both sheets today (e.g. qkit: "Share feedback" / "What's working, what's missing, what's broken? We read every note.", and "Get help" / "Trouble with a pass, payment, or your Pro plan?..."; merqo: "Feedback" / "How's Merqo working for you?...", and "Get help" / "Something not working, or need help with your Merqo account?..."). This is universal, not a 2-kit quirk — no migrated kit could show its own copy here without this fix.

- [ ] **Step 1: Write the failing tests (FeedbackSheet)**

Read `src/feedback-sheet.test.tsx` first. Add:

```typescript
it("uses the default title/description when none are given", () => {
  render(<FeedbackSheet open onOpenChange={() => {}} onSubmit={vi.fn()} />);
  expect(screen.getByText("Feedback")).toBeInTheDocument();
  expect(screen.getByText("Tell us what's working, or what isn't.")).toBeInTheDocument();
});

it("uses the given title/description when provided", () => {
  render(
    <FeedbackSheet
      open
      onOpenChange={() => {}}
      onSubmit={vi.fn()}
      title="Share feedback"
      description="What's working, what's missing, what's broken?"
    />,
  );
  expect(screen.getByText("Share feedback")).toBeInTheDocument();
  expect(screen.getByText("What's working, what's missing, what's broken?")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write the failing tests (HelpSheet)**

Read `src/help-sheet.test.tsx` first. Add:

```typescript
it("form mode: uses the default title/description when none are given", () => {
  render(<HelpSheet open onOpenChange={() => {}} mode="form" onSubmit={vi.fn()} />);
  expect(screen.getByText("Get help")).toBeInTheDocument();
  expect(screen.getByText("Tell us what you're stuck on.")).toBeInTheDocument();
});

it("form mode: uses the given title/description when provided", () => {
  render(
    <HelpSheet
      open
      onOpenChange={() => {}}
      mode="form"
      onSubmit={vi.fn()}
      title="Get help"
      description="Trouble with a pass, payment, or your Pro plan?"
    />,
  );
  expect(screen.getByText("Get help")).toBeInTheDocument();
  expect(screen.getByText("Trouble with a pass, payment, or your Pro plan?")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/feedback-sheet.test.tsx src/help-sheet.test.tsx`
Expected: FAIL — no `title`/`description` props on either component.

- [ ] **Step 4: Implement (FeedbackSheet)**

In `src/feedback-sheet.tsx`, add to `FeedbackSheetProps`:
```typescript
  title?: string;
  description?: string;
```
Destructure with defaults in the component signature: `title = "Feedback"`, `description = "Tell us what's working, or what isn't."`. Replace the hardcoded `<SheetTitle>Feedback</SheetTitle>` with `<SheetTitle>{title}</SheetTitle>` and the hardcoded `<SheetDescription>Tell us what's working, or what isn't.</SheetDescription>` with `<SheetDescription>{description}</SheetDescription>`.

- [ ] **Step 5: Implement (HelpSheet)**

In `src/help-sheet.tsx`, add `title?: string; description?: string;` to the `mode: "form"` branch of the `HelpSheetProps` union only (not the `mode: "mailto"` branch). In the `HelpSheet` component, destructure these from `props` when `props.mode === "form"` (the component already branches on `props.mode` — follow its existing structure) with defaults `title = "Get help"`, `description = "Tell us what you're stuck on."`, and pass them through to wherever `SheetTitle`/`SheetDescription` are rendered for the form-mode branch (the file currently shares one `SheetHeader`/`SheetTitle`/`SheetDescription` block across both mode branches with a ternary on `props.mode === "mailto"` for the description text — read the current structure and adapt it so form-mode's title/description now come from the resolved `title`/`description` values instead of a hardcoded string, while mailto-mode's copy stays exactly as it is today).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/feedback-sheet.test.tsx src/help-sheet.test.tsx`
Expected: all tests PASS.

- [ ] **Step 7: Run the full suite and build**

Run: `pnpm test --run` and `pnpm build`.

- [ ] **Step 8: Commit**

```bash
git add src/feedback-sheet.tsx src/feedback-sheet.test.tsx src/help-sheet.tsx src/help-sheet.test.tsx
git commit -m "feat: add optional title/description overrides to FeedbackSheet and HelpSheet"
```

---

### Task 7: ProfileForm — compose ImageUploader for avatar, widen SocialLinks to 4 fields

**Files:**
- Modify: `src/profile-form.tsx`
- Test: `src/profile-form.test.tsx`

**Interfaces:**
- Consumes: Task 3's new `Section` contract (`icon: ReactNode`, `eyebrow?: string`, `tooltip?: ReactNode`) — **do not start this task before Task 3 is committed.** Also consumes the existing `ImageUploader` component (`src/image-uploader.tsx`, already shipped, unchanged by this plan) — read its full current props (`ImageUploaderProps`) before starting: `bucket`, `pathPrefix`, `value`, `onChange`, `onUpload`, `resizeImage?`, `maxBytes?`, `variant?`, `maxDim?`, `imageComponent?`, `onError?` (verify this list against the real file — it's referenced from memory in this plan, confirm exact names before writing code).
- Produces: `SocialLinks` gains `facebook?: string` and `tiktok?: string` (alongside existing `instagram?`/`website?`). `ProfileFormInitial.avatarUrl` is unchanged. `ProfileFormProps.onSaveAvatar` changes signature from `(file: File) => Promise<void>` to `(url: string | null) => Promise<void>` — matches every real kit's own save-avatar contract (e.g. merqo's `saveAvatar(url: string | null)`). `ProfileFormProps` gains required `avatarBucket: string`, `avatarPathPrefix: string`, `onAvatarUpload: (payload: { blob: Blob; ext: string; contentType: string; path: string }) => Promise<string>` (this must match `ImageUploader`'s own existing `onUpload` prop signature exactly — read `image-uploader.tsx` to confirm the exact parameter shape rather than trusting this plan's paraphrase), and optional passthroughs `resizeAvatarImage?`, `avatarMaxBytes?`, `avatarVariant?`, `avatarMaxDim?`, `onAvatarError?` mapped 1:1 to `ImageUploader`'s own optional props of similar purpose (confirm exact names in `image-uploader.tsx` first).

**Why:** confirmed across all 5 kits — every kit's own real `ProfileForm` composes its own local `ImageUploader` (with preview, remove button, client-side resize, type/size validation) in the avatar slot; this package's `ProfileForm` instead hand-rolls a bare `<input type="file">` + a plain "Save photo" button, a real downgrade. Separately, `SocialLinks` here only has 2 of the 4 fields every kit's own `src/lib/types.ts` defines (`website`, `instagram`, `facebook`, `tiktok` — confirmed in merqo/qkit/loopkit/paykit/stockkit). Since zero kits have migrated onto `ProfileForm` yet, both are clean breaking changes now, not back-compat problems.

- [ ] **Step 1: Read `src/image-uploader.tsx` in full**

Before writing any code, read the complete current `ImageUploaderProps` interface and the component's rendering (especially how it displays the current `value`, its remove button, and its "no value yet" upload-target state) — you need every exact prop name to wire this task correctly. Do not proceed on assumed names.

- [ ] **Step 2: Write the failing tests**

Read `src/profile-form.test.tsx` first to match its existing structure/mocks exactly (it already tests stall-name/password/social-links saves — reuse its render helper and default props object). Add/adapt tests covering:

```typescript
it("renders ImageUploader in the avatar section, wired to the avatar* props", () => {
  render(
    <ProfileForm
      {...baseProps}
      avatarBucket="vendor-avatars"
      avatarPathPrefix="vendor-123"
      onAvatarUpload={vi.fn()}
    />,
  );
  // Adjust this assertion to whatever ImageUploader's real "no avatar yet" upload-target
  // text/role actually is (confirm from image-uploader.tsx/its own tests) - e.g.:
  expect(screen.getByRole("button", { name: /add photo/i })).toBeInTheDocument();
});

it("calls onSaveAvatar with the uploaded URL, not a raw File", async () => {
  // Adapt this test to however image-uploader.test.tsx itself simulates a real
  // upload completing (it already has this pattern - reuse it, don't reinvent it) -
  // the key assertion is that ProfileForm's onSaveAvatar prop receives a `string | null`
  // URL, not a File object, once the upload completes.
});

it("saving social links includes facebook and tiktok fields", async () => {
  const onSaveStallIdentity = vi.fn().mockResolvedValue(undefined);
  render(
    <ProfileForm
      {...baseProps}
      onSaveStallIdentity={onSaveStallIdentity}
      initial={{
        ...baseProps.initial,
        socialLinks: { website: "https://a.com", facebook: "https://fb.com/a", tiktok: "https://tiktok.com/@a" },
      }}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /save social links/i }));
  expect(onSaveStallIdentity).toHaveBeenCalledWith(
    expect.objectContaining({
      socialLinks: expect.objectContaining({
        website: "https://a.com",
        facebook: "https://fb.com/a",
        tiktok: "https://tiktok.com/@a",
      }),
    }),
  );
});

it("social links form has facebook and tiktok inputs", () => {
  render(<ProfileForm {...baseProps} avatarBucket="b" avatarPathPrefix="p" onAvatarUpload={vi.fn()} />);
  expect(screen.getByLabelText(/facebook/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/tiktok/i)).toBeInTheDocument();
});
```

Update the file's shared `baseProps`/default-props object (if it has one) to include the 3 new required props (`avatarBucket`, `avatarPathPrefix`, `onAvatarUpload`) so every OTHER existing test in this file keeps working — this is a required step, not optional, since `onSaveAvatar`'s signature change and the 3 new required props will break every existing render call in this file otherwise.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/profile-form.test.tsx`
Expected: FAIL — new props don't exist yet, avatar section still renders the old bare file input.

- [ ] **Step 4: Implement**

In `src/profile-form.tsx`:

1. Widen `SocialLinks`:
   ```typescript
   export interface SocialLinks {
     instagram?: string;
     website?: string;
     facebook?: string;
     tiktok?: string;
   }
   ```
2. Import `ImageUploader` and its prop type from `./image-uploader` (use the exact export names confirmed in Step 1).
3. Change `ProfileFormProps.onSaveAvatar` to `(url: string | null) => Promise<void>` and add the new required/optional avatar-related props confirmed in Step 1 (exact names/types must mirror `ImageUploaderProps` field-for-field for every prop you forward — do not invent new shapes).
4. Change `avatarSave`'s `useAsyncAction` callback from `async (file: File) => { await onSaveAvatar(file); }` to `async (url: string | null) => { await onSaveAvatar(url); }`.
5. Replace the "Profile picture" `Section`'s entire current inner content (the `<img>`/fallback + raw `<input type="file">` + form) with:
   ```tsx
   <ImageUploader
     bucket={avatarBucket}
     pathPrefix={avatarPathPrefix}
     value={initial.avatarUrl ?? null}
     onChange={(url) => avatarSave.run(url).catch((err) => onError?.(err))}
     onUpload={onAvatarUpload}
     resizeImage={resizeAvatarImage}
     maxBytes={avatarMaxBytes}
     variant={avatarVariant}
     maxDim={avatarMaxDim}
     onError={onAvatarError}
   />
   ```
   (Adjust prop names to match Step 1's confirmed real `ImageUploaderProps` exactly — this is illustrative, not verbatim-correct until you've read the real file.) Surface `avatarSave.error`/`avatarSave.pending` around it the same way the other sections in this file already surface their own save state (follow the existing `FieldError`/pending-button pattern used elsewhere in this same file) if `ImageUploader` doesn't already show its own error/pending UI internally (check — it likely does, per its own `role="alert"`/`aria-busy` from its own prior build; don't duplicate error UI if `ImageUploader` already renders it).
6. Update the two `Section` calls in this file (`icon={Store}` → `icon={<Store className="size-5" />}` style, for every `Section` usage in this file — `Store`, `ImageIcon`, `KeyRound`, `User`, `AtSign`) to match Task 3's new `icon: ReactNode` contract.
7. Add Facebook/TikTok inputs to the "Social links" `Section`'s form, following the exact pattern already used for the existing Instagram/Website inputs (same `border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50` classes, same `label`+`input` id-pairing convention, e.g. `profile-facebook`/`profile-tiktok`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/profile-form.test.tsx`
Expected: all tests PASS.

- [ ] **Step 6: Run the full suite and build**

Run: `pnpm test --run` — this should now be fully green again (Task 3's expected `profile-form.tsx` breakage is fixed by this task).
Run: `pnpm build`.

- [ ] **Step 7: Commit**

```bash
git add src/profile-form.tsx src/profile-form.test.tsx
git commit -m "fix: compose ImageUploader for ProfileForm's avatar section, widen SocialLinks to the real 4-field standard"
```

---

### Task 8: DashboardTour — ship the full popover CSS by default, de-hardcode the base class name

**Files:**
- Modify: `src/dashboard-tour.tsx`
- Test: `src/dashboard-tour.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `popoverCss(scopeClassName)`'s returned string changes from the current 3-selector minimal block to the full ruleset below. The hardcoded `"merqo-tour-popover"` literal in `buildDriverConfig`'s `popoverClass: cn("merqo-tour-popover", scopeClassName)` changes to `"tour-popover"`. No prop/interface changes — `DashboardTourProps` is unchanged.

**Why:** all 5 kits' own `tour.css` files are structurally identical (confirmed by diffing pairwise after normalizing scope-class-name/kit-name tokens — only the file's opening comment text differs cosmetically) — the exact same ~80-line ruleset (base popover background/color/border/border-radius/box-shadow/font-family/max-width, title, description, progress-text, close-button+hover, prev/next-button+hover+primary-treatment, and 4-directional arrow tinting), all driven by the same CSS custom properties (`--popover`, `--popover-foreground`, `--border`, `--radius-lg`, `--font-sans`, `--muted-foreground`, `--card`, `--primary`, `--foreground`, `--font-mono`, `--font-display`). The package's current self-injected CSS only covers 3 of these 8 selector groups. Since the fuller ruleset is already identical across every real kit, shipping it as the default eliminates the exact duplication this package exists to remove — once a kit migrates, it can delete its own `tour.css` entirely instead of still needing to hand-maintain it. Separately, the hardcoded `"merqo-tour-popover"` base class leaks one kit's name into every other kit's rendered DOM once they migrate — harmless functionally (each kit's own scoped selector still applies via `scopeClassName`), but a naming leak in an otherwise brand-neutral package.

- [ ] **Step 1: Write the failing tests**

Read `src/dashboard-tour.test.tsx` first to match its existing mocking pattern for `driver.js`/CSS injection (it already tests `ensureScopedStyles` indirectly — find how). Add:

```typescript
it("injects the full popover ruleset (title, description, progress-text, close-btn, prev/next-btn, arrow tints), not just the minimal subset", async () => {
  // Drive the tour to trigger ensureScopedStyles/CSS injection, following this file's
  // existing pattern for asserting on document.getElementById("merqo-tour-styles").
  // ... (adapt to the file's real setup - render, trigger start, then inspect the style tag)
  const styleEl = document.getElementById("merqo-tour-styles");
  const css = styleEl?.textContent ?? "";
  expect(css).toContain(".driver-popover-title");
  expect(css).toContain(".driver-popover-description");
  expect(css).toContain(".driver-popover-progress-text");
  expect(css).toContain(".driver-popover-close-btn");
  expect(css).toContain(".driver-popover-prev-btn");
  expect(css).toContain(".driver-popover-next-btn");
  expect(css).toContain(".driver-popover-arrow-side-left");
  expect(css).toContain(".driver-popover-arrow-side-right");
  expect(css).toContain(".driver-popover-arrow-side-top");
  expect(css).toContain(".driver-popover-arrow-side-bottom");
});

it("uses a generic \"tour-popover\" base class, not a kit-specific name", () => {
  // Adapt to however this file's existing tests inspect the driver config passed to
  // the mocked driver.js `driver()` call (it already does this for `steps`).
  // Assert popoverClass contains "tour-popover" and does NOT contain "merqo-tour-popover".
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/dashboard-tour.test.tsx`
Expected: FAIL — current CSS is missing most selectors; `popoverClass` still says `"merqo-tour-popover"`.

- [ ] **Step 3: Implement**

In `src/dashboard-tour.tsx`:

1. Change `popoverClass: cn("merqo-tour-popover", scopeClassName)` to `popoverClass: cn("tour-popover", scopeClassName)` in `buildDriverConfig`.
2. Replace the `popoverCss` function's returned template string with:
   ```typescript
   function popoverCss(scopeClassName: string): string {
     return `
   .driver-popover.${scopeClassName} {
     background: var(--popover);
     color: var(--popover-foreground);
     border: 1px solid var(--border);
     border-radius: var(--radius-lg);
     box-shadow:
       0 10px 30px -12px rgb(0 0 0 / 0.35),
       0 2px 8px -4px rgb(0 0 0 / 0.2);
     font-family: var(--font-sans);
     max-width: 320px;
   }
   .driver-popover.${scopeClassName} .driver-popover-title {
     font-family: var(--font-display, var(--font-sans));
     font-size: 1.05rem;
     font-weight: 600;
     color: var(--foreground);
   }
   .driver-popover.${scopeClassName} .driver-popover-description {
     color: var(--muted-foreground);
     font-size: 0.875rem;
     line-height: 1.4;
   }
   .driver-popover.${scopeClassName} .driver-popover-progress-text {
     color: var(--muted-foreground);
     font-family: var(--font-mono);
     font-size: 0.72rem;
   }
   .driver-popover.${scopeClassName} .driver-popover-close-btn {
     color: var(--muted-foreground);
     transition: color 0.15s ease;
   }
   .driver-popover.${scopeClassName} .driver-popover-close-btn:hover {
     color: var(--foreground);
   }
   .driver-popover.${scopeClassName} .driver-popover-prev-btn,
   .driver-popover.${scopeClassName} .driver-popover-next-btn {
     text-shadow: none;
     border-radius: var(--radius-md);
     border: 1px solid var(--border);
     background: var(--card);
     color: var(--foreground);
     font-size: 0.8rem;
     font-weight: 500;
     padding: 0.3rem 0.7rem;
     transition: background 0.15s ease;
   }
   .driver-popover.${scopeClassName} .driver-popover-prev-btn:hover,
   .driver-popover.${scopeClassName} .driver-popover-next-btn:hover {
     background: var(--muted);
   }
   .driver-popover.${scopeClassName} .driver-popover-next-btn {
     background: var(--primary);
     border-color: var(--primary);
     color: var(--primary-foreground);
   }
   .driver-popover.${scopeClassName} .driver-popover-next-btn:hover {
     background: var(--primary);
     opacity: 0.9;
   }
   .driver-popover.${scopeClassName} .driver-popover-arrow-side-left {
     border-left-color: var(--popover);
   }
   .driver-popover.${scopeClassName} .driver-popover-arrow-side-right {
     border-right-color: var(--popover);
   }
   .driver-popover.${scopeClassName} .driver-popover-arrow-side-top {
     border-top-color: var(--popover);
   }
   .driver-popover.${scopeClassName} .driver-popover-arrow-side-bottom {
     border-bottom-color: var(--popover);
   }
   `;
   }
   ```
   (This is merqo's own `tour.css` content verbatim, generalized from the literal `.driver-popover.merqo-tour` selector to the templated `.driver-popover.${scopeClassName}` selector already used by this function — confirmed structurally identical across all 5 kits by the audit.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/dashboard-tour.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test --run` and `pnpm build`.

- [ ] **Step 6: Commit**

```bash
git add src/dashboard-tour.tsx src/dashboard-tour.test.tsx
git commit -m "feat: ship the full cross-kit popover CSS by default, rename hardcoded base class to tour-popover"
```

---

### Task 9: Release v0.7.0

**Files:**
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: all 8 prior tasks merged and passing.
- Produces: tagged, pushed `v0.7.0` release.

- [ ] **Step 1: Run the full test suite and full build**

Run: `pnpm test --run` — expect all tests pass (no regressions in any component's suite, and Task 3's intentional interim breakage is resolved by Task 7).
Run: `pnpm build` — expect success.
Run: `pnpm tsc --noEmit` — expect no type errors.

- [ ] **Step 2: Bump version**

In `package.json`, change `"version": "0.6.0"` to `"version": "0.7.0"`.

- [ ] **Step 3: Update README**

In `README.md`:
- Change every occurrence of `github:cljiahao/merqo-ui#v0.6.0` to `github:cljiahao/merqo-ui#v0.7.0`.
- Update the `InfoTooltip`, `useAsyncAction`, `Section`, `AccountMenu`, `DashboardNav`, `FeedbackSheet`/`HelpSheet`, `ProfileForm`, and `DashboardTour` component-blurb bullets to mention the new capabilities added in this plan (`trigger="tap"`, `navigatingAway`, corrected `Section` contract, `tierBadge`/`data-tour="nav-account"`, `isActiveHref`/`tourAnchor`/`data-tour="nav-menu"`, `title`/`description` overrides, `ImageUploader`-composed avatar + 4-field `SocialLinks`, full default popover CSS) — match this README's existing terseness/style per bullet, don't over-write.

- [ ] **Step 4: Commit, tag, push**

```bash
git add package.json README.md
git commit -m "chore: release v0.7.0"
git tag v0.7.0
git push origin main
git push origin v0.7.0
```

- [ ] **Step 5: Verify the pushed tag in a clean clone**

```bash
cd /tmp && git clone --branch v0.7.0 https://github.com/cljiahao/merqo-ui.git merqo-ui-verify
cd merqo-ui-verify && pnpm install && pnpm test --run && pnpm build
```

Expected: all tests pass, build succeeds, against the real pushed tag.

Clean up afterward:

```bash
cd /tmp && rm -rf merqo-ui-verify
```
