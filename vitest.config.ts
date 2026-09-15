import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // The barrel `./index` keeps growing (icon libraries, qrcode, etc.) and
    // every component's own "is exported from the package root" test does a
    // cold `await import("./index")` — that first import can now take
    // several seconds under jsdom, well past vitest's 5s default.
    testTimeout: 30000,
  },
});
