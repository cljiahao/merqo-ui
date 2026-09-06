"use client";

import * as React from "react";
import { cn } from "./lib/utils";

export interface TermsAcceptanceCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  basePath?: string;
  className?: string;
}

export function TermsAcceptanceCheckbox({
  checked,
  onCheckedChange,
  basePath = "/legal",
  className,
}: TermsAcceptanceCheckboxProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          role="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I have read and agree to the{" "}
          <a href={`${basePath}/terms`} target="_blank" rel="noreferrer" className="text-primary underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href={`${basePath}/privacy`} target="_blank" rel="noreferrer" className="text-primary underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
    </div>
  );
}
