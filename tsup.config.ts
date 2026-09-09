import { defineConfig } from "tsup";

const mdLoader = (options: { loader?: Record<string, string> }) => {
  options.loader = {
    ...options.loader,
    ".md": "text",
  };
};

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
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
    // Tradeoff: makes the whole package client-only — `./legal` below is
    // the split-entry escape hatch for server code needing a plain export.
    banner: {
      js: '"use client";',
    },
    esbuildOptions: mdLoader,
  },
  {
    // Pure, non-React legal utilities, un-banered, so server code (a Server
    // Action, a server-only gate) can call them without the client-boundary
    // error. Deliberately duplicates legal.ts's output rather than sharing
    // a chunk with `index` — simpler than per-chunk banners, cheap either way.
    entry: { legal: "src/legal.ts" },
    format: ["esm"],
    dts: false,
    clean: false,
    esbuildOptions: mdLoader,
  },
]);
