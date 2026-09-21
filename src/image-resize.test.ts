// @vitest-environment jsdom
//
// jsdom has no real Canvas/ImageBitmap backend, so createImageBitmap and
// canvas.getContext('2d') both fail here — every call in this test
// environment exercises resizeToWebp's fallback branch (return the original
// file untouched), not the actual resize/encode path. That's still real
// coverage of the function's control flow (decode failure -> catch ->
// extension parsing), just not the pixel-manipulation happy path, which
// needs a real browser and isn't unit-testable in jsdom.
import { afterEach, describe, expect, it, vi } from "vitest";

import { resizeToWebp } from "./image-resize";

describe("resizeToWebp", () => {
  it("falls back to the original file when the browser cannot decode/encode it", async () => {
    const file = new File(["fake-image-bytes"], "photo.PNG", {
      type: "image/png",
    });
    const result = await resizeToWebp(file, 1000);
    expect(result.blob).toBe(file);
    expect(result.ext).toBe("png");
    expect(result.type).toBe("image/png");
  });

  it("defaults to a jpg extension when the filename has none", async () => {
    const file = new File(["x"], "photo", { type: "" });
    const result = await resizeToWebp(file, 1000);
    expect(result.ext).toBe("jpg");
    expect(result.type).toBe("application/octet-stream");
  });
});

// The two tests above only reach the decode-failure fallback, because jsdom
// has no canvas. These stub the canvas so the encode path actually runs, and
// pin down what happens when a browser cannot encode WebP.
describe("resizeToWebp encode path", () => {
  // Makes toBlob behave like a browser whose encoder supports only
  // `supported`: any other requested type comes back as PNG, which is what
  // the canvas spec mandates for an unsupported type.
  function stubCanvas(supported: string[]) {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 3200, height: 1600, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation(function (callback, type) {
        const produced = type && supported.includes(type) ? type : "image/png";
        callback(new Blob(["encoded"], { type: produced }));
      });
    return toBlob;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns WebP where the browser can encode it", async () => {
    stubCanvas(["image/webp", "image/jpeg"]);
    const result = await resizeToWebp(new File(["x"], "a.jpg"), 1600);
    expect(result.type).toBe("image/webp");
    expect(result.ext).toBe("webp");
    expect(result.blob.type).toBe("image/webp");
  });

  it("falls back to JPEG, labelled truthfully, where WebP encoding is unsupported", async () => {
    const toBlob = stubCanvas(["image/jpeg"]);
    const result = await resizeToWebp(new File(["x"], "a.jpg"), 1600);
    expect(result.type).toBe("image/jpeg");
    expect(result.ext).toBe("jpg");
    expect(result.blob.type).toBe("image/jpeg");
    expect(toBlob.mock.calls.map((call) => call[1])).toEqual([
      "image/webp",
      "image/jpeg",
    ]);
  });

  it("never returns a PNG labelled as WebP", async () => {
    stubCanvas([]);
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const result = await resizeToWebp(file, 1600);
    expect(result.blob).toBe(file);
    expect(result.type).toBe("image/jpeg");
  });

  it("scales the longest side down to maxDim", async () => {
    stubCanvas(["image/webp"]);
    await resizeToWebp(new File(["x"], "a.jpg"), 1600);
    const canvas = vi.mocked(HTMLCanvasElement.prototype.toBlob).mock
      .contexts[0] as HTMLCanvasElement;
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
  });
});
