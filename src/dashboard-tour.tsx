"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";

import { cn } from "./lib/utils";

export interface TourStep {
  /** CSS selector for the element this step highlights. */
  element: string;
  title: string;
  description: string;
}

export interface DashboardTourProps {
  /** A plain array, OR a lazy resolver function for kits that need
   *  SSR-safe mobile-vs-desktop splitting — called only at tour-start
   *  time (mirrors every kit's own lazy `window.matchMedia` resolution),
   *  never during render, so a function-form value stays SSR-safe. */
  steps: TourStep[] | (() => TourStep[]);
  /** Whether this user has completed the tour before. Only the value at
   *  first render is read — this matches every kit's own mount-only
   *  `useEffect(..., [])`, which also latches `seen` at mount. */
  seen: boolean;
  /** Fires once, immediately when an unseen user's tour auto-starts —
   *  NEVER on replay, NEVER on completion. This is a deliberate correction
   *  of this component's original "stamp on destroy" design, which would
   *  have reintroduced a bug every kit already fixed in production: a
   *  vendor who refreshed mid-tour (or before finishing it) never got
   *  tour_seen_at stamped server-side under the old design, so the
   *  auto-run tour kept re-running on every dashboard load until it was
   *  completed in one sitting without interruption. */
  onFirstSeen: () => Promise<void>;
  /** Whether the CURRENT route is the tour's home route. Used both to gate
   *  auto-start and to resume a pending cross-page replay once navigation
   *  completes. */
  isHomeRoute: boolean;
  /** Navigates to the tour's home route when replay is clicked from
   *  elsewhere (the caller's own router — e.g. `() => router.push("/dashboard")`).
   *  This package has no Next.js/router dependency, so navigation itself
   *  is always the caller's responsibility. */
  navigateHome: () => void;
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
  // Match the FULL scoped selector, not the bare `.${scopeClassName} {` —
  // the bare form false-positives whenever one scope's class name happens
  // to be a substring of an internal driver.js class already present in the
  // injected block (e.g. a scope literally named "driver-popover-title"
  // would never get its own rule, since that string already appears inside
  // the CSS for ANY scope).
  if (!styleEl.textContent?.includes(`.driver-popover.${scopeClassName} {`)) {
    styleEl.textContent = (styleEl.textContent ?? "") + popoverCss(scopeClassName);
  }
}

export function DashboardTour({
  steps,
  seen,
  onFirstSeen,
  isHomeRoute,
  navigateHome,
  scopeClassName,
}: DashboardTourProps) {
  const driverRef = React.useRef<DriverInstance | null>(null);
  const seenAtMountRef = React.useRef(seen);
  // Set when replay is tapped from another page; resumed once `isHomeRoute`
  // flips true (i.e. the caller's own navigation has actually landed).
  const pendingReplayRef = React.useRef(false);
  const unmountedRef = React.useRef(false);
  // Bumped on every start() call so a stale, superseded async build (an
  // earlier start() call whose lazy import was still pending when a newer
  // one began) never overwrites a newer instance or gets driven at all.
  const buildTokenRef = React.useRef(0);

  const start = React.useCallback(async () => {
    // Re-entrancy protection: destroy any live instance before building a
    // new one, rather than a `disabled` button attribute — matches every
    // kit's own `start()` shape exactly.
    driverRef.current?.destroy();
    driverRef.current = null;

    const token = ++buildTokenRef.current;
    const resolvedSteps = typeof steps === "function" ? steps() : steps;

    // driver.js (+ its base stylesheet) are loaded lazily, in the same
    // async boundary, so this package never ships the library — or forces
    // consumers to import its CSS themselves — on a page that never runs
    // the tour.
    const [{ driver }] = await Promise.all([
      import("driver.js"),
      import("driver.js/dist/driver.css"),
    ]);

    // Guard against two races the kits' simpler per-mount-only lifecycle
    // doesn't hit, but this shared component can: (1) the component
    // unmounted while the lazy import above was still pending, or (2) a
    // newer start() call (e.g. a rapid double-click of replay) has already
    // begun. Either way, never construct/drive/assign a stale instance.
    if (unmountedRef.current || token !== buildTokenRef.current) return;

    const instance = driver(
      buildDriverConfig(resolvedSteps, scopeClassName, () => {
        driverRef.current = null;
      }),
    ) as DriverInstance;
    driverRef.current = instance;
    instance.drive();
  }, [steps, scopeClassName]);

  // Auto-start once, on mount, for a first-time visitor on the tour's home
  // route. Stamps `onFirstSeen` immediately when the tour STARTS — not from
  // driver.js's `onDestroyed` — matching the fix every kit already shipped
  // in production (see the `onFirstSeen` doc comment above for why).
  // Deliberately no `.catch` here: every kit's own `void markTourSeen()` is
  // fire-and-forget too — this is a proven, already-shipped pattern, not an
  // oversight, so it should not be "fixed" later by someone who doesn't
  // know this.
  React.useEffect(() => {
    if (!isHomeRoute || seenAtMountRef.current) return;
    void onFirstSeen();
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
    // Intentionally mount-only, matching every kit's own effect; replay
    // after this is manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume a cross-page replay once the caller's own navigation has landed
  // us back on the tour's home route.
  React.useEffect(() => {
    if (!pendingReplayRef.current || !isHomeRoute) return;
    pendingReplayRef.current = false;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [isHomeRoute, start]);

  React.useEffect(() => {
    ensureScopedStyles(scopeClassName);
  }, [scopeClassName]);

  // Tear the overlay down on unmount (e.g. a route change mid-tour), and
  // flag the async-import race guard above.
  React.useEffect(() => {
    return () => {
      unmountedRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  function onReplay() {
    if (!isHomeRoute) {
      pendingReplayRef.current = true;
      navigateHome();
      return;
    }
    void start();
  }

  return (
    <button
      type="button"
      data-tour="tour-replay"
      onClick={onReplay}
      aria-label="Replay onboarding tour"
      className="bg-primary text-primary-foreground ring-border fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-1"
    >
      <CircleHelp className="h-6 w-6" />
    </button>
  );
}
