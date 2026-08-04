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

  React.useEffect(() => {
    ensureScopedStyles(scopeClassName);
  }, [scopeClassName]);

  if (!isHomeRoute) return null;

  return (
    <button
      type="button"
      onClick={() => void startTour()}
      aria-label="Replay tour"
      className="bg-primary text-primary-foreground ring-border fixed right-5 bottom-5 z-40 inline-flex size-12 items-center justify-center rounded-full shadow-lg ring-1"
    >
      <HelpCircle className="size-5" />
    </button>
  );
}
