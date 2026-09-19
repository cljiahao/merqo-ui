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
    'dist/index.js carries no "use client" directive (regression guard: a package-wide directive turns every plain-data export into a client reference, so a Server Component reading e.g. SOCIAL_LINK_FIELDS gets an opaque stub instead of the array - see qkit docs/meta/2026-09-18 AAR)',
    () => {
      const contents = readFileSync(distIndexPath, "utf-8");
      expect(contents.startsWith('"use client";')).toBe(false);
      expect(contents).not.toMatch(/["']use client["']/);
    },
  );

  it.skipIf(!distExists)(
    'every entry whose source declares "use client" keeps that directive in its own dist file (regression guard: esbuild strips bare directives when it bundles several modules into one output, which is why index re-exports instead of bundling - see scripts/build-index.mjs)',
    () => {
      const distDir = path.dirname(distIndexPath);
      const packageRoot = path.resolve(distDir, "..");
      // Read tsup.config.ts as text rather than importing it: importing pulls
      // in tsup -> esbuild, which refuses to load under vitest's jsdom
      // environment ("new TextEncoder().encode('') instanceof Uint8Array").
      const config = readFileSync(path.resolve(packageRoot, "tsup.config.ts"), "utf-8");
      const entriesBlock = config.slice(
        config.indexOf("const ENTRIES = {"),
        config.indexOf("export default"),
      );
      const entries = [...entriesBlock.matchAll(/(?:"([^"]+)"|([\w-]+))\s*:\s*"(src\/[^"]+)"/g)].map(
        (match) => ({ name: match[1] ?? match[2], source: match[3] }),
      );
      expect(entries.length).toBeGreaterThan(0);
      const clientEntries = entries.filter(({ source }) =>
        readFileSync(path.resolve(packageRoot, source), "utf-8").startsWith('"use client"'),
      );
      expect(clientEntries.length).toBeGreaterThan(0);
      for (const { name } of clientEntries) {
        const built = path.resolve(distDir, `${name}.js`);
        expect(existsSync(built), `dist/${name}.js is missing`).toBe(true);
        expect(
          readFileSync(built, "utf-8").startsWith('"use client";'),
          `dist/${name}.js lost its "use client" directive`,
        ).toBe(true);
      }
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
