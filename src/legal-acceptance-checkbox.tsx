"use client";

import * as React from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { cn } from "./lib/utils";

export interface TermsAcceptanceCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  legalName: string;
  onLegalNameChange: (name: string) => void;
  basePath?: string;
  className?: string;
}

export function TermsAcceptanceCheckbox({
  checked,
  onCheckedChange,
  legalName,
  onLegalNameChange,
  basePath = "/legal",
  className,
}: TermsAcceptanceCheckboxProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label htmlFor="legal-name">Your name</Label>
        <Input
          id="legal-name"
          value={legalName}
          onChange={(e) => onLegalNameChange(e.target.value)}
          placeholder="As the person accepting on behalf of your business"
        />
      </div>
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
