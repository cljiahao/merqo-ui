// Counts @merqo/ui import sites per consumer kit, to keep docs/usage-matrix.md
// honest. Run from a workspace checkout where the consumer repos are sibling
// folders of this one. Direct imports are only half the picture -- an export
// with zero importers may still be reached through another component, so read
// the result against that doc's "Internal exports" section before concluding
// anything is dead.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const KITS = ["qkit", "paykit", "stockkit", "loopkit", "merqo"];
const IMPORT_RE = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]@merqo\/ui(\/legal)?['"]/g;

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

const counts = new Map();
for (const kit of KITS) {
  let files;
  try {
    files = sourceFiles(join("..", kit, "src"));
  } catch {
    console.warn(`skipping ${kit} (no sibling checkout)`);
    continue;
  }
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_RE)) {
      for (const raw of match[2].split(",")) {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        if (!counts.has(name)) counts.set(name, {});
        const row = counts.get(name);
        row[kit] = (row[kit] ?? 0) + 1;
      }
    }
  }
}

console.log(["export", ...KITS].join("\t"));
for (const name of [...counts.keys()].sort()) {
  const row = counts.get(name);
  console.log([name, ...KITS.map((kit) => row[kit] ?? "")].join("\t"));
}
