# ImageUploader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared, storage-backend-agnostic `ImageUploader` to `@merqo/ui`, replacing five drifted per-kit copies and fixing the stuck-`uploading` bug present in four of them.

**Architecture:** A single client component in `src/image-uploader.tsx`. It owns file-type/size validation, the resize→path→upload pipeline, the `uploading` state machine, and both visual variants (`thumb` square, `banner` wide). Every side effect is injected as a prop: the actual storage write (`onUpload`), the browser resize/encode step (`resizeImage`), and the preview image renderer (`imageComponent`, so kits can pass `next/image` or their own wrapper). Nothing Supabase-specific, nothing Next-specific, no `next` dependency added.

**Tech Stack:** React 19, TypeScript (strict), Tailwind v4 semantic classes, lucide-react icons, vitest + @testing-library/react (jsdom), tsup build.

## Global Constraints

- **No literal color, font-family, or radius values.** Semantic Tailwind classes only (`bg-background`, `text-muted-foreground`, `border-border`, `rounded-xl`, `rounded-full`, `text-destructive`, …). Never `text-[#fff]`, `font-[Inter]`, `rounded-[12px]`.
- **No dependency on any consuming kit's local files or globals.** No `@/lib/...` imports, no `sonner`, no `next/image`, no `next/navigation`, no Supabase client. All side effects arrive as props.
- **No new runtime dependency.** Use only what `package.json` already declares: `react`, `lucide-react`, `clsx`/`tailwind-merge` (via `./lib/utils`'s `cn`), `zod`.
- **`"use client"` must be the first line** of the component file (the tsup banner re-injects it package-wide, but the source directive is the convention every other component follows).
- **Accepted MIME types are exactly** `["image/jpeg", "image/png", "image/webp"]` — SVG intentionally excluded. Use this exact array, in this order.
- **Default `maxBytes` is exactly** `15 * 1024 * 1024`. **Default `maxDim`** is `1000` for `variant="thumb"` and `1600` for `variant="banner"`. **Default `variant` is `"thumb"`.**
- **Copy must match the existing kits verbatim** where specified in a task: `"Use a JPEG, PNG, or WebP image"`, `"Add photo"`, `"JPG · PNG · WebP"`, `"Add a booth banner"`, `"JPEG, PNG, or WebP, optimized on upload"`, `"Best at a 3:1 wide ratio (e.g. 1200×400)"`, `"Optimizing…"`, `"Remove image"`.
- **Error surfacing is mandatory** — an inline, visible message in the component AND an `onError?: (error: unknown) => void` callback, matching `ProfileForm`/`AccountMenu`'s established prop. Never swallow a failure silently.
- **Every test asserts real observable behavior.** Negative/error paths are required, not optional. Never write a test that only asserts a mock was constructed.
- Tests run with `pnpm test`; type check with `pnpm typecheck`; build with `pnpm build`. All three must pass before a task is committed.
- Commit style: `feat: ...` / `fix: ...` / `docs: ...`, imperative mood, no trailing period.

---

## File Structure

- **Create** `src/image-uploader.tsx` — the component, its exported types, and its module-private helpers (`randomId`, `passthroughResize`, `toErrorMessage`, `formatMegabytes`). One file: it is ~200 lines and every piece is only used by this component, matching how `profile-form.tsx` and `account-menu.tsx` are each single-file.
- **Create** `src/image-uploader.test.tsx` — all behavior tests for the component.
- **Modify** `src/index.ts` — public exports.
- **Modify** `README.md` — component list entry + a new "Preview image component" consumer-setup subsection.
- **Modify** `package.json` — version bump.

---

### Task 1: ImageUploader upload pipeline (validation, resize, upload, uploading-state reset)

**Files:**
- Create: `src/image-uploader.tsx`
- Test: `src/image-uploader.test.tsx`

**Interfaces:**
- Consumes: `cn` from `./lib/utils` (signature `cn(...inputs: ClassValue[]): string`).
- Produces (Task 2 extends this same file; Task 3 re-exports these names):
  ```ts
  export type ImageUploaderVariant = "banner" | "thumb";
  export interface ImageResizeResult { blob: Blob; ext: string; type: string }
  export interface ImageUploadPayload {
    bucket: string;
    path: string;
    blob: Blob;
    contentType: string;
  }
  export interface ImagePreviewProps {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
  }
  export interface ImageUploaderProps { /* see Step 3 */ }
  export function ImageUploader(props: ImageUploaderProps): React.JSX.Element;
  ```

**Background the implementer needs:**

This replaces five per-kit copies. Four of them (loopkit, paykit, merqo, qkit) have a real bug: `setUploading(true)` runs, then `await resizeToWebp(...)` and the storage upload run with **no `try/finally`**, so any throw leaves `uploading` stuck at `true` forever and the trigger button permanently disabled. Only stockkit wraps it. **The `try/finally` in this task is a real bug fix and its two regression tests are the most important tests in the file** — do not weaken them.

The `bucket` value is passed *through* to `onUpload` in the payload rather than being closed over by the caller, so a kit can define one module-level upload function and reuse it for every bucket.

- [ ] **Step 1: Write the failing tests**

Create `src/image-uploader.test.tsx` with exactly this content:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ImageUploader, type ImageUploaderProps } from "./image-uploader";

