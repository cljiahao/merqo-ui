import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.resolve(dir, p), "utf-8");

describe("per-kit schedules", () => {
  it("paykit schedule establishes the PSA technical-service-provider exclusion", () => {
    const s = read("./schedules/paykit.md");
    expect(s).toMatch(/Payment Services Act/i);
    expect(s).toMatch(/never a party to/i);
    expect(s).not.toMatch(/never touches funds\.?\s*$/im); // must go further than the bare claim
  });

  it("loopkit schedule states the vendor is solely liable to honour rewards", () => {
    const s = read("./schedules/loopkit.md");
    expect(s).toMatch(/solely (responsible|liable)/i);
  });

  it("printkit schedule discloses third-party firmware and label-content data flow", () => {
    const s = read("./schedules/printkit.md");
    expect(s).toMatch(/NIIMBOT/i);
    expect(s).toMatch(/no (hardware )?warranty/i);
    expect(s).toMatch(/label content/i);
  });

  it("qkit and stockkit schedules exist", () => {
    expect(read("./schedules/qkit.md").length).toBeGreaterThan(0);
    expect(read("./schedules/stockkit.md").length).toBeGreaterThan(0);
  });
});

describe("end-customer-notice.md", () => {
  const s = read("./end-customer-notice.md");
  it("identifies Merqo and the vendor relationship", () => {
    expect(s).toMatch(/vendor/i);
  });
  it("links to the Privacy Policy and explains /stop", () => {
    expect(s).toMatch(/\/stop/);
    expect(s).toMatch(/Privacy Policy/i);
  });
  it("is not a contract with the end-customer", () => {
    expect(s.toLowerCase()).not.toMatch(/by (using|continuing).{0,20}you agree/);
  });
});
