"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { cn } from "./lib/utils";

export type DashboardNavLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export type DashboardNavProps = {
  wordmark: React.ReactNode;
  navLinks: { href: string; label: string }[];
  isActiveHref?: (href: string) => boolean;
  tourAnchor?: (href: string) => string;
  /**
   * Component used to render each nav link — defaults to a plain `<a>` so
   * this package stays framework-agnostic. Next.js consumers should pass
   * `next/link`'s `Link` here: a plain `<a>` forces a full page reload on
   * every nav click, which can abort any in-flight client-side write
   * (e.g. an unawaited "mark seen" call) started just before the click.
   */
  LinkComponent?: React.ComponentType<DashboardNavLinkProps>;
} & AccountMenuProps;

const MOBILE_PANEL_ID = "dashboard-nav-mobile-panel";

function DefaultLink({ href, ...rest }: DashboardNavLinkProps) {
  return <a href={href} {...rest} />;
}

export function DashboardNav({
  wordmark,
  navLinks,
  isActiveHref,
  tourAnchor,
  LinkComponent,
  ...accountMenuProps
}: DashboardNavProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const Link = LinkComponent ?? DefaultLink;

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
    // Sticky-header shell intentionally shares its shape (border/bg/blur/
    // z-index) with LandingNav's header below — but `py-3.5` (vs LandingNav's
    // `py-4`) and `max-w-7xl` (vs LandingNav's `max-w-6xl`) are a deliberate
    // per-surface difference, not drift: this nav's row is denser (it also
    // carries the account menu) and its max-width matches the dashboard
    // content area's own `max-w-7xl` cap (see this component's README entry).
    <header className="border-border bg-background/85 sticky top-0 z-20 border-b px-5 py-3.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
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
              <Link
                key={link.href}
                href={link.href}
                data-tour={tourAnchor ? tourAnchor(link.href) : undefined}
                aria-current={isActiveHref?.(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  isActiveHref?.(link.href) &&
                    "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <AccountMenu {...accountMenuProps} LinkComponent={LinkComponent} />
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
              <Link
                key={link.href}
                href={link.href}
                data-tour={tourAnchor ? tourAnchor(link.href) : undefined}
                aria-current={isActiveHref?.(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2 py-2 text-sm font-medium",
                  isActiveHref?.(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}
    </header>
  );
}
