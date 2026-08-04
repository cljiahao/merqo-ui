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

export interface FeedbackData {
  message: string;
  source: string;
  metric?: string;
}

export interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FeedbackData) => Promise<void>;
  source?: string;
  metric?: string;
}

export function FeedbackSheet({
  open,
  onOpenChange,
  onSubmit,
  source = "vendor",
  metric,
}: FeedbackSheetProps) {
  const [message, setMessage] = React.useState("");
  const { pending, run } = useAsyncAction(async () => {
    if (!message.trim()) return;
    await onSubmit({ message, source, metric });
    setMessage("");
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Feedback</SheetTitle>
          <SheetDescription>
            Tell us what&apos;s working, or what isn&apos;t.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-4 px-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="border-input bg-background flex-1 min-h-24 resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
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
      </SheetContent>
    </Sheet>
  );
}
