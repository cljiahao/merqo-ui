"use client";

import * as React from "react";

import { FeedbackSheet, type FeedbackData } from "./feedback-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  | { type: "submenu"; items: { label: string; href: string }[] };

export interface AccountMenuProps {
  vendor: { name: string; avatarUrl?: string; tier?: string };
  signOutAction: () => Promise<void>;
  kitLocalSettingsHref?: string;
  showPlanItem?: boolean;
  getHelp: AccountMenuGetHelp;
  onFeedbackSubmit: (data: FeedbackData) => Promise<void>;
}

function AvatarInitial({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />;
  }
  return (
    <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
      {name.charAt(0).toUpperCase()}
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
}: AccountMenuProps) {
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full outline-none focus-visible:ring-2"
          >
            <AvatarInitial name={vendor.name} avatarUrl={vendor.avatarUrl} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
          ) : getHelp.type === "drawer" ? (
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void signOutAction();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmit={onFeedbackSubmit}
      />

      {getHelp.type === "drawer" ? (
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
