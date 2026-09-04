import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
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
  // esbuild drops non-"use strict" directives when bundling multiple modules
  // into one file, so the "use client" directives in info-tooltip.tsx,
  // use-async-action.ts, and ui/tooltip.tsx are silently stripped from the
  // built dist/index.js. Re-inject it package-wide via banner instead.
  //
  // Tradeoff: TwoColumnSections has no client directive of its own and is a
  // pure server-renderable layout component, but this single-entry bundle
  // means the banner makes the whole package client-only. Accepted for v1
  // since every current component needs it; revisit (e.g. split entry
  // points) if a future server-only component is added.
  banner: {
    js: '"use client";',
  },
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".md": "text",
    };
  },
});
