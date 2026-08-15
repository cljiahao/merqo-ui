/**
 * The Merqo kit family, one place — adding a new live kit means updating
 * this list, not every kit's own DashboardNav wrapper. Mirrors the URL
 * convention `merqo/src/lib/kits.ts` already establishes
 * (`https://{slug}-sg.vercel.app`), duplicated here deliberately: this
 * package has no dependency on any single kit's app code, and the URL
 * shape is a stable, external contract (each kit's own Vercel deployment
 * name), not an implementation detail likely to drift silently.
 */
export interface KitFamilyMember {
  slug: string;
  name: string;
  url: string;
}

export const KIT_FAMILY: KitFamilyMember[] = [
  { slug: "qkit", name: "qkit", url: "https://qkit-sg.vercel.app" },
  { slug: "loopkit", name: "loopkit", url: "https://loopkit-sg.vercel.app" },
  { slug: "paykit", name: "paykit", url: "https://paykit-sg.vercel.app" },
  { slug: "stockkit", name: "stockkit", url: "https://stockkit-sg.vercel.app" },
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
