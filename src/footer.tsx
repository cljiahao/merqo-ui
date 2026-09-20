import * as React from "react";
import { LegalFooterLinks } from "./legal-footer-links";

export interface FooterProps {
  /** Already-linked wordmark element (kit-specific markup, own href/anchor
   * behavior — e.g. a same-page hash jump needs a native `<a>`, not a
   * router `Link`). */
  wordmark: React.ReactNode;
  tagline: React.ReactNode;
  /** Lowercase kit name for the copyright line, e.g. "qkit". */
  kitName: string;
  /**
   * Replaces the whole copyright line. merqo is the hub, not a kit, so it
   * renders "(c) 2026 Merqo" with no "a Merqo kit" suffix.
   */
  copyright?: React.ReactNode;
  /**
   * Hides the vendor sign-in link. stockkit renders this same footer inside
   * its authenticated dashboard, where a sign-in link is meaningless.
   */
  showSignIn?: boolean;
}

// Shell only, same "fix drift in the shared shape" rationale as LandingNav:
// every kit's own footer had converged on the exact same layout/copy order
// (wordmark, tagline, copyright, About, legal links, sign-in) without it
// ever being one component. About/sign-in use a plain `<a>`, same as the
// composed LegalFooterLinks — a footer link is low-frequency enough that a
// full page load is an acceptable, deliberate simplification (unlike
// DashboardNav's dense nav bar, which takes a LinkComponent for this reason).
export function Footer({
  wordmark,
  tagline,
  kitName,
  copyright,
  showSignIn = true,
}: FooterProps): React.ReactElement {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row">
        {wordmark}
        <span>{tagline}</span>
        <span className="text-xs">
          {copyright ?? `© 2026 ${kitName} · a Merqo kit`}
        </span>
        <a href="/about" className="hover:text-foreground">
          About
        </a>
        <LegalFooterLinks />
        {showSignIn && (
          <a href="/login" className="hover:text-foreground">
            Vendor sign in →
          </a>
        )}
      </div>
    </footer>
  );
}
