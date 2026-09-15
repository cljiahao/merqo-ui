import * as React from "react";
import { cn } from "./lib/utils";

export interface ElevatedCardProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "li";
  className?: string;
  children: React.ReactNode;
}

// The polished-card look shared across profile/dashboard/setup pages across
// every kit: rounded corners, a soft two-layer lifted shadow. Deliberately
// not qkit's scalloped Ticket theme, which stays local to qkit.
export function ElevatedCard({
  as: As = "div",
  className,
  children,
  ...props
}: ElevatedCardProps): React.ReactElement {
  return (
    <As
      className={cn(
        "rounded-[20px] border bg-card shadow-[0_1px_0_0_var(--color-border),0_12px_28px_-20px_rgba(0,0,0,0.35)]",
        className,
      )}
      {...props}
    >
      {children}
    </As>
  );
}
