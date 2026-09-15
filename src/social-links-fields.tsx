"use client";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { SOCIAL_LINK_FIELDS, type SocialLinks } from "./social-icons";

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const PLACEHOLDERS: Record<keyof SocialLinks, string> = {
  website: "https://your-stall.com",
  instagram: "https://instagram.com/yourstall",
  facebook: "https://facebook.com/yourstall",
  tiktok: "https://tiktok.com/@yourstall",
};

const FIELDS = SOCIAL_LINK_FIELDS.map((field) => ({
  ...field,
  placeholder: PLACEHOLDERS[field.key],
}));

export interface SocialLinksFieldsProps {
  value: SocialLinks;
  onChange: (next: SocialLinks) => void;
  idPrefix: string;
}

export function SocialLinksFields({
  value,
  onChange,
  idPrefix,
}: SocialLinksFieldsProps) {
  function setField(key: keyof SocialLinks, raw: string) {
    const next = { ...value };
    if (raw) next[key] = raw;
    else delete next[key];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {FIELDS.map(({ key, label, placeholder, icon: Icon }) => {
        const id = `${idPrefix}-${key}`;
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={id} className={LABEL_CLASS}>
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" />
                {label}
              </span>
            </Label>
            <Input
              id={id}
              value={value[key] ?? ""}
              placeholder={placeholder}
              className="h-11 rounded-xl"
              onChange={(e) => setField(key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
