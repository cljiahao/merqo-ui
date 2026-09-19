import { defineConfig } from "tsup";

const mdLoader = (options: { loader?: Record<string, string> }) => {
  options.loader = {
    ...options.loader,
    ".md": "text",
  };
};

// Every module `src/index.ts` re-exports gets its own tsup entry. `index`
// itself is deliberately NOT built by tsup -- see scripts/build-index.mjs.
const ENTRIES = {
  "about-merqo": "src/about-merqo.tsx",
  "account-menu": "src/account-menu.tsx",
  "audit-log-table": "src/audit-log-table.tsx",
  "back-button": "src/back-button.tsx",
  "dashboard-nav": "src/dashboard-nav.tsx",
  "dashboard-tour": "src/dashboard-tour.tsx",
  "dashboard-tours": "src/dashboard-tours.tsx",
  "data-table": "src/data-table.tsx",
  "elevated-card": "src/elevated-card.tsx",
  "feedback-sheet": "src/feedback-sheet.tsx",
  footer: "src/footer.tsx",
  "help-sheet": "src/help-sheet.tsx",
  "image-uploader": "src/image-uploader.tsx",
  "info-tooltip": "src/info-tooltip.tsx",
  "kit-family": "src/kit-family.ts",
  "landing-nav": "src/landing-nav.tsx",
  "legal-acceptance-checkbox": "src/legal-acceptance-checkbox.tsx",
  "legal-document": "src/legal-document.tsx",
  "legal-footer-links": "src/legal-footer-links.tsx",
  "money-input": "src/money-input.tsx",
  "plan-comparison-table": "src/plan-comparison-table.tsx",
  "pricing-form": "src/pricing-form.tsx",
  qr: "src/qr.ts",
  section: "src/section.tsx",
  "social-icons": "src/social-icons.tsx",
  "social-links-fields": "src/social-links-fields.tsx",
  "stat-tile": "src/stat-tile.tsx",
  "status-badge": "src/status-badge.tsx",
  "two-column-sections": "src/two-column-sections.tsx",
  "use-async-action": "src/use-async-action.ts",
  "use-money-field": "src/use-money-field.ts",
  "vendor-telegram-section": "src/vendor-telegram-section.tsx",
};

export default defineConfig([
  {
    entry: ENTRIES,
    format: ["esm"],
    // Declarations are emitted separately by `tsc -p tsconfig.build.json`
    // (plain per-file emit, not rollup-plugin-dts bundling) — see the `build`
    // script. rollup-plugin-dts's single-file bundling was silently producing
    // a near-empty dist/index.d.ts (bare unresolved re-exports, no inlined
    // types) on Linux CI runners while working fine on Windows with the
    // identical tsup/typescript versions; every @merqo/ui consumer type
    // silently degraded to `any`. Root cause not fully isolated (suspected
    // rollup-plugin-dts module-resolution difference under pnpm's Linux
    // git-dependency temp checkout), but tsc's own declaration emission is
    // the more deterministic, cross-platform path — same tool as `typecheck`.
    dts: false,
    clean: true,
    external: ["react", "react-dom", "driver.js", "driver.js/*"],
    // Each module's own entry file carries (or correctly omits) its real
    // "use client" directive, and dist/index.js re-exports from those entry
    // files -- so the module the server imports is always directive-correct.
    // Shared chunks below that boundary need no directive of their own.
    // Replaces a package-wide banner. See qkit's docs/meta/2026-09-18 AAR.
    splitting: true,
    esbuildOptions: mdLoader,
  },
  {
    // Pure, non-React legal utilities, kept as a documented separate public
    // entry point (`@merqo/ui/legal`) for existing consumers -- redundant
    // with `legal`'s own entry above now that directives are preserved
    // per-module, but kept for backward compatibility.
    entry: { legal: "src/legal.ts" },
    format: ["esm"],
    dts: false,
    clean: false,
    esbuildOptions: mdLoader,
  },
]);
