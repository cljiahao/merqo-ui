// Generates dist/index.js as a plain, un-bundled ESM re-export shim over
// tsup's already-built per-module files (see tsup.config.ts) -- each
// re-export line here is just a pointer, so this file carries no code and
// no "use client" directive of its own, and never strips a component's real
// directive the way bundling everything into one file did before.
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

// `ts.transpileModule` already drops `export type { ... }` clauses (they're
// erased at the type level) and keeps only value re-exports.
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});

// Relative specifiers need an explicit ".js" for Node/bundler ESM
// resolution -- the source omits it (TS resolves bare "./module" itself).
const withExtensions = outputText.replace(
  /from "(\.\/[^"]+)"/g,
  (_match, specifier) => `from "${specifier}.js"`,
);

writeFileSync(new URL("../dist/index.js", import.meta.url), withExtensions);
