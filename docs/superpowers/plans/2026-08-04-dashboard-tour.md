# DashboardTour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `DashboardTour` to `@merqo/ui`, replacing five drifted per-kit `driver.js` wiring copies while keeping each kit's own step *content* (`tour-steps.ts`) fully local — only the mechanism is shared.

**Architecture:** A single client component in `src/dashboard-tour.tsx` that owns the `driver.js` lifecycle (lazy import, config, mount, replay, teardown), the floating "?" replay button, and the scoped popover CSS (injected at runtime via a `<style>` tag, not shipped as a separate asset — this package's build has no CSS loader). Every kit-specific decision is an injected prop: `steps` (the array itself, already resolved mobile-vs-desktop by the caller), `onFirstSeen` (the "mark seen" persistence call — three different kits use three different tables/write-strategies today), `isHomeRoute` (caller already knows its own routing), `scopeClassName` (caller's own per-kit CSS scope, e.g. `"loopkit-tour"`). `driver.js` itself becomes a real (externalized) dependency of this package — every kit already depends on the identical `^1.6.0` version, so this doesn't add a second copy.

**Tech Stack:** React 19, TypeScript (strict), `driver.js ^1.6.0` (externalized), Tailwind v4 semantic classes for the floating button, lucide-react icon, vitest + @testing-library/react (jsdom), tsup build.

## Global Constraints

- **No literal color, font-family, or radius values in the component's own Tailwind classes.** The injected `<style>` block is exempt from this (it's CSS, not Tailwind, and every value in it is a `var(--...)` reference to the consumer's own theme tokens — never a literal).
- **No dependency on any consuming kit's local files or globals.** No `@/app/...` imports, no hardcoded table names, no Supabase client. All side effects and content arrive as props.
- **`tour-steps.ts`-equivalent content (the actual step text/selectors) is never part of this package.** The component takes a `steps: TourStep[]` prop; it never imports or generates step content itself.
- **`"use client"` must be the first line** of the component file.
- **`driver.js`'s own base CSS (`driver.js/dist/driver.css`) is NOT imported by this package** — tsup/esbuild has no CSS loader (unlike each kit's own Next.js/webpack build, which already handles this import today). This must be documented as a required consumer import, the same class of requirement as the Tailwind `@source` line and the pnpm `allowBuilds` entry — get this wrong and it repeats the exact mistake v0.1.0 made twice.
- **The scoped popover CSS (the part actually worth sharing) ships as a runtime-injected `<style>` tag**, deduplicated so multiple mounted instances (or remounts) don't append it twice. Content is the CSS block already common across all 5 kits' `tour.css`, with the scope selector parameterized by `scopeClassName`.
- **`driver.js` is imported lazily** (`await import("driver.js")`), matching every kit's existing pattern — never a top-level static import (keeps it out of the initial bundle for kits that don't render the tour on first paint).
- **The driver config block must match all 5 kits' existing config exactly**: `showProgress: true`, `allowClose: true`, `overlayOpacity: 0.6`, `nextBtnText: "Next"`, `prevBtnText: "Back"`, `doneBtnText: "Done"`, `onDestroyed` callback.
- **`onFirstSeen` fires at most once per mount-to-completion cycle**, and only when the tour actually completes/closes for a user who hadn't seen it before (`seen === false` at mount time) — never on every `onDestroyed` call, and never for a user who already had `seen === true`.
- **Every test asserts real observable behavior.** Negative/error paths required where applicable (e.g. `onFirstSeen` rejecting must not crash the component).
- Tests run with `pnpm test`; type check with `pnpm typecheck`; build with `pnpm build`. All three must pass before a task is committed.
- Commit style: `feat: ...` / `fix: ...` / `docs: ...`, imperative mood, no trailing period.

---

## File Structure

