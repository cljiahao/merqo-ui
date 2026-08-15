# Kit Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in vendor jump between kits from inside any kit's
own dashboard — SSO (shared `.merqo.io` cookie) already signs them in
everywhere, but there's no in-product way to navigate between kits today,
only separate bookmarked URLs. Adds an optional `switchKits` prop to
`AccountMenu` (and threaded through `DashboardNav`) rendering a "Switch
products" submenu, same shape as the existing `getHelp` submenu variant.

**Why this shape, not a live API call.** Considered fetching a vendor's
*actual* active kits from merqo live (cross-origin, credentialed) —
rejected for v1: it needs new CORS/auth plumbing merqo doesn't have yet,
and it's unnecessary. Every live kit's dashboard route already handles a
signed-in vendor who hasn't activated that specific kit gracefully (e.g.
loopkit's `requireVendor` only checks "signed in," not "has a vendor
row" — landing there shows that kit's own onboarding/setup entry point,
not an error). So the switcher can safely list **every live kit**,
static, no per-vendor filtering — clicking one you haven't set up yet is
itself a discovery moment, not a broken link.

**No new component.** `AccountMenu` already has the exact submenu pattern
this needs (`getHelp.type === "submenu"`) — reused directly, not
reinvented.

**Spec:** none separate — this plan doc covers both design and
implementation given the small size (one optional prop, no new
component, no new state).

## Global Constraints

- `switchKits` is optional — omitting it renders nothing new (every
  existing `AccountMenu` consumer stays unchanged until it opts in).
- Switch-kit links are always plain `<a>`, never `LinkComponent` — these
  navigate to a different origin/deployment entirely, not an in-app route.
- No live API call, no new merqo endpoint, no cross-origin auth — v1 is a
  static list per kit.
- TypeScript strict.
- Work on a feature branch, never commit directly to `main`.
- Run `pnpm test && pnpm build` before opening the PR.

---

### Task 1: Extend `AccountMenu`

**Files:** Modify `src/account-menu.tsx`, `src/account-menu.test.tsx`.

- [ ] Failing test first: renders a "Switch products" submenu trigger when
      `switchKits` is a non-empty array; each item is a plain `<a href>`
      with the given label; renders nothing extra when `switchKits` is
      omitted or empty.
- [ ] Add `switchKits?: { label: string; href: string }[]` to
      `AccountMenuProps`.
- [ ] Render the submenu as the *first* item inside `DropdownMenuContent`
      (before Profile) — a workspace-switcher belongs at the top of the
      menu, same convention as Slack/Notion's own account menus. Import
      `LayoutGrid` from `lucide-react` for the trigger icon. Add a
      `DropdownMenuSeparator` after it, before Profile.
- [ ] Run tests to pass; commit
      `feat: add optional switchKits submenu to AccountMenu`.

### Task 2: Thread through `DashboardNav`

**Files:** Modify `src/dashboard-nav.tsx`, `src/dashboard-nav.test.tsx`.

`DashboardNavProps` already spreads `AccountMenuProps` via
`& AccountMenuProps` — confirm `switchKits` passes through with zero
changes needed beyond a type-check; add one test asserting a
`switchKits` prop passed to `DashboardNav` reaches the rendered
`AccountMenu`/submenu.

- [ ] Commit: `test: cover switchKits passthrough on DashboardNav`.

### Task 3: Version bump + ship

- [ ] `pnpm test && pnpm build`.
- [ ] Bump `package.json` version from the real latest git tag (not the
      working-tree value — confirmed unreliable before, see
      `2026-08-15-pricing-form.md`'s own note).
- [ ] Push, PR, poll CI green, squash-merge, tag the merge commit, push
      the tag.

## Self-Review Notes

- No new component, no new state, no new dependency — the smallest
  possible change that solves the actual problem (in-product navigation,
  not live per-vendor filtering).
- `switchKits` optional and additive — no existing consumer's behavior
  changes until it opts in.
