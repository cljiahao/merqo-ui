"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

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

const GENERIC_ERROR_MESSAGE = "Upload failed";

/**
 * The inline message is intentionally generic — the raw error (which may be
 * a backend implementation detail, e.g. a Supabase RLS policy message) is
 * never shown to the end user. The original error is still forwarded to
 * `onError` unchanged, so a consuming kit's own logging/telemetry sees the
 * real cause.
 */
function toErrorMessage(_error: unknown): string {
  return GENERIC_ERROR_MESSAGE;
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

/**
 * Maps an already-validated MIME type to its canonical extension. Deriving
 * the extension from `file.type` (rather than the untrusted filename) means
 * a file with no extension (e.g. "screenshot") still gets a valid path, and
 * a mismatched/malicious filename (e.g. "payload.php" reported as
 * `image/jpeg`) can't smuggle an unexpected extension into storage.
 */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Used when no `resizeImage` is injected: upload the original untouched. */
function passthroughResize(file: File): ImageResizeResult {
  const ext = EXT_BY_MIME[file.type] ?? "jpg";
  return { blob: file, ext, type: file.type || "application/octet-stream" };
}

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

  // A new `value` from outside (e.g. after a successful save elsewhere)
  // means whatever error was showing is stale — clear it rather than let it
  // stick around forever.
  React.useEffect(() => {
    setErrorMessage(null);
  }, [value]);

  const effectiveMaxDim = maxDim ?? DEFAULT_MAX_DIM[variant];
  const box = variant === "thumb" ? "size-20 shrink-0" : "h-40 w-full";
  const PreviewImage = imageComponent ?? DefaultPreviewImage;
  const previewSizes =
    variant === "thumb" ? "5rem" : "(max-width: 640px) 100vw, 28rem";
  // Trim accidental leading/trailing slashes (e.g. a consumer interpolating
  // `${vendorId}/`) so the generated path never doubles up ("a//b.jpg").
  const normalizedPathPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");

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
    let uploadedUrl: string | null = null;
    try {
      const { blob, ext, type } = resizeImage
        ? await resizeImage(file, effectiveMaxDim)
        : passthroughResize(file);
      // `resizeImage` is injected and not guaranteed to honour the size cap
      // itself — e.g. stockkit's real resize step falls back to returning
      // the original file unmodified if resize/encode fails, which could
      // silently exceed the bucket's server-side limit. Re-check the blob
      // that's actually about to be uploaded, not just the source file.
      if (blob.size > maxBytes) {
        const message = `Image must be ${formatMegabytes(maxBytes)} MB or smaller`;
        fail(message, new Error(message));
        return;
      }
      const path = `${normalizedPathPrefix}/${randomId()}.${ext}`;
      uploadedUrl = await onUpload({ bucket, path, blob, contentType: type });
    } catch (error) {
      fail(toErrorMessage(error), error);
      return;
    } finally {
      setUploading(false);
    }
    // Deliberately outside the try/catch: if the upload succeeded but the
    // consumer's own onChange throws, that's the consumer's bug, not an
    // upload failure — letting it propagate avoids silently orphaning the
    // just-written storage object behind a misleading "failed" message.
    onChange(uploadedUrl);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        variant === "thumb" ? "shrink-0" : "w-full",
        className,
      )}
    >
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
            onClick={() => {
              setErrorMessage(null);
              onChange(null);
            }}
            className="bg-background/90 text-foreground hover:bg-background absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full shadow-sm backdrop-blur"
            aria-label="Remove image"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          // Stable accessible name: the visible label flips to "…"/"Optimizing…"
          // while an upload is in flight, which would otherwise leave the button
          // with a meaningless accessible name exactly when it's busy.
          aria-label={variant === "banner" ? "Add a booth banner" : "Add photo"}
          aria-busy={uploading}
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
      )}

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
        <p className="text-destructive text-xs" role="alert">{errorMessage}</p>
      ) : null}
    </div>
  );
}