function makeFile(
  name = "photo.jpg",
  type = "image/jpeg",
  size = 1024,
): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function baseProps(
  overrides: Partial<ImageUploaderProps> = {},
): ImageUploaderProps {
  return {
    bucket: "vendor-images",
    pathPrefix: "vendor-1",
    value: null,
    onChange: vi.fn(),
    onUpload: vi.fn().mockResolvedValue("https://cdn.example.test/a.webp"),
    ...overrides,
  };
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("no file input rendered");
  return input as HTMLInputElement;
}

async function selectFile(container: HTMLElement, file: File) {
  const input = fileInput(container);
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe("ImageUploader — upload pipeline", () => {
  it("accepts only JPEG, PNG and WebP (SVG deliberately excluded)", () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    expect(fileInput(container)).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });

  it("rejects a non-accepted file type: shows an inline error, calls onError, never uploads", async () => {
    const onUpload = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onError })} />,
    );

    await selectFile(container, makeFile("logo.svg", "image/svg+xml"));

    expect(
      await screen.findByText("Use a JPEG, PNG, or WebP image"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("rejects a file over the default 15 MB cap with a 15 MB message", async () => {
    const onUpload = vi.fn();
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(
      container,
      makeFile("huge.jpg", "image/jpeg", 15 * 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Image must be 15 MB or smaller"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("honours a custom maxBytes and names it in the message (stockkit's 5 MB bucket limit)", async () => {
    const onUpload = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, maxBytes: 5 * 1024 * 1024 })} />,
    );

    await selectFile(
      container,
      makeFile("big.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Image must be 5 MB or smaller"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("a file exactly at the cap is accepted, not rejected (boundary is >, not >=)", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.webp");
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, maxBytes: 1000 })} />,
    );

    await selectFile(container, makeFile("exact.jpg", "image/jpeg", 1000));

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
  });

  it("uploads a resized blob to a uuid path under pathPrefix and reports the returned URL", async () => {
    const onChange = vi.fn();
    const onUpload = vi
      .fn()
      .mockResolvedValue("https://cdn.example.test/final.webp");
    const blob = new Blob(["resized"], { type: "image/webp" });
    const resizeImage = vi
      .fn()
      .mockResolvedValue({ blob, ext: "webp", type: "image/webp" });

    const { container } = render(
      <ImageUploader
        {...baseProps({ onChange, onUpload, resizeImage })}
      />,
    );

    await selectFile(container, makeFile());

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 1000);

    const payload = onUpload.mock.calls[0][0];
    expect(payload.bucket).toBe("vendor-images");
    expect(payload.blob).toBe(blob);
    expect(payload.contentType).toBe("image/webp");
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.webp$/);

    expect(onChange).toHaveBeenCalledWith("https://cdn.example.test/final.webp");
  });

  it("generates a distinct path per upload", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.webp");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    await selectFile(container, makeFile());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));

    expect(onUpload.mock.calls[0][0].path).not.toBe(
      onUpload.mock.calls[1][0].path,
    );
  });

  it("without a resizeImage prop, uploads the original file with its own extension and type", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.png");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    const file = makeFile("Shot.PNG", "image/png");
    await selectFile(container, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const payload = onUpload.mock.calls[0][0];
    expect(payload.blob).toBe(file);
    expect(payload.contentType).toBe("image/png");
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.png$/);
  });

  it("disables the trigger while uploading and re-enables it after success", async () => {
    let release: (url: string) => void = () => {};
    const onUpload = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeDisabled());

    await act(async () => {
      release("https://cdn.example.test/a.webp");
    });

    await waitFor(() => expect(trigger).toBeEnabled());
  });

  it("REGRESSION: a rejecting resize step resets uploading to false instead of sticking forever", async () => {
    const onError = vi.fn();
    const resizeImage = vi.fn().mockRejectedValue(new Error("decode failed"));
    const { container } = render(
      <ImageUploader {...baseProps({ resizeImage, onError })} />,
    );

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    expect(await screen.findByText("decode failed")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("REGRESSION: a rejecting upload resets uploading to false and surfaces the failure", async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onChange, onError })} />,
    );

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    expect(await screen.findByText("storage 403")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the thrown value is not an Error", async () => {
    const onUpload = vi.fn().mockRejectedValue("nope");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());

    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
  });

  it("clears a previous error once a later upload succeeds", async () => {
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error("storage 403"))
      .mockResolvedValueOnce("https://cdn.example.test/a.webp");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());
    expect(await screen.findByText("storage 403")).toBeInTheDocument();

    await selectFile(container, makeFile());
    await waitFor(() =>
      expect(screen.queryByText("storage 403")).not.toBeInTheDocument(),
    );
  });

  it("resets the input value so re-picking the same file fires another change", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);

    await selectFile(container, makeFile());

    expect(input.value).toBe("");
  });

  it("clicking the trigger opens the file picker", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: /add photo/i }));

    expect(click).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: FAIL — `Failed to resolve import "./image-uploader"`.

