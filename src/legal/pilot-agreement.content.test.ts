import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const source = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "./pilot-agreement.md",
  ),
  "utf-8",
);

const REQUIRED_HEADINGS = [
  "## What this pilot is",
  "## Term and either-party termination",
  "## Service as-is",
  "## Fees",
  "## Feedback",
  "## Confidentiality",
  "## Data during the pilot",
  "## Wind-down",
  "## Converting to the standard terms",
  "## General terms",
];

describe("pilot-agreement.md", () => {
  it.each(REQUIRED_HEADINGS)("contains the %s section", (heading) => {
    expect(source).toContain(heading);
  });

  it("limits the feedback grant to a licence, not an assignment", () => {
    expect(source).toMatch(/licen[cs]e/i);
    expect(source.toLowerCase()).not.toMatch(/assigns? all (rights|right,? title)/);
  });

  it("scopes 'as-is' to functionality and availability, not to negligence", () => {
    expect(source).toMatch(/functionality|availability/i);
  });

  it("includes an explicit wind-down data commitment", () => {
    expect(source).toMatch(/export/i);
    expect(source).toMatch(/delet/i);
  });

  it("states confidentiality is mutual", () => {
    expect(source).toMatch(/mutual/i);
  });
});
