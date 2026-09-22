/**
 * Maps a Supabase Storage public URL back to its object path within
 * `bucket`, so a caller can delete an image it is replacing. Returns null for
 * anything that is not a public URL in that exact bucket — most importantly an
 * OAuth provider's avatar (a Google profile picture lands in the same
 * `avatar_url` field), which must never be treated as ours to delete.
 *
 * Public URLs look like
 * `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`.
 * A query string (e.g. a cache-busting `?v=`) is ignored.
 */
export function storagePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = parsed.pathname.indexOf(marker);
  if (index === -1) return null;
  const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
  // An empty path, or one that climbs out of the bucket, is not an object.
  if (
    !path ||
    path.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    return null;
  }
  return path;
}