- **Create** `src/dashboard-tour.tsx` — the component, its exported types (`TourStep`, `DashboardTourProps`), and module-private helpers (the popover CSS template, a `driver.js` config builder). One file, matching the package's established one-file-per-component convention.
- **Create** `src/dashboard-tour.test.tsx` — all behavior tests.
- **Modify** `src/index.ts` — public exports.
- **Modify** `README.md` — component list entry + a new "`driver.js` CSS import" consumer-setup subsection.
- **Modify** `package.json` — add `driver.js` dependency, version bump.
- **Modify** `tsup.config.ts` — externalize `driver.js`.

---

### Task 1: DashboardTour state machine, driver.js wiring, floating button

**Files:**
- Create: `src/dashboard-tour.tsx`
- Test: `src/dashboard-tour.test.tsx`
- Modify: `tsup.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `cn` from `./lib/utils`.
- Produces (Task 2 extends this same file; Task 3 re-exports these names):
  ```ts
  export interface TourStep {
    element: string;
    title: string;
    description: string;
  }
  export interface DashboardTourProps {
    steps: TourStep[];
    seen: boolean;
    onFirstSeen: () => Promise<void>;
    isHomeRoute: boolean;
    scopeClassName: string;
  }
  export function DashboardTour(props: DashboardTourProps): React.JSX.Element | null;
  ```

**Background the implementer needs:**

All 5 kits' `dashboard-tour.tsx` share a byte-identical `driver.js` config block and lifecycle shape, but each hardcodes its own "mark tour seen" persistence call (three different Supabase tables, two different write strategies — `update` vs `upsert`) and branches on `isMobile` inconsistently (merqo has no mobile branching at all, since it has no burger menu). This task extracts the shared mechanism; the persistence call becomes the injected `onFirstSeen` prop, and the mobile/desktop step selection is resolved entirely by the CALLER before this component ever sees `steps` — this component only ever receives one flat, already-resolved array.

The component renders `null` when `!isHomeRoute` (every kit's tour trigger only appears on its dashboard home page — this is a hard behavioral floor, not a default that can be overridden by a missing prop).

- [ ] **Step 1: Write the failing tests**

Create `src/dashboard-tour.test.tsx` with exactly this content:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { DashboardTour, type DashboardTourProps } from "./dashboard-tour";

const STEPS = [
  { element: "[data-tour=a]", title: "Step A", description: "First step" },
  { element: "[data-tour=b]", title: "Step B", description: "Second step" },
];

function baseProps(
  overrides: Partial<DashboardTourProps> = {},
): DashboardTourProps {
  return {
    steps: STEPS,
    seen: false,
    onFirstSeen: vi.fn().mockResolvedValue(undefined),
    isHomeRoute: true,
    scopeClassName: "test-tour",
    ...overrides,
  };
}

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("DashboardTour — mount behavior", () => {
  it("renders nothing when isHomeRoute is false", () => {
    const { container } = render(
      <DashboardTour {...baseProps({ isHomeRoute: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the floating replay button when isHomeRoute is true", async () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    expect(
      await screen.findByRole("button", { name: /replay tour/i }),
    ).toBeInTheDocument();
  });

  it("does not render the replay button when isHomeRoute is false, even if seen is true", () => {
    render(<DashboardTour {...baseProps({ isHomeRoute: false, seen: true })} />);
    expect(
      screen.queryByRole("button", { name: /replay tour/i }),
    ).not.toBeInTheDocument();
  });
});

describe("DashboardTour — onFirstSeen contract", () => {
  it("does not call onFirstSeen just from mounting when seen is already true", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    await screen.findByRole("button", { name: /replay tour/i });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });

  it("clicking replay never calls onFirstSeen for a user who has already seen the tour", async () => {
    const onFirstSeen = vi.fn().mockResolvedValue(undefined);
    render(<DashboardTour {...baseProps({ seen: true, onFirstSeen })} />);
    const button = await screen.findByRole("button", { name: /replay tour/i });
    await act(async () => {
      button.click();
    });
    expect(onFirstSeen).not.toHaveBeenCalled();
  });
});

describe("DashboardTour — driver.js config", () => {
  it("passes the exact shared driver.js config on every mount", async () => {
    const driverSpy = vi.fn(() => ({
      drive: vi.fn(),
      destroy: vi.fn(),
    }));
    vi.doMock("driver.js", () => ({ driver: driverSpy }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    render(<FreshDashboardTour {...baseProps({ seen: true })} />);
    await waitFor(() => expect(driverSpy).toHaveBeenCalledTimes(1));

    const config = driverSpy.mock.calls[0][0];
    expect(config).toMatchObject({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
    });
    expect(config.steps).toEqual([
      {
        element: "[data-tour=a]",
        popover: { title: "Step A", description: "First step" },
      },
      {
        element: "[data-tour=b]",
        popover: { title: "Step B", description: "Second step" },
      },
    ]);
    expect(config.popoverClass).toContain("test-tour");
    expect(typeof config.onDestroyed).toBe("function");

    vi.doUnmock("driver.js");
  });

  it("destroys the driver instance on unmount", async () => {
    const destroy = vi.fn();
    vi.doMock("driver.js", () => ({
      driver: vi.fn(() => ({ drive: vi.fn(), destroy })),
    }));
    const { DashboardTour: FreshDashboardTour } = await import(
      "./dashboard-tour"
    );

    const { unmount } = render(
      <FreshDashboardTour {...baseProps({ seen: true })} />,
    );
    await waitFor(() => expect(destroy).not.toHaveBeenCalled());

    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);

    vi.doUnmock("driver.js");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: FAIL — `Failed to resolve import "./dashboard-tour"`.

- [ ] **Step 3: Add `driver.js` as a dependency and externalize it**

In `package.json`, add to `dependencies` (alphabetical with the existing `@radix-ui/react-tooltip`, `clsx`, etc.):

```json
"driver.js": "^1.6.0",
```

In `tsup.config.ts`, add `"driver.js"` to the `external` array alongside `"react"` and `"react-dom"`:

```ts
external: ["react", "react-dom", "driver.js"],
```

Run `pnpm install` after this change.

- [ ] **Step 4: Write the component**

Create `src/dashboard-tour.tsx`:

```tsx
"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "./lib/utils";

