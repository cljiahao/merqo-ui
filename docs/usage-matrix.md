# @merqo/ui usage matrix

Which kit uses which export, and which exports are internal. Regenerate the
counts with `node scripts/usage-matrix.mjs` from a workspace checkout that has
all five consumer repos as sibling folders.

Numbers are **import sites** (import statements), not files — a component
imported in six files counts six. A blank cell means the kit does not import
that export at all. Last regenerated 2026-09-19.

## Why this file exists

Two reasons, both learned the hard way:

1. A component promoted into this package is only worth the shared-package tax
   if kits actually adopt it. Counting direct imports is the only way to see an
   export that was built to replace something and then never adopted.
2. Counting direct imports alone is **misleading**. Five exports have zero
   direct importers and are still load-bearing, because a kit reaches them
   through another component. An audit that trusted the raw count concluded
   they were dead code; they are not. See "Internal exports" below.

## Fully adopted (all five consumers)

| Export                                              | qkit | paykit | stockkit | loopkit | merqo |
| --------------------------------------------------- | ---- | ------ | -------- | ------- | ----- |
| `AboutMerqo`                                         | 1    | 1      | 1        | 1       | 1     |
| `AuditLogTable` + `AuditLogEntry`                    | 4    | 3      | 3        | 3       | 3     |
| `ElevatedCard`                                       | 1    | 6      | 10       | 19      | 1     |
| `ImageUploader` (+ `ImageUploaderProps`)             | 5    | 3      | 1        | 2       | 2     |
| `LandingNav`                                         | 1    | 1      | 1        | 1       | 1     |
| `LegalDocument`                                      | 2    | 2      | 2        | 2       | 4     |
| `LEGAL_VERSIONS` / `getLegalDocSource` / `isLegalCurrent` | 3 | 3    | 3        | 3       | 3     |
| `Section`                                            | 1    | 1      | 1        | 1       | 1     |
| `StatTile`                                           | 2    | 1      | 1        | 2       | 2     |
| `TermsAcceptanceCheckbox`                            | 1    | 1      | 1        | 1       | 1     |
| `TwoColumnSections`                                  | 2    | 1      | 1        | 1       | 1     |
| `useAsyncAction` / `navigatingAway`                  | 1    | 1      | 1        | 1       | 1     |

## Product kits only

merqo is the hub, not a vendor dashboard, so it has no dashboard nav, no
plan page, and no kit switcher. Its absence here is by design, not a gap.

| Export                          | qkit | paykit | stockkit | loopkit | merqo |
| ------------------------------- | ---- | ------ | -------- | ------- | ----- |
| `BackButton`                    | 2    | 2      | 2        | 7       | —     |
| `DashboardNav`                  | 1    | 1      | 1        | 1       | —     |
| `DataTable` + `DataTableColumn` | 2    | 4      | 2        | 6       | —     |
| `getSwitchKits`                 | 1    | 1      | 1        | 1       | —     |
| `PricingForm`                   | 1    | 1      | 1        | 1       | —     |

## Partial adoption

| Export                      | qkit | paykit | stockkit | loopkit | merqo | Note                                                          |
| --------------------------- | ---- | ------ | -------- | ------- | ----- | ------------------------------------------------------------- |
| `StatusBadge` (+ `Config`)  | 3    | 3      | 1        | —       | 1     | loopkit still has a local badge                               |
| `InfoTooltip`               | 5    | 1      | —        | 2       | 2     | stockkit has no tooltip surface yet                           |
| `SocialLinksFields`         | 2    | —      | 1        | 1       | 1     | paykit's profile page has no social links                     |
| `DashboardTour`             | —    | 1      | 1        | 1       | 1     | qkit uses `DashboardTours` (plural, route-matched) instead    |
| `Footer`                    | 1    | 1      | —        | 1       | —     | stockkit and merqo keep local footers                         |
| `LegalFooterLinks`          | —    | —      | 1        | —       | 1     | others inline their own legal links                           |
| `PlanComparisonTable`       | 1    | —      | —        | 1       | —     | paykit/stockkit plan pages render a feature list, not a table |
| `MoneyInput`                | 2    | —      | —        | —       | —     | qkit only — see below                                         |
| `DeltaPill`                 | 1    | —      | —        | —       | —     | qkit only                                                     |
| `SOCIAL_LINK_FIELDS`        | 1    | —      | —        | —       | —     | qkit only; the 2026-09-18 RSC crash site                      |
| `AccountMenu` (direct)      | —    | —      | —        | —       | 1     | the four kits get it composed inside `DashboardNav`           |
| `VendorTelegramSection`     | —    | —      | —        | —       | 1     | merqo owns the shared bot; kits link through it               |
| `qrSvg`                     | —    | —      | —        | 4       | 1     | not a gap — see below                                         |

### `qrSvg` is not a replacement for `react-qr-code`

An earlier audit called qkit's and paykit's continued `react-qr-code`
dependency an adoption gap. It is not. The two solve different problems and
neither can replace the other:

- `qrSvg(text)` is **async** and returns an SVG **markup string**. It only
  works in a Server Component or server action, where the caller `await`s it
  and passes the result down as a plain string prop. Every loopkit and merqo
  call site has that shape.
- `react-qr-code` is a **synchronous React component**. It is what you need
  when the encoded value is only known on the client or changes reactively.

Of the five `react-qr-code` call sites, three are structurally client-side and
cannot migrate:

| Call site                                              | Value source                           | Migratable |
| ------------------------------------------------------ | -------------------------------------- | ---------- |
| qkit `order/[boothId]/[orderNumber]/page.tsx`           | `pickupUrl`, known server-side         | yes        |
| qkit `order/[boothId]/pay/pay-form.tsx`                 | `checkout.payload` prop from its server parent | yes, with test rework |
| qkit `dashboard/booths/[boothId]/qr/booth-qr-poster.tsx` | origin resolved client-side via `useSyncExternalStore`, deliberately, to avoid an SSR hydration mismatch | no |
| paykit `dashboard/bookings/[id]/qr-code-view.tsx`       | `transaction.qr_payload` from its server parent | yes |
| paykit `dashboard/config/payment-config-form.tsx`       | `previewPayload` derived live from form state | no |

Because at least one client-side site remains in each kit, **`react-qr-code`
stays a dependency of qkit and paykit either way**. Migrating the server-side
sites consolidates on the shared helper and trims those routes' client bundles;
it does not remove a dependency.

## Internal exports (zero direct importers, all load-bearing)

These are exported from `src/index.ts` but no kit imports them directly. Each
is reached through another export. Removing any of them breaks its consumer.

| Export                       | Reached through          | Used by        |
| ---------------------------- | ------------------------ | -------------- |
| `FeedbackSheet`              | `AccountMenu`            | all four kits  |
| `HelpSheet`                  | `AccountMenu`            | all four kits  |
| `KIT_FAMILY`                 | `getSwitchKits`          | all four kits  |
| `getEndCustomerNoticeSource` | `LegalDocument`          | all five       |
| `useMoneyField`              | `MoneyInput`             | qkit           |

Note that `FeedbackData` and `SupportRequest` are **not** internal even though
their components are: both appear in `AccountMenuProps`
(`onFeedbackSubmit: (data: FeedbackData) => Promise<void>`), so a consumer
typing that callback explicitly needs them. Keep the type exports.

## Server-component rule

Every component in this package is a Client Component. A Server Component may
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
