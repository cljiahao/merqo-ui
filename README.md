# @merqo/ui

Shared structural/behavioral components for the Merqo kit family
(loopkit, merqo, paykit, qkit, stockkit). Ships **no color, font, or
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
  "@merqo/ui": "github:cljiahao/merqo-ui#v0.2.0"
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
  ticket-queue infra yet, or a real form mode.
- `AccountMenu` — the avatar dropdown alone (Profile, optional kit-local
  settings, optional Plan, Get help, Feedback, Sign out — always last,
  separated, destructive-styled). Reusable without the full nav shell.
- `DashboardNav` — the full sticky-topbar shell (burger-left/avatar-right
  at every viewport). Composes `AccountMenu`.
- `ProfileForm` — the full profile/settings page composition (stall/shop
  name → photo → password | display name → social links), each section
  independently saved. Never calls a backend directly — every mutation is
  an injected prop, so this component isn't coupled to any one kit's data
  layer.

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