- [ ] **Step 3: Write the component**

Create `src/image-uploader.tsx`:

```tsx
"use client";

import * as React from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { cn } from "./lib/utils";

/** Wide booth/banner shape vs. the small square avatar/product shape. */
export type ImageUploaderVariant = "banner" | "thumb";

/** What an injected resize step must hand back. */
export interface ImageResizeResult {
  blob: Blob;
  /** File extension, no dot — becomes the uploaded object's suffix. */
  ext: string;
  /** MIME type of `blob`, forwarded to storage as the content type. */
  type: string;
}

/** Everything the injected upload function needs to write one object. */
export interface ImageUploadPayload {
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
}

/**
 * The subset of `next/image`'s props this component renders a preview with.
 * A kit passes `next/image` (or its own wrapper, e.g. qkit's `MediaImage`)
 * so the package never has to depend on `next` itself.
 */
export interface ImagePreviewProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

export interface ImageUploaderProps {
  /** Storage bucket name, passed straight through to `onUpload`. */
  bucket: string;
  /** Directory-style prefix for the generated object path. */
  pathPrefix: string;
  /** Current image URL, or null when empty. */
  value: string | null;
  /** Called with the new public URL after an upload, or null when removed. */
  onChange: (url: string | null) => void;
  /**
   * Performs the actual storage write and resolves the final public URL.
   * Injected so this component stays storage-backend-agnostic — it never
   * imports a Supabase (or any other) client.
   */
  onUpload: (payload: ImageUploadPayload) => Promise<string>;
  /**
   * Optional browser-side resize/re-encode step (kits pass their own
   * `resizeToWebp`). When omitted the original file is uploaded as-is.
   */
  resizeImage?: (file: File, maxDim: number) => Promise<ImageResizeResult>;
  /** Source-file size cap in bytes. Default 15 MB. */
  maxBytes?: number;
  /** Default "thumb". */
  variant?: ImageUploaderVariant;
  /** Longest-side target handed to `resizeImage`. Defaults per variant. */
  maxDim?: number;
  /** Preview renderer. Defaults to a plain `<img>`; pass `next/image`. */
  imageComponent?: React.ComponentType<ImagePreviewProps>;
  /** Optional hook for a kit's own toast/notification on failure. */
  onError?: (error: unknown) => void;
  className?: string;
}

// SVG is intentionally excluded — every kit's uploads are real raster
// photos, and seed/brand art is referenced by path rather than uploaded.
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
// Longest-side target per use: a wide banner vs a small square photo.
const DEFAULT_MAX_DIM: Record<ImageUploaderVariant, number> = {
  banner: 1600,
  thumb: 1000,
};

function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Upload failed";
}

/**
 * `crypto.randomUUID` is only defined in secure contexts; the fallback keeps
 * uploads working on plain-HTTP previews and in test environments without it.
 */
function randomId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Used when no `resizeImage` is injected: upload the original untouched. */
function passthroughResize(file: File): ImageResizeResult {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return { blob: file, ext, type: file.type || "application/octet-stream" };
}

export function ImageUploader({
  bucket,
  pathPrefix,
  value,
  onChange,
  onUpload,
  resizeImage,
  maxBytes = DEFAULT_MAX_BYTES,
  variant = "thumb",
  maxDim,
  imageComponent,
  onError,
  className,
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const effectiveMaxDim = maxDim ?? DEFAULT_MAX_DIM[variant];
  const box = variant === "thumb" ? "size-20 shrink-0" : "h-40 w-full";

  function fail(message: string, error: unknown) {
    setErrorMessage(message);
    onError?.(error);
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      fail(
        "Use a JPEG, PNG, or WebP image",
        new Error("Use a JPEG, PNG, or WebP image"),
      );
      return;
    }
    if (file.size > maxBytes) {
      const message = `Image must be ${formatMegabytes(maxBytes)} MB or smaller`;
      fail(message, new Error(message));
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    // try/finally is load-bearing: four of the five per-kit copies this
    // replaces left `uploading` stuck at true forever when the resize or
    // upload step threw, permanently disabling the trigger button.
    try {
      const { blob, ext, type } = resizeImage
        ? await resizeImage(file, effectiveMaxDim)
        : passthroughResize(file);
      const path = `${pathPrefix}/${randomId()}.${ext}`;
      const url = await onUpload({ bucket, path, blob, contentType: type });
      onChange(url);
    } catch (error) {
      fail(toErrorMessage(error), error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        variant === "thumb" ? "shrink-0" : "w-full",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors disabled:opacity-60",
          box,
        )}
      >
        {uploading ? (
          <Loader2
            className={cn("animate-spin", variant === "thumb" ? "size-4" : "size-6")}
          />
        ) : (
          <ImagePlus className={variant === "thumb" ? "size-4" : "size-6"} />
        )}
        {variant === "banner" ? (
          <>
            <span className="text-sm font-medium">
              {uploading ? "Optimizing…" : "Add a booth banner"}
            </span>
            <span className="text-xs">JPEG, PNG, or WebP, optimized on upload</span>
            <span className="text-xs">Best at a 3:1 wide ratio (e.g. 1200×400)</span>
          </>
        ) : (
          <>
            <span className="text-[10px] leading-tight font-medium">
              {uploading ? "…" : "Add photo"}
            </span>
            {!uploading && (
              <span className="text-muted-foreground/80 text-[9px] leading-tight">
                JPG · PNG · WebP
              </span>
            )}
          </>
        )}
      </button>

      {/* Deliberately a sibling of the trigger, not a child: an <input> is
          interactive content and is invalid inside a <button>, and the
          programmatic .click() would otherwise re-enter the button's own
          onClick as the event bubbles back up. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          // Clear so re-picking the same file still fires a change event.
          event.target.value = "";
        }}
      />

      {errorMessage ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
}
```

