# @merqo/ui usage matrix

Which kit uses which export, and which exports are internal. Regenerate the
counts with `node scripts/usage-matrix.mjs` from a workspace checkout that has
all five consumer repos as sibling folders.

Numbers are **import sites** (import statements), not files — a component
imported in six files counts six. A blank cell means the kit does not import
that export at all. Last regenerated 2026-09-21.

## Why this file exists

Three reasons, all learned the hard way:

1. A component promoted into this package is only worth the shared-package tax
   if kits actually adopt it. Counting direct imports is the only way to see an
   export that was built to replace something and then never adopted.
2. Counting direct imports alone is **misleading**. Six exports have zero
   direct importers and are still load-bearing, because a kit reaches them
   through another component. An audit that trusted the raw count concluded
   they were dead code; they are not. See "Internal exports" below.
3. Half of what looks like duplication is not. Most same-named local
   components are thin adapters over the shared one, and several real
   differences are deliberate. Recording which is which is the only way an
   audit does not re-open the same questions every time.

## Fully adopted (all five consumers)

| Export                                                    | qkit | paykit | stockkit | loopkit | merqo |
| --------------------------------------------------------- | ---- | ------ | -------- | ------- | ----- |
| `AboutMerqo`                                              | 1    | 1      | 1        | 1       | 1     |
| `AuditLogTable` + `AuditLogEntry`                         | 4    | 3      | 3        | 3       | 3     |
| `ElevatedCard`                                            | 1    | 6      | 10       | 19      | 1     |
| `Footer`                                                  | 1    | 1      | 1        | 1       | 1     |
| `ImageUploader` (+ `ImageUploaderProps`)                  | 5    | 3      | 1        | 2       | 2     |
| `LandingNav`                                              | 1    | 1      | 1        | 1       | 1     |
| `LegalDocument`                                           | 2    | 2      | 2        | 2       | 4     |
| `LEGAL_VERSIONS` / `getLegalDocSource` / `isLegalCurrent` | 3    | 3      | 3        | 3       | 3     |
| `Section`                                                 | 1    | 1      | 1        | 1       | 1     |
| `StatTile`                                                | 2    | 1      | 1        | 2       | 2     |
| `TermsAcceptanceCheckbox`                                 | 1    | 1      | 1        | 1       | 1     |
| `TwoColumnSections`                                       | 2    | 1      | 1        | 1       | 1     |
| `useAsyncAction` / `navigatingAway`                       | 1    | 1      | 1        | 1       | 1     |
| `BackToTop`                                               | 1    | 1      | 1        | 1       | 1     |
| `GoogleMark`                                              | 1    | 1      | 1        | 1       | 1     |
| `safeRedirectPath`                                        | 2    | 2      | 2        | 2       | 2     |
| `resizeToWebp`                                            | 6    | 2      | 1        | 1       | 1     |
| `SocialLinksFields`                                       | 2    | 1      | 1        | 1       | 1     |

The last four were promoted on 2026-09-19 after a sweep found them duplicated
in every repo. They are the package's first non-component exports, which only
became safe to share once the package-wide `"use client"` banner was removed.

## Product kits only

merqo is the hub, not a vendor dashboard, so it has no dashboard nav, no
plan page, and no kit switcher. Its absence here is by design, not a gap.

| Export                          | qkit | paykit | stockkit | loopkit | merqo |
| ------------------------------- | ---- | ------ | -------- | ------- | ----- |
| `BackButton`                    | 2    | 2      | 2        | 7       | —     |
| `DashboardNav`                  | 1    | 1      | 1        | 1       | —     |
| `DataTable` + `DataTableColumn` | 2    | 4      | 1        | 3       | —     |
| `getSwitchKits`                 | 1    | 1      | 1        | 1       | —     |
| `PricingForm`                   | 1    | 1      | 1        | 1       | —     |

## Partial adoption

Every row here has been checked. None of it is drift; each is a deliberate
difference, recorded so the next audit does not re-litigate it.

| Export                     | qkit | paykit | stockkit | loopkit | merqo | Why                                                                 |
| -------------------------- | ---- | ------ | -------- | ------- | ----- | ------------------------------------------------------------------- |
| `StatusBadge` (+ `Config`) | 3    | 2      | 1        | —       | 1     | loopkit's admin health pill is a shadcn `Badge` — see below         |
| `InfoTooltip`              | 5    | 1      | —        | 2       | 2     | stockkit has no tooltip surface (checked: no `title=` hints either) |
| `DashboardTour`            | —    | 1      | 1        | 1       | 1     | qkit uses `DashboardTours` (plural, route-matched) instead          |
| `PlanComparisonTable`      | 1    | —      | —        | 1       | —     | paykit/stockkit plan pages render a feature list, not a table       |
| `MoneyInput`               | 2    | —      | —        | —       | —     | see "Money fields" below                                            |
| `DeltaPill`                | 1    | —      | —        | —       | —     | qkit only                                                           |
| `SOCIAL_LINK_FIELDS`       | 1    | —      | —        | —       | —     | qkit only; the 2026-09-18 RSC crash site                            |
| `AccountMenu` (direct)     | —    | —      | —        | —       | 1     | the four kits get it composed inside `DashboardNav`                 |
| `VendorTelegramSection`    | —    | —      | —        | —       | 1     | merqo owns the shared bot; kits link through it                     |
| `qrSvg`                    | —    | 1      | —        | 4       | 1     | not a `react-qr-code` replacement — see below                       |

