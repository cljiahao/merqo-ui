import * as React from "react";
import { cn } from "./lib/utils";

export interface LegalFooterLinksProps {
  basePath?: string;
  className?: string;
}

export function LegalFooterLinks({ basePath = "/legal", className }: LegalFooterLinksProps) {
  return (
    <nav className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <a href={`${basePath}/terms`} className="hover:text-foreground">
        Terms
      </a>
      <a href={`${basePath}/privacy`} className="hover:text-foreground">
        Privacy
      </a>
    </nav>
  );
}