Note on the empty-state trigger's accessible name: the trigger carries an explicit
`aria-label={variant === "banner" ? "Add a booth banner" : "Add photo"}` so its
accessible name is **stable across the uploading state**. Without it the visible
label flips to `"…"` (thumb) / `"Optimizing…"` (banner) mid-upload, which both
breaks `getByRole("button", { name: /add photo/i })` after an upload starts and
leaves a screen-reader user with a meaningless button name exactly when the
control is busy. This was found during implementation and is a required part of
the component, not an optional extra.

`value` is accepted but unused in this task — Task 2 adds the preview branch. Leave the prop declared (the type is public API) and do not add a `void value` no-op.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: PASS — 15 tests.

If a test that awaits a rejected promise produces an unhandled-rejection warning, fix it by ensuring `handleFile` is invoked with `void handleFile(file)` and that the `catch` is inside `handleFile` (it is) — do **not** silence it by loosening an assertion.

- [ ] **Step 5: Verify types and full suite**

Run: `pnpm typecheck && pnpm test`
Expected: no type errors; all suites pass (81 pre-existing tests + 15 new).

- [ ] **Step 6: Commit**

```bash
git add src/image-uploader.tsx src/image-uploader.test.tsx
git commit -m "feat: add ImageUploader upload pipeline with always-resetting uploading state"
```

---

### Task 2: ImageUploader preview state, injected preview renderer, and banner variant

