import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "driver.js"],
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
});
