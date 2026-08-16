/**
 * The Merqo kit family, one place — adding a new live kit means updating
 * this list, not every kit's own DashboardNav wrapper. Each kit's real
 * production host is its `<slug>.merqo.io` subdomain (matching
 * `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.merqo.io`'s shared-session scope) —
 * NOT its `-sg.vercel.app` deployment name, which is a different host and
 * so never receives the shared SSO cookie. This package has no dependency
 * on any single kit's app code, so these are hardcoded rather than read
 * from a per-kit env var: the URL shape is a stable, external contract,
 * not an implementation detail likely to drift silently.
 */
export interface KitFamilyMember {
  slug: string;
  name: string;
  url: string;
}

export const KIT_FAMILY: KitFamilyMember[] = [
  { slug: "qkit", name: "qkit", url: "https://qkit.merqo.io" },
  { slug: "loopkit", name: "loopkit", url: "https://loopkit.merqo.io" },
  { slug: "paykit", name: "paykit", url: "https://paykit.merqo.io" },
  { slug: "stockkit", name: "stockkit", url: "https://stockkit.merqo.io" },
];

/**
 * The other live kits a vendor can switch to from `currentSlug`, formatted
 * directly for `AccountMenu`/`DashboardNav`'s `switchKits` prop. A kit not
 * yet in `KIT_FAMILY` (or an unrecognized `currentSlug`) just gets the
 * full family back — fails open to "show the switcher" rather than silently
 * hiding it.
 */
export function getSwitchKits(
  currentSlug: string,
): { label: string; href: string }[] {
  return KIT_FAMILY.filter((kit) => kit.slug !== currentSlug).map((kit) => ({
    label: kit.name,
    href: kit.url,
  }));
}