**Files:**
- Modify: `src/image-uploader.tsx`
- Test: `src/image-uploader.test.tsx` (append a second `describe` block)

**Interfaces:**
- Consumes: everything Task 1 produced — `ImageUploaderProps`, `ImagePreviewProps`, `ImageUploaderVariant`, the module-private `box` expression, `cn`.
- Produces: no new exported names. Adds the `value !== null` render branch and the `DefaultPreviewImage` module-private component.

**Background the implementer needs:**

When `value` is a URL the component shows the image with a small circular "remove" button instead of the upload trigger. Four kits render that preview with `next/image` (`fill` + `sizes`), merqo renders a raw `<img>` behind an eslint-disable because its avatar host was never added to `next.config.ts`'s `remotePatterns`, and qkit renders its own `MediaImage` wrapper. The package cannot import `next/image` (it must not depend on `next`), so the renderer is injected via `imageComponent` and defaults to a plain `<img>`. `next/image` with `fill` requires a positioned ancestor — the preview container is `relative`, so that contract holds.

- [ ] **Step 1: Write the failing tests**

Append to `src/image-uploader.test.tsx`:

```tsx
describe("ImageUploader — preview and variants", () => {
  it("renders a preview instead of the trigger when value is set", () => {
    render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/current.webp" })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /add photo/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove image" }),
    ).toBeInTheDocument();
  });

  it("the default preview renderer is a plain <img> pointed at value", () => {
    const { container } = render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/current.webp" })}
      />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.example.test/current.webp");
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders an injected imageComponent (e.g. next/image) with fill and sizes", () => {
    const imageComponent = vi.fn(() => <span data-testid="injected" />);
    render(
      <ImageUploader
        {...baseProps({
          value: "https://cdn.example.test/current.webp",
          imageComponent,
        })}
      />,
    );

    expect(screen.getByTestId("injected")).toBeInTheDocument();
    const props = imageComponent.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(props.src).toBe("https://cdn.example.test/current.webp");
    expect(props.fill).toBe(true);
    expect(props.sizes).toBe("5rem");
  });

  it("passes the wide sizes hint for the banner variant", () => {
    const imageComponent = vi.fn(() => <span data-testid="injected" />);
    render(
      <ImageUploader
        {...baseProps({
          value: "https://cdn.example.test/current.webp",
          variant: "banner",
          imageComponent,
        })}
      />,
    );

    const props = imageComponent.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(props.sizes).toBe("(max-width: 640px) 100vw, 28rem");
  });

  it("the remove button clears the value via onChange(null)", async () => {
    const onChange = vi.fn();
    render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/a.webp", onChange })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("banner variant renders the booth-banner copy and the wide box", () => {
    render(<ImageUploader {...baseProps({ variant: "banner" })} />);

    const trigger = screen.getByRole("button", { name: /add a booth banner/i });
    expect(trigger).toHaveClass("h-40", "w-full");
    expect(
      screen.getByText("Best at a 3:1 wide ratio (e.g. 1200×400)"),
    ).toBeInTheDocument();
  });

  it("thumb variant renders the square box and short copy", () => {
    render(<ImageUploader {...baseProps()} />);

    const trigger = screen.getByRole("button", { name: /add photo/i });
    expect(trigger).toHaveClass("size-20", "shrink-0");
    expect(screen.getByText("JPG · PNG · WebP")).toBeInTheDocument();
  });

  it("banner variant resizes to 1600 on its longest side", async () => {
    const resizeImage = vi.fn().mockResolvedValue({
      blob: new Blob(["r"], { type: "image/webp" }),
      ext: "webp",
      type: "image/webp",
    });
    const { container } = render(
      <ImageUploader {...baseProps({ variant: "banner", resizeImage })} />,
    );

    await selectFile(container, makeFile());

    await waitFor(() =>
      expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 1600),
    );
  });

  it("an explicit maxDim overrides the variant default", async () => {
    const resizeImage = vi.fn().mockResolvedValue({
      blob: new Blob(["r"], { type: "image/webp" }),
      ext: "webp",
      type: "image/webp",
    });
    const { container } = render(
      <ImageUploader
        {...baseProps({ variant: "banner", maxDim: 640, resizeImage })}
      />,
    );

    await selectFile(container, makeFile());

    await waitFor(() =>
      expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 640),
    );
  });

  it("banner shows the 'Optimizing…' label while an upload is in flight", async () => {
    let release: (url: string) => void = () => {};
    const onUpload = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { container } = render(
      <ImageUploader {...baseProps({ variant: "banner", onUpload })} />,
    );

    await selectFile(container, makeFile());

    expect(await screen.findByText("Optimizing…")).toBeInTheDocument();

    await act(async () => {
      release("https://cdn.example.test/a.webp");
    });
    await waitFor(() =>
      expect(screen.queryByText("Optimizing…")).not.toBeInTheDocument(),
    );
  });

  it("uses no literal colour, font-family or radius values anywhere in the source", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./image-uploader.tsx", import.meta.url), "utf-8"),
    );
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgb\(|\bhsl\(|\boklch\(/);
    expect(source).not.toMatch(/rounded-\[/);
    expect(source).not.toMatch(/font-\[/);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: the new `preview and variants` tests FAIL (no preview branch — `Remove image` button not found; `img` is null). The Task 1 tests still pass.

Note: `banner variant renders the booth-banner copy and the wide box` and both `maxDim` tests may already pass from Task 1's markup — that is expected and fine.

- [ ] **Step 3: Implement the preview branch**

In `src/image-uploader.tsx`, add the `X` icon to the lucide import:

```tsx
import { ImagePlus, Loader2, X } from "lucide-react";
```

Add this module-private component immediately after `passthroughResize`:

```tsx
/**
 * Default preview renderer. A kit that has configured its `next.config.ts`
 * `images.remotePatterns` for its storage host should pass `next/image` (or
 * its own wrapper) as `imageComponent` instead — see the package README.
 * `fill`/`sizes` are accepted and ignored here; this <img> just fills the
 * already-sized, relatively-positioned container.
 */
