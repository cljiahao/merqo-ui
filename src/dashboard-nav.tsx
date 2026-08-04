"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { AccountMenu, type AccountMenuProps } from "./account-menu";

export type DashboardNavProps = {
  wordmark: React.ReactNode;
  navLinks: { href: string; label: string }[];
} & AccountMenuProps;

export function DashboardNav({
  wordmark,
  navLinks,
  ...accountMenuProps
}: DashboardNavProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="border-border bg-background/85 sticky top-0 z-20 border-b px-5 py-3.5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Menu"
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
                className="text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <AccountMenu {...accountMenuProps} />
      </div>

      {mobileOpen ? (
        <nav
          aria-label="Mobile"
          className="border-border bg-background absolute inset-x-0 top-full flex flex-col gap-1 border-b p-3 sm:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-foreground rounded-md px-2 py-2 text-sm font-medium"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
