export type ResizeResult = { blob: Blob; ext: string; type: string };

async function decode(file: File): Promise<ImageBitmap> {
  // `from-image` applies EXIF orientation so portrait phone photos aren't sideways.
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

/**
 * Resize `file` so its longest side is <= maxDim and re-encode as WebP,
 * or as JPEG where the browser cannot encode WebP. The returned `type` and
 * `ext` always describe the bytes actually produced.
 * Scaling a phone photo down is the biggest size win before compression, and
 * WebP is ~25-35% smaller than JPEG at the same quality. Browser-only
 * (Canvas) -- call from client components. Returns the original untouched if
 * the browser can't decode/encode it, so an upload never hard-fails on an
 * exotic image.
 */
export async function resizeToWebp(
  file: File,
  maxDim: number,
  quality = 0.82,
): Promise<ResizeResult> {
  try {
    const bitmap = await decode(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality),
      );

    // A browser that can't encode WebP does not fail here: per the canvas
    // spec it silently returns a PNG instead. Trusting the requested type
    // would mislabel that PNG as image/webp, and a PNG of a photo is several
    // times larger than the JPEG it should have been. Check what actually
    // came back, and fall back to JPEG, which every browser encodes.
    const webp = await encode("image/webp");
    if (webp?.type === "image/webp") {
      return { blob: webp, ext: "webp", type: "image/webp" };
    }
    const jpeg = await encode("image/jpeg");
    if (jpeg?.type === "image/jpeg") {
      return { blob: jpeg, ext: "jpg", type: "image/jpeg" };
    }
    throw new Error("encode failed");
  } catch {
    // A dotless filename has no extension to take -- `split(".").pop()`
    // would return the whole name (e.g. ext: "photo"), which then lands in
    // the upload path. stockkit's copy guarded this; the others did not.
    const ext = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() || "jpg"
      : "jpg";
    return { blob: file, ext, type: file.type || "application/octet-stream" };
  }
}
