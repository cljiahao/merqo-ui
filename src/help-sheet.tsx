"use client";

import * as React from "react";

import { useAsyncAction } from "./use-async-action";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

export interface SupportRequest {
  message: string;
}

export type HelpSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional hook for a consuming kit's own toast/notification on async failure. */
  onError?: (error: unknown) => void;
} & (
  | { mode: "mailto"; address: string }
  | { mode: "form"; onSubmit: (data: SupportRequest) => Promise<void> }
);

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function HelpSheet(props: HelpSheetProps) {
  const { open, onOpenChange, onError } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Get help</SheetTitle>
          <SheetDescription>
            {props.mode === "mailto"
              ? "Reach out and we'll get back to you."
              : "Tell us what you're stuck on."}
          </SheetDescription>
        </SheetHeader>
        {props.mode === "mailto" ? (
          <div className="px-4">
            <a
              href={`mailto:${props.address}`}
              className="text-primary text-sm font-medium underline underline-offset-4"
            >
              Email support
            </a>
          </div>
        ) : (
          <HelpForm onSubmit={props.onSubmit} onOpenChange={onOpenChange} onError={onError} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function HelpForm({
  onSubmit,
  onOpenChange,
  onError,
}: {
  onSubmit: (data: SupportRequest) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onError?: (error: unknown) => void;
}) {
  const [message, setMessage] = React.useState("");
  const { pending, error, run } = useAsyncAction(async () => {
    if (!message.trim()) return;
    await onSubmit({ message });
    setMessage("");
    onOpenChange(false);
  });

  return (
    <form
      className="flex flex-1 flex-col gap-4 px-4"
      onSubmit={(event) => {
        event.preventDefault();
        run().catch((err) => onError?.(err));
      }}
    >
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="help-message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="help-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="border-input bg-background flex-1 min-h-24 resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {toErrorMessage(error)}
          </p>
        ) : null}
      </div>
      <SheetFooter className="p-0">
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
        >
          Send
        </button>
      </SheetFooter>
    </form>
  );
}
