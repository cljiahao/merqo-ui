"use client";

import * as React from "react";

import { InfoTooltip } from "./info-tooltip";
import { cn } from "./lib/utils";

export interface SectionProps {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  tooltip?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /**
   * Overrides the default `<section>` shell entirely — e.g. a kit's own
   * bordered/textured card component. Receives the section's rendered
   * header+children as `content`; owns its own outer element and classes.
   * When set, `className` and the default bg-card/border/shadow classes do
   * NOT apply — pass any classes the wrapper needs inside the wrapper
   * function itself.
   */
  wrapper?: (content: React.ReactNode) => React.ReactNode;
}

export function Section({
  icon,
  eyebrow,
  title,
  description,
  tooltip,
  className,
  wrapper,
  children,
}: SectionProps) {
  const content = (
    // flex flex-col gap-4 lives here, not just on the default <section> shell
    // below, so a `wrapper` swap-out (which owns its own outer classes) can't
    // silently drop the gap between the header and children — it did exactly
    // that in qkit's Ticket-wrapped usage before this was moved down.
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            {icon}
          </span>
          <div className="flex flex-col">
            {eyebrow ? (
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {eyebrow}
              </span>
            ) : null}
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold">{title}</h3>
              {tooltip ? (
                <InfoTooltip content={tooltip} ariaLabel={`More about ${title}`} />
              ) : null}
            </div>
          </div>
        </div>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );

  if (wrapper) {
    return <>{wrapper(content)}</>;
  }

  return (
    <section
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm",
        className,
      )}
    >
      {content}
    </section>
  );
}
