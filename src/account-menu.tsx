"use client";

import * as React from "react";
import { User as UserIcon } from "lucide-react";

import { FeedbackSheet, type FeedbackData } from "./feedback-sheet";
import { HelpSheet, type SupportRequest } from "./help-sheet";
import { useAsyncAction } from "./use-async-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function AvatarInitial({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />;
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
      {initial || <UserIcon className="size-4" />}
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
}: AccountMenuProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  // C2 fix: sign-out used to be `void signOutAction()` - a rejection was
  // discarded, the menu closed regardless, and the user had no way to know
  // sign-out failed. Now it's wrapped in useAsyncAction (error state) and
  // the dropdown item prevents Radix's default auto-close so the menu only
  // closes on a *successful* sign-out; on failure it stays open with a
  // visible inline error next to the item.
  const signOut = useAsyncAction(signOutAction);

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
          <DropdownMenuItem asChild>
            <a href="/dashboard/profile">Profile</a>
          </DropdownMenuItem>

          {kitLocalSettingsHref ? (
            <DropdownMenuItem asChild>
              <a href={kitLocalSettingsHref}>Settings</a>
            </DropdownMenuItem>
          ) : null}

          {showPlanItem ? (
            <DropdownMenuItem asChild>
              <a href="/dashboard/plan">
                Plan{vendor.tier ? ` · ${vendor.tier}` : ""}
              </a>
            </DropdownMenuItem>
          ) : null}

          {getHelp.type === "mailto" ? (
            <DropdownMenuItem asChild>
              <a href={`mailto:${getHelp.address}`}>Get help</a>
            </DropdownMenuItem>
          ) : getHelp.type === "drawer" || getHelp.type === "form" ? (
            <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
              Get help
            </DropdownMenuItem>
          ) : (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Get help</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {getHelp.items.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <a href={item.href}>{item.label}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
            Feedback
          </DropdownMenuItem>

          {extraLink ? (
            <DropdownMenuItem asChild>
              <a href={extraLink.href}>{extraLink.label}</a>
            </DropdownMenuItem>
          ) : null}

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
