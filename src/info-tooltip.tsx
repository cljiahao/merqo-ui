"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface InfoTooltipProps {
  content: React.ReactNode;
  ariaLabel: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function InfoTooltip({
  content,
  ariaLabel,
  icon: Icon = Info,
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-4 items-center justify-center rounded-full outline-none focus-visible:ring-2"
        >
          <Icon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
