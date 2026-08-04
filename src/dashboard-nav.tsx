"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { cn } from "./lib/utils";

export type DashboardNavProps = {
  wordmark: React.ReactNode;
  navLinks: { href: string; label: string }[];
  isActiveHref?: (href: string) => boolean;
  tourAnchor?: (href: string) => string;
} & AccountMenuProps;

const MOBILE_PANEL_ID = "dashboard-nav-mobile-panel";

export function DashboardNav({
  wordmark,
  navLinks,
  isActiveHref,
  tourAnchor,
  ...accountMenuProps
}: DashboardNavProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // I7: Escape closes the mobile panel, matching the tap-away scrim below.
  React.useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <header className="border-border bg-background/85 sticky top-0 z-20 border-b px-5 py-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Mobile navigation menu"
            aria-expanded={mobileOpen}
            aria-controls={MOBILE_PANEL_ID}
            data-tour="nav-menu"
            className="focus-visible:ring-ring/50 inline-flex items-center justify-center rounded-md p-1.5 outline-none focus-visible:ring-2 sm:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Menu className="size-5" />
          </button>
          {wordmark}
          <nav className="hidden items-center gap-4 sm:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-tour={tourAnchor ? tourAnchor(link.href) : undefined}
                aria-current={isActiveHref?.(link.href) ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground text-sm font-medium",
                  isActiveHref?.(link.href) && "text-foreground",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <AccountMenu {...accountMenuProps} />
      </div>

      {mobileOpen ? (
        <>
          {/* Tap-away scrim (I7): closes the panel on outside click. Purely
              decorative/interaction-only, so it's hidden from the a11y tree
              - Escape (above) and the panel's own focusable links remain the
              accessible ways to dismiss it. */}
          <div
            aria-hidden="true"
            className="bg-foreground/20 fixed inset-0 z-10 sm:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            id={MOBILE_PANEL_ID}
            aria-label="Mobile navigation menu"
            className="border-border bg-background absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b p-3 sm:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-tour={tourAnchor ? tourAnchor(link.href) : undefined}
                aria-current={isActiveHref?.(link.href) ? "page" : undefined}
                className={cn(
                  "text-foreground rounded-md px-2 py-2 text-sm font-medium",
                  isActiveHref?.(link.href) && "text-foreground",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </>
      ) : null}
    </header>
  );
}
