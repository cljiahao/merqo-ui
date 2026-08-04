# @merqo/ui

Shared structural/behavioral components for the Merqo kit family
(loopkit, merqo, paykit, qkit, stockkit). Ships **no color, font-family, or
radius values** — every component styles itself with shadcn's semantic
Tailwind classes only, so each kit's own `globals.css` token values
drive the rendered brand color automatically.

> Note: the full design rationale lives in an internal spec
> (`docs/superpowers/specs/2026-08-04-merqo-ui-structural-package-design.md`)
> in the Merqo Business workspace. It is not included in this repo and is
> not reachable from a standalone clone — this README is the
> source of truth for consumers of the package.

## Install

No npm registry — installed as a git dependency, pinned to a tag:

```json
"dependencies": {
  "@merqo/ui": "github:cljiahao/merqo-ui#v0.6.0"
}
```

### Required Tailwind setup

Tailwind v4's automatic source detection skips `node_modules` by design, so
it will **never** see this package's `bg-primary`, `text-muted-foreground`,
`flex-1`, etc. classes unless a consuming kit points it there explicitly.
Without this step, `@merqo/ui` components will render completely unstyled.

Add an `@source` directive to your kit's `globals.css`, alongside the
`@import "tailwindcss";` line, pointing at this package's built `dist/`
output:

```css
@import "tailwindcss";
@source "../../node_modules/@merqo/ui/dist";
```

Adjust the relative path to match where your `globals.css` actually lives
relative to `node_modules`.

`sheet.tsx`, `dropdown-menu.tsx`, and `tooltip.tsx` use `animate-in` /
`slide-in-from-*` / `fade-out-*` utility classes that **do not exist in
stock Tailwind v4** - they're shipped by the
[`tw-animate-css`](https://www.npmjs.com/package/tw-animate-css) package.
Install it in the consuming kit and import it alongside Tailwind in
`globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@source "../../node_modules/@merqo/ui/dist";
```

Without this, the Sheet/DropdownMenu/Tooltip open/close transitions silently
no-op (the classes just don't exist), which is easy to miss since nothing
errors - it just never animates.

### pnpm install-script allowlist

pnpm 11 blocks install scripts by default via an `allowBuilds` allowlist in
each consumer's `pnpm-workspace.yaml`. This package's `prepare` script runs
`pnpm build`, which is what produces `dist/` (gitignored, not committed to
this repo). If a consuming kit's `pnpm-workspace.yaml` doesn't allowlist
`@merqo/ui`, the build gets silently blocked, the kit installs an empty
package, and you get a confusing module-resolution error instead of an
obvious build failure. Add an `allowBuilds` entry for `@merqo/ui` and
verify the built `dist/` actually appears in `node_modules/@merqo/ui/` —
this check is part of the first kit's migration onto this package.

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

### `driver.js` (only if you use `DashboardTour`)

`DashboardTour` handles `driver.js` and its base stylesheet internally —
both are imported lazily, at tour-start time, inside the component itself.
Consumers don't need to install, import, or configure either one
themselves.

The scoped popover styling (the part that actually differs per kit —
background, radius, button colors) is injected automatically at runtime
via your kit's own theme tokens (`var(--popover)`, `var(--primary)`,
etc.) — no separate stylesheet to manage for that part either.

`DashboardTour` never generates or imports tour step content — keep your
own `tour-steps.ts` exactly as it is today, and pass its array as the
`steps` prop. `steps` accepts either a plain array, or a lazy resolver
function (`() => TourStep[]`) for kits that need SSR-safe mobile-vs-desktop
splitting — the resolver is called only at tour-start time, matching how
the kits currently resolve `isMobile` via `window.matchMedia`.

### Private repo auth for CI / deploys

This repo is currently **private**. A local `pnpm install` works because it
reuses your local SSH/HTTPS git credentials, but that doesn't carry over to
GitHub Actions or Vercel — those need their own authenticated access (a
GitHub App install or a scoped PAT) to fetch a git-tag dependency against a
private repo. Set this up before wiring any kit's CI or deploy pipeline to
install `@merqo/ui`, or the install step will fail there even though it
works locally.

## Components

- `InfoTooltip` — icon + tooltip with a parameterized `aria-label`.
- `useAsyncAction` — pending-state hook that always resets, even on throw.
- `TwoColumnSections` — the profile/settings two-column flex-stack layout
  (never a CSS grid — see the component's test file for why).
- `Section` — visually-neutral field-group shell (icon, eyebrow, title,
  optional description/tooltip). Kit-specific skins (e.g. a paper texture)
  layer on top via `className`, not baked into the component.
- `FeedbackSheet` / `HelpSheet` — drawer-based feedback and support forms.
  `HelpSheet` supports a plain `mailto:` mode for kits with no
  ticket-queue infra yet, or a real form mode. `FeedbackSheet` takes an
  optional `showNps?: boolean` to add a 0-10 recommend-score grid above the
  message field (score becomes required, message becomes optional).
  `HelpSheet`'s form mode takes an optional
  `categories?: {value, label}[]` to add a category radiogroup above the
  message field (an empty array behaves like no categories at all).
- `AccountMenu` — the avatar dropdown alone (Profile, optional kit-local
  settings, optional Plan, Get help, Feedback, Sign out — always last,
  separated, destructive-styled). Reusable without the full nav shell.
  Takes an optional `extraLink?: {href, label}` for a kit-specific menu
  item, and forwards `showNps` to its internal `FeedbackSheet` and
  `getHelp.categories` (when `getHelp.type === "form"`) to its internal
  `HelpSheet`. `vendor.subtitle?: string` (e.g. the signed-in email) shows
  next to the trigger avatar and as a header line above Profile — omit it
  for no identity text anywhere, matching pre-`subtitle` behavior.
- `DashboardNav` — the full sticky-topbar shell (burger-left/avatar-right
  at every viewport). Composes `AccountMenu`.
- `ProfileForm` — the full profile/settings page composition (stall/shop
  name → photo → password | display name → social links), each section
  independently saved. Never calls a backend directly — every mutation is
  an injected prop, so this component isn't coupled to any one kit's data
  layer.
- `ImageUploader` — square (`thumb`) or wide (`banner`) image upload control
  with JPEG/PNG/WebP validation, a size cap, an injected browser-side resize
  step, and an injected storage write (`onUpload`) so the package stays
  backend-agnostic. `uploading` always resets — success, validation failure,
  or throw. Default `variant` is `"thumb"` — qkit's booth-banner usage
  **must** pass `variant="banner"` explicitly when migrating, or it will
  silently render as a small square with the wrong resize target.
- `DashboardTour` — wires up `driver.js` (config, lifecycle, floating
  replay button, `driver.js` + its CSS both lazily self-imported) from an
  injected `steps` array/resolver, `onFirstSeen` callback, `isHomeRoute`,
  and `navigateHome` — the tour mechanism is shared, tour content, routing,
  and "has this user seen it" persistence stay entirely kit-local. The
  replay button renders on every page (not just the tour's home route);
  replaying from elsewhere navigates home first, then auto-runs once
  landed. `onFirstSeen` fires once, immediately when an unseen user's tour
  auto-starts — never on replay, never on completion.

## Usage

```tsx
import { InfoTooltip } from "@merqo/ui";

export function SettingLabel() {
  return (
    <div className="flex items-center gap-1.5">
      <span>API rate limit</span>
      <InfoTooltip
        content="Requests over this limit are queued, not rejected."
        ariaLabel="More about the API rate limit"
      />
    </div>
  );
}
```

## Development

```bash
pnpm install
pnpm test
pnpm build
```