function DefaultPreviewImage({ src, alt, className }: ImagePreviewProps) {
  return <img src={src} alt={alt} className={cn("size-full", className)} />;
}
```

Then, inside `ImageUploader`, immediately after the `box` declaration add:

```tsx
  const PreviewImage = imageComponent ?? DefaultPreviewImage;
  const previewSizes =
    variant === "thumb" ? "5rem" : "(max-width: 640px) 100vw, 28rem";
```

and replace the single `<button …>` trigger inside the returned wrapper with a
conditional, keeping the `<input>` and the error `<p>` exactly where they are:

```tsx
      {value ? (
        <div
          className={cn(
            "border-border relative overflow-hidden rounded-xl border",
            box,
          )}
        >
          <PreviewImage
            src={value}
            alt=""
            fill
            sizes={previewSizes}
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="bg-background/90 text-foreground hover:bg-background absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full shadow-sm backdrop-blur"
            aria-label="Remove image"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button type="button" /* …the existing trigger, unchanged… */ />
      )}
```

Keep the existing trigger `<button>` body byte-identical when moving it into the `else` branch — only its indentation changes.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: PASS — 26 tests total in this file.

- [ ] **Step 5: Verify types and full suite**

Run: `pnpm typecheck && pnpm test`
Expected: no type errors; all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/image-uploader.tsx src/image-uploader.test.tsx
git commit -m "feat: add ImageUploader preview state, injected preview renderer and banner variant"
```

---

### Task 3: Publish ImageUploader — exports, README consumer setup, version bump

**Files:**
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `package.json:3` (version)
- Test: `src/image-uploader.test.tsx` (one appended export test)

**Interfaces:**
- Consumes: `ImageUploader`, `ImageUploaderProps`, `ImageUploaderVariant`, `ImageUploadPayload`, `ImageResizeResult`, `ImagePreviewProps` from `./image-uploader`.
- Produces: those same names on the package's public entry point.

**Background the implementer needs:**

v0.1.0 shipped with two undocumented consumer requirements (the Tailwind `@source` line, the pnpm `allowBuilds` entry) and both caused real breakage in consuming kits. This component adds a third: a kit that passes `next/image` as `imageComponent` **must** add its storage host to `images.remotePatterns` in `next.config.ts`, or `next/image` throws at runtime. That has to be documented as explicitly as the existing two.

- [ ] **Step 1: Write the failing test**

Append to `src/image-uploader.test.tsx`:

