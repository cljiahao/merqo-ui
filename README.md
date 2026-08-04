# @merqo/ui

Shared structural/behavioral components for the Merqo kit family
(loopkit, merqo, paykit, qkit, stockkit). Ships **no color, font, or
radius values** — every component styles itself with shadcn's semantic
Tailwind classes only, so each kit's own `globals.css` token values
drive the rendered brand color automatically. See
`docs/superpowers/specs/2026-08-04-merqo-ui-structural-package-design.md`
in the Merqo Business workspace for the full design rationale.

## Install

No npm registry — installed as a git dependency, pinned to a tag:

```json
"dependencies": {
  "@merqo/ui": "github:cljiahao/merqo-ui#v0.1.0"
}
```

## v1 components

- `InfoTooltip` — icon + tooltip with a parameterized `aria-label`.
- `useAsyncAction` — pending-state hook that always resets, even on throw.
- `TwoColumnSections` — the profile/settings two-column flex-stack layout
  (never a CSS grid — see the component's test file for why).

## Development

```bash
pnpm install
pnpm test
pnpm build
```
