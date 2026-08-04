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
  nps?: number;
}

export interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FeedbackData) => Promise<void>;
  source?: string;
  metric?: string;
  showNps?: boolean;
  title?: string;
  description?: string;
  /** Optional hook for a consuming kit's own toast/notification on async failure. */
  onError?: (error: unknown) => void;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function FeedbackSheet({
  open,
  onOpenChange,
  onSubmit,
  source = "vendor",
  metric,
  showNps,
  title = "Feedback",
  description = "Tell us what's working, or what isn't.",
  onError,
}: FeedbackSheetProps) {
  const [message, setMessage] = React.useState("");
  const [score, setScore] = React.useState<number | null>(null);
  const [npsValidationError, setNpsValidationError] = React.useState(false);

  const { pending, error, run } = useAsyncAction(async () => {
    if (showNps) {
      if (score === null) {
        setNpsValidationError(true);
        return;
      }
    } else if (!message.trim()) {
      return;
    }
    const payload: FeedbackData = { message, source, metric };
    if (showNps && score !== null) {
      payload.nps = score;
    }
    await onSubmit(payload);
    setMessage("");
    setScore(null);
    setNpsValidationError(false);
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-1 flex-col gap-4 px-4"
          onSubmit={(event) => {
            event.preventDefault();
            run().catch((err) => onError?.(err));
          }}
        >
          {showNps && (
            <div className="flex flex-col gap-2">
              <div
                role="radiogroup"
                aria-label="Recommend score, 0 to 10"
                className="grid grid-cols-11 gap-1"
              >
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={score === n}
                    aria-label={String(n)}
                    onClick={() => {
                      setScore(n);
                      setNpsValidationError(false);
                    }}
                    className={`flex items-center justify-center rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors ${
                      score === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {npsValidationError && (
                <p className="text-destructive text-sm" role="alert">
                  Pick a score first
                </p>
              )}
            </div>
          )}
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
      </SheetContent>
    </Sheet>
  );
}