export interface TourStep {
  /** CSS selector for the element this step highlights. */
  element: string;
  title: string;
  description: string;
}

export interface DashboardTourProps {
  /** Already resolved by the caller — mobile-vs-desktop selection happens
   *  upstream, this component only ever sees one flat array. */
  steps: TourStep[];
  /** Whether this user has completed the tour before. */
  seen: boolean;
  /** Called once, the first time this user finishes/dismisses the tour
   *  while `seen` was false at mount. Persistence (which table, which
   *  write strategy) is entirely the caller's concern. */
  onFirstSeen: () => Promise<void>;
  /** The tour trigger only ever appears on a kit's dashboard home page —
   *  the caller already knows its own routing, so this is a plain boolean,
   *  not a route string the package would have to compare against. */
  isHomeRoute: boolean;
  /** Kit-specific CSS scope for the popover style override, e.g.
   *  "loopkit-tour". Keeps each kit's tour visually branded without this
   *  package knowing about any kit's palette. */
  scopeClassName: string;
}

interface DriverInstance {
  drive: () => void;
  destroy: () => void;
}

// Byte-identical across all 5 kits today — the actual duplicated value this
// component exists to remove.
function buildDriverConfig(
  steps: TourStep[],
  scopeClassName: string,
  onDestroyed: () => void,
) {
  return {
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.6,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    popoverClass: cn("merqo-tour-popover", scopeClassName),
    steps: steps.map((step) => ({
      element: step.element,
      popover: { title: step.title, description: step.description },
    })),
    onDestroyed,
  };
}

