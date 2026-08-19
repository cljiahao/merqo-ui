"use client";

import * as React from "react";
import {
  CreditCard,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  Settings as SettingsIcon,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { FeedbackSheet, type FeedbackData } from "./feedback-sheet";
import { HelpSheet, type SupportRequest } from "./help-sheet";
import { useAsyncAction } from "./use-async-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

export type AccountMenuGetHelp =
  | { type: "mailto"; address: string }
  | { type: "drawer"; content: React.ReactNode }
  | {
      type: "form";
      onSubmit: (data: SupportRequest) => Promise<void>;
      categories?: { value: string; label: string }[];
    }
  | { type: "submenu"; items: { label: string; href: string }[] };

export type AccountMenuLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export interface AccountMenuProps {
  vendor: { name: string; avatarUrl?: string; tier?: string; subtitle?: string };
  signOutAction: () => Promise<void>;
  kitLocalSettingsHref?: string;
  showPlanItem?: boolean;
  getHelp: AccountMenuGetHelp;
  onFeedbackSubmit: (data: FeedbackData) => Promise<void>;
  /** Analytics tag forwarded to the internal FeedbackSheet's `source`. */
  feedbackSource?: string;
  /** Analytics tag forwarded to the internal FeedbackSheet's `metric`. */
  feedbackMetric?: string;
  /** Forwarded to the internal FeedbackSheet's `showNps`. */
  showNps?: boolean;
  /** Optional hook for a consuming kit's own toast/notification on async failure (e.g. a failed sign-out). */
  onError?: (error: unknown) => void;
  extraLink?: { href: string; label: string };
  /** Optional slot rendered next to the vendor name in the dropdown header (only shown when vendor.subtitle is also set). */
  tierBadge?: React.ReactNode;
  /** Other kits in the Merqo family this vendor can switch to — SSO
   * already signs them in everywhere, this just adds the navigation.
   * Rendered as a "Switch products" submenu at the top of the menu.
   * Omit or pass an empty array to hide the entry entirely. Links are
   * always plain `<a>` regardless of `LinkComponent` — they navigate to
   * a different kit's own deployment, not an in-app route. */
  switchKits?: { label: string; href: string }[];
  /**
   * Component used to render internal menu links (Profile/Settings/Plan/
   * help submenu items/extraLink) — defaults to a plain `<a>` so this
   * package stays framework-agnostic. Next.js consumers should pass
   * `next/link`'s `Link` here to avoid a full page reload on click. The
   * `mailto:` "Get help" item always stays a plain `<a>` — it never
   * navigates the page, so there's nothing to fix there.
   */
  LinkComponent?: React.ComponentType<AccountMenuLinkProps>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function DefaultLink({ href, ...rest }: AccountMenuLinkProps) {
  return <a href={href} {...rest} />;
}

function AvatarInitial({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-8 rounded-md object-cover ring-1 ring-inset ring-primary/25"
      />
    );
  }
  return (
    <span className="bg-primary/12 text-primary flex size-8 items-center justify-center rounded-md font-mono text-xs font-semibold tracking-tight ring-1 ring-inset ring-primary/25">
      {initials(name)}
    </span>
  );
}

export function AccountMenu({
  vendor,
  signOutAction,
  kitLocalSettingsHref,
  showPlanItem = true,
  getHelp,
  onFeedbackSubmit,
  feedbackSource,
  feedbackMetric,
  showNps,
  onError,
  extraLink,
  tierBadge,
  switchKits,
  LinkComponent,
}: AccountMenuProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const Link = LinkComponent ?? DefaultLink;

  // C2 fix: sign-out used to be `void signOutAction()` - a rejection was
  // discarded, the menu closed regardless, and the user had no way to know
  // sign-out failed. Now it's wrapped in useAsyncAction (error state) and
  // the dropdown item prevents Radix's default auto-close so the menu only
  // closes on a *successful* sign-out; on failure it stays open with a
  // visible inline error next to the item.
  const signOut = useAsyncAction(signOutAction);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          // N2: clear a stale sign-out error when the menu closes (whether
          // by Escape, outside click, or a successful sign-out) so
          // reopening the menu doesn't show a failure that's no longer
          // current.
          if (!open) signOut.reset();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            data-tour="nav-account"
            className="focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full outline-none focus-visible:ring-2"
          >
            <AvatarInitial name={vendor.name} avatarUrl={vendor.avatarUrl} />
            {vendor.subtitle && (
              <span className="hidden max-w-[12rem] truncate text-sm font-medium sm:inline">
                {vendor.subtitle}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {vendor.subtitle && (
            <>
              <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 truncate text-xs font-normal">
                <span className="truncate">{vendor.subtitle}</span>
                {tierBadge}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {switchKits && switchKits.length > 0 ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="size-4" />
                    Switch products
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {switchKits.map((kit) => (
                    <DropdownMenuItem key={kit.href} asChild>
                      <a href={kit.href}>{kit.label}</a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          ) : null}

          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <UserIcon className="size-4" />
              Profile
            </Link>
          </DropdownMenuItem>

          {kitLocalSettingsHref ? (
            <DropdownMenuItem asChild>
              <Link href={kitLocalSettingsHref}>
                <SettingsIcon className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          ) : null}

          {showPlanItem ? (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/plan">
                <CreditCard className="size-4" />
                Plan{vendor.tier ? ` · ${vendor.tier}` : ""}
              </Link>
            </DropdownMenuItem>
          ) : null}

          {getHelp.type === "mailto" ? (
            <DropdownMenuItem asChild>
              <a href={`mailto:${getHelp.address}`}>
                <HelpCircle className="size-4" />
                Get help
              </a>
            </DropdownMenuItem>
          ) : getHelp.type === "drawer" || getHelp.type === "form" ? (
            <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
              <HelpCircle className="size-4" />
              Get help
            </DropdownMenuItem>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-4" />
                  Get help
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {getHelp.items.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
            <MessageSquarePlus className="size-4" />
            Feedback
          </DropdownMenuItem>

          {extraLink ? (
            <DropdownMenuItem asChild>
              <Link href={extraLink.href}>{extraLink.label}</Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Theme
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <Sun className="size-4" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="size-4" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="size-4" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={signOut.pending}
            onSelect={(event) => {
              // Keep the menu open ourselves; close it only on success.
              event.preventDefault();
              signOut
                .run()
                .then(() => setMenuOpen(false))
                .catch((err) => onError?.(err));
            }}
          >
            <LogOut className="size-4" />
            {signOut.pending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
          {signOut.error ? (
            <p className="text-destructive px-2 py-1 text-xs" role="alert">
              {toErrorMessage(signOut.error)}
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmit={onFeedbackSubmit}
        source={feedbackSource}
        metric={feedbackMetric}
        showNps={showNps}
        onError={onError}
      />

      {getHelp.type === "form" ? (
        <HelpSheet
          open={helpOpen}
          onOpenChange={setHelpOpen}
          mode="form"
          onSubmit={getHelp.onSubmit}
          categories={getHelp.categories}
          onError={onError}
        />
      ) : getHelp.type === "drawer" ? (
        <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Get help</SheetTitle>
            </SheetHeader>
            <div className="px-4">{getHelp.content}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
