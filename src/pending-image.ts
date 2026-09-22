/**
 * An image the vendor picked but has not saved yet. `ImageUploader` in
 * `deferUpload` mode keeps the resized file here and hands the form a local
 * `blob:` preview URL instead of uploading, so abandoning the form leaves
 * nothing behind in storage. The form uploads it on submit with
 * `commitPendingImages`.
 */
const pending = new Map<string, () => Promise<string>>();

/**
 * Registers a picked image and returns the preview URL that stands for it.
 * `upload` writes `blob` and resolves its public URL; it must pick a fresh
 * object path on every call, since a failed save's retry uploads again.
 */
export function registerPendingImage(
  blob: Blob,
  upload: () => Promise<string>,
): string {
  const previewUrl = URL.createObjectURL(blob);
  pending.set(previewUrl, upload);
  return previewUrl;
}

/** Forgets a pending image the vendor removed or replaced before saving. */
export function discardPendingImage(url: string | null | undefined): void {
  if (!url || !pending.delete(url)) return;
  URL.revokeObjectURL(url);
}

/** True when `url` is a picked image that has not been uploaded yet. */
export function isPendingImage(url: string | null | undefined): boolean {
  return Boolean(url && pending.has(url));
}

/**
 * Thrown by `commitPendingImages` when an upload fails. `uploaded` lists the
 * public URLs that did upload in the same call, so the caller can delete them.
 */
export class PendingImageUploadError extends Error {
  readonly uploaded: string[];

  constructor(uploaded: string[], cause: unknown) {
    super("Image upload failed", { cause });
    this.name = "PendingImageUploadError";
    this.uploaded = uploaded;
  }
}

export interface CommittedImages<T> {
  /** `values` in the same order, each pending preview URL swapped for its public URL. */
  urls: T[];
  /** Public URLs uploaded by this call. Delete these if the save then fails. */
  uploaded: string[];
}

/**
 * Uploads every pending image among `values` and returns them with each
 * preview URL replaced by its public URL. Anything else (an already-saved URL,
 * null) passes through untouched. Call it on submit, before validating and
 * saving; if the save fails, delete `uploaded`.
 *
 * Pending entries survive a commit on purpose: if the save fails the form
 * still holds the preview URL, and a retry uploads it again. Swap the form's
 * state to the returned `urls` once the save succeeds.
 */
export async function commitPendingImages<T extends string | null | undefined>(
  values: readonly T[],
): Promise<CommittedImages<T>> {
  const results = await Promise.allSettled(
    values.map(async (value) => {
      const upload = value ? pending.get(value) : undefined;
      if (!upload) return { url: value, uploaded: false };
      const url = await upload();
      return { url: url as T, uploaded: true };
    }),
  );
  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" && result.value.uploaded && result.value.url
      ? [result.value.url]
      : [],
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw new PendingImageUploadError(uploaded, failure.reason);
  return {
    urls: results.map((result) => (result.status === "fulfilled" ? result.value.url : null) as T),
    uploaded,
  };
}
