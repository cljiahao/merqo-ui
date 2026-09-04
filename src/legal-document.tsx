"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getLegalDocSource,
  getEndCustomerNoticeSource,
  LEGAL_VERSIONS,
  type LegalDocType,
} from "./legal";
import { cn } from "./lib/utils";

export interface LegalDocumentProps {
  doc: LegalDocType | "end-customer-notice";
  className?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingRenderer(level: 2 | 3) {
  const Tag = level === 2 ? "h2" : "h3";
  return ({ children }: { children?: React.ReactNode }) => {
    const text = React.Children.toArray(children).join("");
    return (
      <Tag
        id={slugify(text)}
        className={cn(
          "font-display font-semibold text-foreground scroll-mt-24",
          level === 2 ? "mt-8 text-xl" : "mt-5 text-lg",
        )}
      >
        {children}
      </Tag>
    );
  };
}

export function LegalDocument({ doc, className }: LegalDocumentProps) {
  const source =
    doc === "end-customer-notice" ? getEndCustomerNoticeSource() : getLegalDocSource(doc);
  const version = doc === "end-customer-notice" ? LEGAL_VERSIONS.privacy : LEGAL_VERSIONS[doc];

  return (
    <article className={cn("mx-auto max-w-3xl px-5 py-10 text-sm", className)}>
      <p className="mb-6 text-xs text-muted-foreground">
        Version {version} · Effective {version}
      </p>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: headingRenderer(2),
          h3: headingRenderer(3),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-foreground/90">{children}</ul>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
