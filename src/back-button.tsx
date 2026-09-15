import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

export interface BackButtonProps {
  href: string;
  label: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    children?: React.ReactNode;
  }>;
}

const DefaultLink = ({
  href,
  children,
}: {
  href: string;
  children?: React.ReactNode;
}) => <a href={href}>{children}</a>;

/** Consistent "leave this page" nav — a real button (proper hit target,
 * hover/focus state), not a plain text link that reads as body copy. */
export function BackButton({
  href,
  label,
  LinkComponent,
}: BackButtonProps): React.ReactElement {
  const Link = LinkComponent ?? DefaultLink;
  return (
    <Button asChild variant="ghost" size="sm" className="rounded-lg">
      <Link href={href}>
        <ArrowLeft className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
