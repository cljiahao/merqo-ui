import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const source = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./privacy.md"),
  "utf-8",
);

const REQUIRED_HEADINGS = [
  "## Our roles: controller and data intermediary",
  "## What we collect",
  "## Why we collect it",
  "## Cross-kit customer identity",
  "## Our Telegram bot",
  "## Cookies",
  "## Who we share it with",
  "## Where your data is stored",
  "## How long we keep it",
  "## Audit and security logs",
  "## Your rights",
  "## Data breaches",
  "## Contact and DPO",
];

const REQUIRED_SUBPROCESSORS = [
  "Supabase",
  "Vercel",
  "Telegram",
  "Google",
  "NIIMBOT",
  "Sentry",
];

describe("privacy.md", () => {
  it.each(REQUIRED_HEADINGS)("contains the %s section", (heading) => {
    expect(source).toContain(heading);
  });

  it.each(REQUIRED_SUBPROCESSORS)("names sub-processor %s", (name) => {
    expect(source).toContain(name);
  });

  it("discloses the vendor-activity endpoint as an identified data flow", () => {
    expect(source).toMatch(/vendor.activity|vendor.support|health triage/i);
  });

  it("discloses birthdate and referral-host data", () => {
    expect(source).toMatch(/birthday|birth month/i);
    expect(source).toMatch(/referral host/i);
  });

  it("states audit logs are exempt from correction/erasure as a legal record", () => {
    expect(source).toMatch(/audit/i);
    expect(source).toMatch(/exempt|legitimate interest|legal record/i);
  });

  it("states a retention period for each named category", () => {
    expect(source).toMatch(/5 years/);
    expect(source).toMatch(/90 days/);
  });
});
