import * as React from "react";

export type LandingNavProps = {
  wordmark: React.ReactNode;
  end: React.ReactNode;
};

// Shell only — each kit owns its wordmark markup and right-side content
// (secondary links, auth CTAs), which legitimately differ in copy/href
// per kit. This component exists to fix drift in the shared shape: sticky
// position, z-index, background opacity, and where padding lives.
export function LandingNav({ wordmark, end }: LandingNavProps) {
  return (
    // Same sticky-header shape as DashboardNav (border/bg/blur/z-index) —
    // but `py-4` (vs DashboardNav's `py-3.5`) and `max-w-6xl` (vs
    // DashboardNav's `max-w-7xl`) are a deliberate per-surface difference,
    // not drift: this header has no account-menu/burger row to keep dense,
    // and public pages' content columns are narrower than the dashboard's.
    <header className="border-border bg-background/85 sticky top-0 z-20 border-b px-5 py-4 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        {wordmark}
        <div className="flex items-center gap-2 sm:gap-4">{end}</div>
      </nav>
    </header>
  );
}