```tsx
describe("ImageUploader — package entry point", () => {
  it("is exported from the package root", async () => {
    const pkg = await import("./index");
    expect(pkg.ImageUploader).toBe(ImageUploader);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: FAIL — `expected undefined to be [Function ImageUploader]`.

- [ ] **Step 3: Add the exports**

Append to `src/index.ts`:

```ts
export { ImageUploader } from "./image-uploader";
export type {
  ImageUploaderProps,
  ImageUploaderVariant,
  ImageUploadPayload,
  ImageResizeResult,
  ImagePreviewProps,
} from "./image-uploader";
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm test src/image-uploader.test.tsx`
Expected: PASS — 27 tests.

- [ ] **Step 5: Document the consumer requirement in the README**

In `README.md`, add this subsection immediately **after** the "### pnpm install-script allowlist" section and **before** "### Private repo auth for CI / deploys":

```markdown
### `next/image` remote patterns (only if you use `ImageUploader`)

`ImageUploader` never imports `next/image` — the package has no `next`
dependency, so its preview falls back to a plain `<img>`. To get real
Next.js image optimisation, pass your own renderer:

```tsx
import Image from "next/image";
import { ImageUploader } from "@merqo/ui";

<ImageUploader
  bucket="vendor-images"
  pathPrefix={vendorId}
  value={url}
  onChange={setUrl}
  onUpload={uploadToStorage}
  imageComponent={Image}
/>;
```

If you do, your kit **must** allowlist the storage host in
`next.config.ts`, or `next/image` throws at runtime the first time a vendor
uploads a photo:

```ts
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "<project-ref>.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};
```

This is exactly the gap that made merqo's local copy render a raw `<img>`
behind an eslint-disable. A kit with its own wrapper (e.g. qkit's
`MediaImage`, which marks `.svg` sources `unoptimized`) passes that wrapper
as `imageComponent` instead.
```

Then add this bullet to the end of the "## Components" list:

```markdown
- `ImageUploader` — square (`thumb`) or wide (`banner`) image upload control
  with JPEG/PNG/WebP validation, a size cap, an injected browser-side resize
  step, and an injected storage write (`onUpload`) so the package stays
  backend-agnostic. `uploading` always resets — success, validation failure,
  or throw.
```

- [ ] **Step 6: Bump the version**

In `package.json`, change `"version": "0.2.2"` to `"version": "0.3.0"`.

- [ ] **Step 7: Verify the whole toolchain**

Run: `pnpm typecheck && pnpm build && pnpm test`
Expected: no type errors; build succeeds; all suites pass, including
`src/build-output.test.ts`'s `"use client"` banner guard (which only runs
once `dist/` exists — that is why `build` runs before `test` here).

- [ ] **Step 8: Commit**

```bash
git add src/index.ts src/image-uploader.test.tsx README.md package.json
git commit -m "feat: export ImageUploader, document next/image remote-pattern requirement, bump to v0.3.0"
```

---

## Self-Review

**Spec coverage:**
- Generic prop shape (`bucket`, `pathPrefix`, `value`, `onChange`) — Task 1 Step 3. ✅
- `maxBytes` default 15 MB + stockkit's 5 MB as a prop — Task 1, tests 3 and 4. ✅
- `variant: "banner" | "thumb"` with per-variant `maxDim` (1600/1000) and different copy/box — Task 2. ✅
- File-type validation, SVG excluded — Task 1, tests 1 and 2. ✅
- Stuck-`uploading` bug fixed with a dedicated regression test for a rejecting resize — Task 1, the two `REGRESSION:` tests. ✅
- Backend-agnostic injected upload (`onUpload`), no Supabase — Task 1 Step 3, Global Constraints. ✅
- `next/image`-compatible preview + documented `remotePatterns` consumer requirement — Task 2 + Task 3 Step 5. ✅
- Error-reporting mechanism (inline + `onError`) — Task 1, Global Constraints. ✅
- Semantic classes only, asserted by a source-scanning test — Task 2's last test. ✅
- README component list + version bump + no tag reuse — Task 3. ✅

**Placeholder scan:** No TBD/TODO/"similar to Task N"; every code step carries literal code.

**Type consistency:** `ImageUploadPayload` fields (`bucket`, `path`, `blob`, `contentType`) are used identically in Task 1's implementation and in Task 1's assertions. `ImageResizeResult` (`blob`/`ext`/`type`) matches every kit's `resizeToWebp` return shape, so kits can pass it directly. `ImagePreviewProps` (`src`/`alt`/`fill`/`sizes`/`className`) is a structural subset of `next/image`'s props, so `imageComponent={Image}` type-checks.
