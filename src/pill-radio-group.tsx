"use client";

import * as React from "react";

import { cn } from "./lib/utils";

export interface PillRadioOption {
  value: string;
  label: React.ReactNode;
  /** Accessible name override for this option — only needed when `label`
   *  isn't itself readable text (none of this package's current callers
   *  need this, but a bare icon-only option in the future would). */
  ariaLabel?: string;
}

export interface PillRadioGroupProps {
  ariaLabel: string;
  options: PillRadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Tailwind grid-template-columns + gap classes, e.g. "grid-cols-11 gap-1". */
  gridClassName: string;
  /** Extra classes merged onto every option button (e.g. `tabular-nums` for
   *  a numeric-label grid — not applied by default since most option labels
   *  are plain text, not digits). */
  optionClassName?: string;
}

/**
 * Shared roving-tabindex radiogroup behind this package's two pill-button
 * option grids (`FeedbackSheet`'s 0-10 NPS score, `HelpSheet`'s category
 * picker). Follows the WAI-ARIA APG "radio group" keyboard pattern: only
 * one option sits in the Tab order at a time (the checked one, or the
 * first option before anything is checked) — Left/Up and Right/Down move
 * focus AND selection between options, wrapping at the ends, and Home/End
 * jump to the first/last option. Previously every pill was its own Tab
 * stop (11 of them for the NPS grid alone), which doesn't match how a
 * screen reader announces or a keyboard user expects a `role="radiogroup"`
 * to behave — Tab should skip over the whole group in one stop, same as a
 * native `<input type="radio">` set.
 */
export function PillRadioGroup({
  ariaLabel,
  options,
  value,
  onChange,
  gridClassName,
  optionClassName,
}: PillRadioGroupProps) {
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = options.findIndex((option) => option.value === value);
  const rovingIndex = checkedIndex === -1 ? 0 : checkedIndex;

  function moveTo(index: number) {
    const wrapped = (index + options.length) % options.length;
    onChange(options[wrapped].value);
    buttonRefs.current[wrapped]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveTo(rovingIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveTo(rovingIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid", gridClassName)}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            tabIndex={index === rovingIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-colors",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:border-primary/50",
              optionClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