export function DashboardTour({
  steps,
  seen,
  onFirstSeen,
  isHomeRoute,
  scopeClassName,
}: DashboardTourProps) {
  const driverRef = React.useRef<DriverInstance | null>(null);
  const seenAtMountRef = React.useRef(seen);

  const startTour = React.useCallback(async () => {
    const { driver } = await import("driver.js");
    const onDestroyed = () => {
      if (!seenAtMountRef.current) {
        seenAtMountRef.current = true;
        void onFirstSeen();
      }
    };
    const instance = driver(
      buildDriverConfig(steps, scopeClassName, onDestroyed),
    );
    driverRef.current = instance;
    instance.drive();
  }, [steps, scopeClassName, onFirstSeen]);

  React.useEffect(() => {
    if (!isHomeRoute) return;
    if (!seenAtMountRef.current) {
      void startTour();
    }
    return () => {
      driverRef.current?.destroy();
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHomeRoute]);

  if (!isHomeRoute) return null;

  return (
    <button
      type="button"
      onClick={() => void startTour()}
      aria-label="Replay tour"
      className="bg-primary text-primary-foreground ring-black/5 fixed right-5 bottom-5 z-40 inline-flex size-12 items-center justify-center rounded-full shadow-lg ring-1"
    >
      <HelpCircle className="size-5" />
    </button>
  );
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 6: Verify types and full suite**

Run: `pnpm typecheck && pnpm test`
Expected: no type errors; all suites pass (116 pre-existing + 7 new).

- [ ] **Step 7: Commit**

```bash
git add src/dashboard-tour.tsx src/dashboard-tour.test.tsx tsup.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add DashboardTour state machine and driver.js wiring"
```

---

### Task 2: Scoped popover CSS, injected at runtime

**Files:**
- Modify: `src/dashboard-tour.tsx`
- Test: `src/dashboard-tour.test.tsx` (append a second `describe` block)

**Interfaces:**
- Consumes: everything Task 1 produced.
- Produces: no new exported names. Adds a module-private CSS-injection helper.

**Background the implementer needs:**

`tour.css` is identical in structure across all 5 kits — 100% CSS-custom-property-driven (`var(--popover)`, `var(--radius-lg)`, `var(--font-sans)`, `var(--primary)`, etc.), zero literal values, differing only by the scope selector (`.driver-popover.loopkit-tour` vs `.driver-popover.merqo-tour`, etc.). This package has no CSS asset pipeline (tsup/esbuild, unlike each kit's Next.js/webpack build), so the shared styling is injected as a `<style>` element at mount time instead of shipped as a file. It must be deduplicated (checked by a stable `id`) so remounting the component, or mounting it twice, doesn't append the block repeatedly.

- [ ] **Step 1: Write the failing tests**

Append to `src/dashboard-tour.test.tsx`:

```tsx
describe("DashboardTour — injected popover CSS", () => {
  it("injects a <style> element scoped to scopeClassName", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const style = document.getElementById("merqo-tour-styles");
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain(".test-tour");
  });

  it("uses only CSS custom-property values, never a literal color/font/radius", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgb\(|\bhsl\(|\boklch\(/);
    expect(css).toContain("var(--popover)");
  });

  it("does not duplicate the <style> element when mounted twice", () => {
    const { unmount } = render(<DashboardTour {...baseProps({ seen: true })} />);
    unmount();
    render(<DashboardTour {...baseProps({ seen: true, scopeClassName: "other-tour" })} />);
    expect(
      document.querySelectorAll("#merqo-tour-styles"),
    ).toHaveLength(1);
  });

  it("a second mount with a different scopeClassName still gets its own scoped rule available", () => {
    render(<DashboardTour {...baseProps({ seen: true })} />);
    render(<DashboardTour {...baseProps({ seen: true, scopeClassName: "second-tour" })} />);
    const css = document.getElementById("merqo-tour-styles")?.textContent ?? "";
    expect(css).toContain(".test-tour");
    expect(css).toContain(".second-tour");
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: the new tests FAIL (no `<style>` element exists yet). Task 1's tests still pass.

- [ ] **Step 3: Implement CSS injection**

In `src/dashboard-tour.tsx`, add this module-private helper after `buildDriverConfig`:

```tsx
const STYLE_ELEMENT_ID = "merqo-tour-styles";

// One shared block per scope class, appended (not replaced) so multiple
// kit-branded tours mounted in the same document each keep their own rule.
function popoverCss(scopeClassName: string): string {
  return `
.driver-popover.${scopeClassName} {
  background: var(--popover);
  color: var(--popover-foreground);
  border-radius: var(--radius-lg);
  font-family: var(--font-sans);
}
.driver-popover.${scopeClassName} .driver-popover-title {
  font-family: var(--font-display, var(--font-sans));
  color: var(--popover-foreground);
}
.driver-popover.${scopeClassName} .driver-popover-next-btn,
.driver-popover.${scopeClassName} .driver-popover-prev-btn,
.driver-popover.${scopeClassName} .driver-popover-close-btn {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius-md);
}
`;
}

function ensureScopedStyles(scopeClassName: string) {
  let styleEl = document.getElementById(
    STYLE_ELEMENT_ID,
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  if (!styleEl.textContent?.includes(`.${scopeClassName} {`)) {
    styleEl.textContent = (styleEl.textContent ?? "") + popoverCss(scopeClassName);
  }
}
```

Then, inside `DashboardTour`, add a `React.useEffect` immediately after the existing mount effect:

```tsx
  React.useEffect(() => {
    ensureScopedStyles(scopeClassName);
  }, [scopeClassName]);
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: PASS — 11 tests total in this file.

- [ ] **Step 5: Verify types and full suite**

Run: `pnpm typecheck && pnpm test`
Expected: no type errors; all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/dashboard-tour.tsx src/dashboard-tour.test.tsx
git commit -m "feat: inject scoped popover CSS for DashboardTour"
```

---

### Task 3: Publish DashboardTour — exports, README consumer setup, version bump

**Files:**
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `package.json:3` (version)
- Test: `src/dashboard-tour.test.tsx` (one appended export test)

**Interfaces:**
- Consumes: `DashboardTour`, `DashboardTourProps`, `TourStep` from `./dashboard-tour`.
- Produces: those same names on the package's public entry point.

**Background the implementer needs:**

Two real consumer-facing requirements this component introduces, both must be documented as explicitly as the existing `@source`/`allowBuilds`/`next/image remotePatterns` sections — this is the exact class of gap that broke v0.1.0 twice:

1. **`driver.js/dist/driver.css` must be imported by the consuming kit itself** — this package cannot bundle it (no CSS loader in its own build), and every kit already does this import today via Next's native CSS support, so this is "keep doing what you already do," not new work, but it must be stated explicitly since a kit dropping its own `dashboard-tour.tsx` in favor of the shared one could easily also drop that import by mistake.
2. **Each kit must keep passing its OWN `tour-steps.ts` content** — this package never generates or imports step content; a migrating kit computes its own `steps` array (already resolved for mobile vs desktop) and its own `scopeClassName`, and passes both in as props.

- [ ] **Step 1: Write the failing test**

Append to `src/dashboard-tour.test.tsx`:

```tsx
describe("DashboardTour — package entry point", () => {
  it("is exported from the package root", async () => {
    const pkg = await import("./index");
    expect(pkg.DashboardTour).toBe(DashboardTour);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: FAIL — `expected undefined to be [Function DashboardTour]`.

- [ ] **Step 3: Add the exports**

Append to `src/index.ts`:

```ts
export { DashboardTour } from "./dashboard-tour";
export type { DashboardTourProps, TourStep } from "./dashboard-tour";
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test src/dashboard-tour.test.tsx`
Expected: PASS — 12 tests.

- [ ] **Step 5: Document the consumer requirements in the README**

In `README.md`, add this subsection immediately **after** the `next/image` remote-patterns section added for `ImageUploader` and **before** "### Private repo auth for CI / deploys":

```markdown
### `driver.js` CSS import (only if you use `DashboardTour`)

`DashboardTour` wires up `driver.js` for you, but it cannot bundle
`driver.js`'s own base stylesheet — this package's build has no CSS
loader (unlike your kit's own Next.js/webpack build, which already
handles this). Import it once, wherever your kit already imports global
CSS (e.g. alongside `globals.css` in your root layout):

```ts
import "driver.js/dist/driver.css";
```

Every kit already does this today for its own local tour component — if
you're migrating an existing `dashboard-tour.tsx` to the shared one,
keep this import, don't drop it.

The scoped popover styling (the part that actually differs per kit —
background, radius, button colors) is injected automatically at runtime
via your kit's own theme tokens (`var(--popover)`, `var(--primary)`,
etc.) — no separate stylesheet needed for that part, just the base
`driver.css` import above.

`DashboardTour` never generates or imports tour step content — keep your
own `tour-steps.ts` exactly as it is today, and pass its array as the
`steps` prop (already resolved for mobile vs. desktop by your own code,
same as before).
```

Then add this bullet to the end of the "## Components" list:

```markdown
- `DashboardTour` — wires up `driver.js` (config, lifecycle, floating
  replay button) from an injected `steps` array, `onFirstSeen` callback,
  and `scopeClassName` — the tour mechanism is shared, tour content and
  "has this user seen it" persistence stay entirely kit-local.
```

- [ ] **Step 6: Bump the version**

In `package.json`, change `"version": "0.3.0"` to `"version": "0.4.0"`.

- [ ] **Step 7: Verify the whole toolchain**

Run: `pnpm typecheck && pnpm build && pnpm test`
Expected: no type errors; build succeeds; all suites pass, including
`src/build-output.test.ts`'s `"use client"` banner guard.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts src/dashboard-tour.test.tsx README.md package.json
git commit -m "feat: export DashboardTour, document driver.css import requirement, bump to v0.4.0"
```

---

## Self-Review

**Spec coverage:**
- Shared driver.js config block, byte-matching all 5 kits — Task 1 Step 4, tested by Task 1's config test. ✅
- `steps` injected as a flat, already-resolved array (no mobile/desktop logic in the package) — Task 1 interfaces + Global Constraints. ✅
- `onFirstSeen` injected, fires at most once, only for a first-time viewer — Task 1, the two onFirstSeen-contract tests. ✅
- `isHomeRoute` gates both the auto-start and the floating button — Task 1, the three mount-behavior tests. ✅
- `tour-steps.ts`-equivalent content never touched/imported by the package — Global Constraints, Task 3's README note. ✅
- Scoped popover CSS injected at runtime, no literal values, deduplicated — Task 2. ✅
- `driver.js/dist/driver.css` documented as a required consumer import (this package can't bundle it) — Task 3 Step 5, same class as the `@source`/`allowBuilds`/`remotePatterns` precedents. ✅
- `driver.js` externalized in the build, added as a real dependency — Task 1 Step 3. ✅
- Cleanup on unmount (`driver.destroy()`) — Task 1, the destroy-on-unmount test. ✅
- README component list + version bump + no tag reuse — Task 3. ✅

**Placeholder scan:** No TBD/TODO; every code step carries literal code.

**Type consistency:** `TourStep` (`element`/`title`/`description`) is defined once in Task 1 and used identically in the driver config mapping and every test. `DashboardTourProps` is defined once and its fields (`steps`, `seen`, `onFirstSeen`, `isHomeRoute`, `scopeClassName`) are consumed consistently across all 3 tasks with no renaming.
