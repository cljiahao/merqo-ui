"use client";

import * as React from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { Section } from "./section";
import { useAsyncAction } from "./use-async-action";
import { cn } from "./lib/utils";

interface VendorTelegramSectionCommon {
  /** Forwarded to `Section`'s own `wrapper` prop. */
  sectionWrapper?: (content: React.ReactNode) => React.ReactNode;
  /** Optional hook for a consuming app's own toast/notification on failure. */
  onError?: (error: unknown) => void;
}

export type VendorTelegramSectionProps = VendorTelegramSectionCommon &
  (
    | { connected: true; onDisconnect: () => Promise<void> }
    | {
        connected: false;
        /**
         * Mints a fresh connect token on demand (a server action in the
         * consuming app — merqo mints it directly, same app as the
         * endpoint; a kit calls merqo's `vendor-connect-token` route)
         * rather than a token being pre-minted on every page load.
         */
        onConnect: () => Promise<{ deepLink: string; qrSvgMarkup: string }>;
      }
  );

function DisconnectButton({
  onDisconnect,
  onError,
}: {
  onDisconnect: () => Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const disconnectAction = useAsyncAction(onDisconnect);
  return (
    <button
      type="button"
      disabled={disconnectAction.pending}
      aria-busy={disconnectAction.pending}
      onClick={() => {
        disconnectAction.run().catch((err) => onError?.(err));
      }}
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-md border px-4 text-sm font-medium",
        "hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {disconnectAction.pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {disconnectAction.pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}

function ConnectPanel({
  onConnect,
  onError,
}: {
  onConnect: () => Promise<{ deepLink: string; qrSvgMarkup: string }>;
  onError?: (error: unknown) => void;
}) {
  const [link, setLink] = React.useState<{
    deepLink: string;
    qrSvgMarkup: string;
  } | null>(null);
  const connectAction = useAsyncAction(async () => {
    setLink(await onConnect());
  });

  if (link) {
    return (
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className="shrink-0 rounded-xl border bg-white p-2 [&_svg]:size-20"
          dangerouslySetInnerHTML={{ __html: link.qrSvgMarkup }}
        />
        <div className="w-full min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            Scan with Telegram, or tap the link below.
          </p>
          <a
            href={link.deepLink}
            target="_blank"
            rel="noreferrer"
            className="block truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs"
          >
            {link.deepLink}
          </a>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={connectAction.pending}
      aria-busy={connectAction.pending}
      onClick={() => {
        connectAction.run().catch((err) => onError?.(err));
      }}
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {connectAction.pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {connectAction.pending ? "Connecting…" : "Connect Telegram"}
    </button>
  );
}

/**
 * Vendor-facing Telegram connect settings block (Phase A2 of the cross-kit
 * Telegram integration design) — the shared replacement for each kit's own
 * now-retired per-kit vendor-alert bot's settings UI. Deliberately named
 * apart from qkit's own customer-facing `TelegramConnect` component: this
 * one is vendor-scoped, standing (never single-use), and lives here rather
 * than kit-local, even though (for now) merqo's own profile page is its
 * only consumer. Single-column shaped (a narrow settings block, not a
 * `TwoColumnSections` layout) — the consuming page decides where to slot
 * it.
 */
export function VendorTelegramSection(props: VendorTelegramSectionProps) {
  return (
    <Section
      icon={<MessageCircle className="size-5" />}
      eyebrow="Stay in the loop"
      title="Telegram alerts"
      description="Get a Telegram message here whenever there's new activity for your shop."
      wrapper={props.sectionWrapper}
    >
      {props.connected ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Telegram connected</p>
          <DisconnectButton
            onDisconnect={props.onDisconnect}
            onError={props.onError}
          />
        </div>
      ) : (
        <ConnectPanel onConnect={props.onConnect} onError={props.onError} />
      )}
    </Section>
  );
}
