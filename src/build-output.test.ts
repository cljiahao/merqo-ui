import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// This test reads the built dist/index.js and is only meaningful if
// `pnpm build` has already run in this checkout (dist/ is gitignored, not
// committed). `pnpm test` alone will NOT produce dist/ - run `pnpm build`
// first (or `pnpm build && pnpm test`) for this test to exercise anything.
// If dist/index.js is missing, we skip with a clear message instead of
// crashing on a confusing ENOENT.
const distIndexPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/index.js",
);
const distExists = existsSync(distIndexPath);

const distDtsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/index.d.ts",
);
const distDtsExists = existsSync(distDtsPath);

describe("build output", () => {
  it.skipIf(!distExists)(
    'dist/index.js starts with "use client" (regression guard: esbuild strips bare directives when bundling multiple modules into one file - see tsup.config.ts banner)',
    () => {
      const contents = readFileSync(distIndexPath, "utf-8");
      expect(contents.startsWith('"use client";')).toBe(true);
    },
  );

  it.skipIf(!distDtsExists)(
    "every sibling module dist/index.d.ts re-exports from actually exists (regression guard: a Linux-only rollup-plugin-dts failure once left dist/index.d.ts pointing at sibling .d.ts files that were never emitted, silently degrading every @merqo/ui import to `any` in consumers - see tsup.config.ts's dts:false comment)",
    () => {
      const contents = readFileSync(distDtsPath, "utf-8");
      const distDir = path.dirname(distDtsPath);
      const specifiers = [...contents.matchAll(/from ["'](\.[^"']+)["']/g)].map((m) => m[1]);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const specifier of specifiers) {
        const resolved = path.resolve(distDir, `${specifier}.d.ts`);
        expect(existsSync(resolved), `${specifier}.d.ts (from index.d.ts) is missing`).toBe(true);
      }
    },
  );

  if (!distExists) {
    // eslint-disable-next-line no-console
    console.warn(
      "[build-output.test.ts] dist/index.js not found - skipping. Run `pnpm build` before `pnpm test` for this test to be meaningful.",
    );
  }
});
