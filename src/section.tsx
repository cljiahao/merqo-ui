"use client";

import * as React from "react";

import { InfoTooltip } from "./info-tooltip";
import { cn } from "./lib/utils";

export interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description?: string;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}

export function Section({
  icon: Icon,
  eyebrow,
  title,
  description,
  tooltip,
  className,
  children,
}: SectionProps) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-sm",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {eyebrow}
            </span>
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
    </section>
  );
}