### Things that look like duplicates and are not

The 2026-09-19 sweep checked all 23 local components sharing a name with a
shared export. Twenty-one were thin adapters that import the shared one and
only supply kit copy — every repo's `DashboardNav`, `DashboardTour`,
`use-async-action`, `Section` and landing footer wrapper. The genuine
duplicates were all removed.

Three more were flagged and then cleared on inspection:

**loopkit's `admin/health-badge.ts`** maps health states to shadcn `Badge`
variants. `StatusBadge` is a dot-and-pill chip whose own docs say it is
deliberately _not_ a `Badge` wrapper, and the `gold` variant here is
loopkit's reward motif. Converting would change the look and drop a brand
token.

**Money fields** in stockkit (`products/product-form.tsx`,
`stock-log-form.tsx`) and paykit (the bookings dialogs) hold a free-text
string and show a tested inline "Enter a valid unit cost" error.
`MoneyInput` is cents-based and commits on blur with no error affordance,
so adopting it would delete tested behaviour rather than remove duplication.

**qkit's payment QRs** — see immediately below.

### `qrSvg` is not a replacement for `react-qr-code`

An earlier audit called qkit's and paykit's continued `react-qr-code`
dependency an adoption gap left by a component built to replace it. That
framing was wrong.

`qrSvg(text)` is **async** and returns an SVG **markup string**, so it only
works where the value is known at render time on the server.
`react-qr-code` is a **synchronous component**, which is what you need when
the value is known only on the client or changes reactively.

Of the five call sites, one was worth migrating (paykit's bookings wrapper,
done 2026-09-19). The rest stay:

| Call site                                                | Why it stays                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| paykit `dashboard/config/payment-config-form.tsx`        | preview payload derived live from form state                                                                                                                                                                                                       |
| qkit `dashboard/booths/[boothId]/qr/booth-qr-poster.tsx` | origin resolved client-side via `useSyncExternalStore`, deliberately, to avoid an SSR hydration mismatch                                                                                                                                           |
| qkit `order/[boothId]/pay/pay-form.tsx`                  | `qr-image.ts` insets the rasterized PNG ~8% because `react-qr-code` emits zero margin, and bank apps scanning a saved photo can fail on edge-to-edge modules. `qrSvg` emits `margin: 1`, so swapping changes the quiet zone on a live payment path |
| qkit `order/[boothId]/[orderNumber]/page.tsx`            | already a Server Component, so `react-qr-code` never reaches the browser; migrating buys nothing and costs the test mock that pins which URL `resolveOrigin` embedded                                                                              |

**`react-qr-code` therefore stays a dependency of both qkit and paykit.**

## Internal exports (zero direct importers, all load-bearing)

These are exported from `src/index.ts` but no kit imports them directly. Each
is reached through another export. Removing any of them breaks its consumer.

| Export                       | Reached through | Used by       |
| ---------------------------- | --------------- | ------------- |
| `FeedbackSheet`              | `AccountMenu`   | all four kits |
| `HelpSheet`                  | `AccountMenu`   | all four kits |
| `KIT_FAMILY`                 | `getSwitchKits` | all four kits |
| `getEndCustomerNoticeSource` | `LegalDocument` | all five      |
| `useMoneyField`              | `MoneyInput`    | qkit          |
| `LegalFooterLinks`           | `Footer`        | all five      |

Note that `FeedbackData` and `SupportRequest` are **not** internal even though
their components are: both appear in `AccountMenuProps`
(`onFeedbackSubmit: (data: FeedbackData) => Promise<void>`), so a consumer
typing that callback explicitly needs them. Keep the type exports.

## Server-component rule

Every **component** in this package is a Client Component (the four
non-component exports are not). A Server Component may
pass one only serializable props — never a function, and never a component
reference such as `LinkComponent={Link}`. Both crash at request time with
`Functions cannot be passed directly to Client Components`, which `next build`
does not catch on a dynamic route.

Since v0.31.0 the package no longer applies a package-wide `"use client"`
banner, so plain-data exports (`SOCIAL_LINK_FIELDS`, `LEGAL_VERSIONS`,
`KIT_FAMILY`, `qrSvg`) are real values in a Server Component rather than
opaque client-reference stubs. `src/build-output.test.ts` guards both halves
of that invariant. The incident that forced the change is written up in qkit
at `docs/meta/2026-09-18-social-links-backbutton-rsc-crash-aar.md`.
