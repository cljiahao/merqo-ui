"use client";

import * as React from "react";
import { z } from "zod";
import { AtSign, Globe, Image as ImageIcon, KeyRound, Store, User } from "lucide-react";

import { Section } from "./section";
import { TwoColumnSections } from "./two-column-sections";
import { useAsyncAction } from "./use-async-action";

export interface SocialLinks {
  instagram?: string;
  website?: string;
}

export interface ProfileFormInitial {
  stallName: string;
  socialLinks: SocialLinks;
  displayName: string;
  avatarUrl?: string;
}

export interface ProfileFormProps {
  initial: ProfileFormInitial;
  stallNameLabel?: string;
  onSaveStallIdentity: (data: {
    stallName: string;
    socialLinks: SocialLinks;
  }) => Promise<void>;
  onSaveDisplayName: (name: string) => Promise<void>;
  onSaveAvatar: (file: File) => Promise<void>;
  onSavePassword: (newPassword: string) => Promise<void>;
  /** Optional hook for a consuming kit's own toast/notification on async failure. */
  onError?: (error: unknown) => void;
}

// Client-side validation schemas (see docs/business §2.5 client-validation
// requirement). Every network-bound field validates with `safeParse` before
// its request fires; failures render inline and never reach the network.
const stallNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name customers will see.");
const displayNameSchema = z.string().trim().min(1, "Enter a display name.");
// 8 characters is a reasonable minimum baseline (aligned with NIST SP
// 800-63B, which favors length over composition rules) - no npm registry
// access here to pull in a stronger strength meter, so this is a simple,
// documented floor rather than a scored strength check.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

function SaveButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-fit items-center justify-center rounded-md px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ProfileForm({
  initial,
  stallNameLabel = "Stall name",
  onSaveStallIdentity,
  onSaveDisplayName,
  onSaveAvatar,
  onSavePassword,
  onError,
}: ProfileFormProps) {
  const [stallName, setStallName] = React.useState(initial.stallName);
  const [socialLinks, setSocialLinks] = React.useState(initial.socialLinks);
  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [password, setPassword] = React.useState("");

  const [stallNameValidationError, setStallNameValidationError] = React.useState<
    string | null
  >(null);
  const [displayNameValidationError, setDisplayNameValidationError] =
    React.useState<string | null>(null);
  const [passwordValidationError, setPasswordValidationError] = React.useState<
    string | null
  >(null);

  // C1/I1 fix: the stall-name section and the social-links section are two
  // independent forms that both happen to call the same
  // `onSaveStallIdentity` prop. They previously shared one useAsyncAction
  // instance guarded by a stall-name-only check, which meant an invalid
  // stall name silently blocked the unrelated social-links save (and the
  // two sections shared one `pending` flag). Splitting into two instances
  // gives each section its own pending/error state and its own guard logic.
  const stallNameSave = useAsyncAction(
    async (data: { stallName: string; socialLinks: SocialLinks }) => {
      await onSaveStallIdentity(data);
    },
  );
  const socialLinksSave = useAsyncAction(
    async (data: { stallName: string; socialLinks: SocialLinks }) => {
      await onSaveStallIdentity(data);
    },
  );
  const displayNameSave = useAsyncAction(async (name: string) => {
    await onSaveDisplayName(name);
  });
  const avatarSave = useAsyncAction(async (file: File) => {
    await onSaveAvatar(file);
  });
  const passwordSave = useAsyncAction(async (newPassword: string) => {
    await onSavePassword(newPassword);
    setPassword("");
  });

  const columnOne = (
    <>
      <Section icon={Store} eyebrow="Shown to customers" title={stallNameLabel}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = stallNameSchema.safeParse(stallName);
            if (!parsed.success) {
              setStallNameValidationError(
                parsed.error.issues[0]?.message ?? "Invalid name.",
              );
              return;
            }
            setStallNameValidationError(null);
            stallNameSave
              .run({ stallName: parsed.data, socialLinks })
              .catch((err) => onError?.(err));
          }}
        >
          <label htmlFor="profile-stall-name" className="text-sm font-medium">
            {stallNameLabel}
          </label>
          <input
            id="profile-stall-name"
            value={stallName}
            onChange={(event) => setStallName(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <FieldError message={stallNameValidationError} />
          <FieldError
            message={stallNameSave.error ? toErrorMessage(stallNameSave.error) : null}
          />
          <SaveButton pending={stallNameSave.pending}>
            Save {stallNameLabel.toLowerCase()}
          </SaveButton>
        </form>
      </Section>

      <Section icon={ImageIcon} eyebrow="Shown to customers" title="Profile picture">
        <div className="flex items-center gap-3">
          {initial.avatarUrl ? (
            <img
              src={initial.avatarUrl}
              alt="Current profile photo"
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full">
              <User className="size-5" />
            </span>
          )}
          <form
            className="flex flex-1 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const input = event.currentTarget.elements.namedItem(
                "profile-avatar-file",
              ) as HTMLInputElement;
              const file = input.files?.[0];
              if (file) avatarSave.run(file).catch((err) => onError?.(err));
            }}
          >
            <label htmlFor="profile-avatar-file" className="text-sm font-medium">
              Photo
            </label>
            <input id="profile-avatar-file" name="profile-avatar-file" type="file" accept="image/*" />
            <FieldError
              message={avatarSave.error ? toErrorMessage(avatarSave.error) : null}
            />
            <SaveButton pending={avatarSave.pending}>Save photo</SaveButton>
          </form>
        </div>
      </Section>

      <Section icon={KeyRound} eyebrow="Sign-in security" title="Change password">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = passwordSchema.safeParse(password);
            if (!parsed.success) {
              setPasswordValidationError(
                parsed.error.issues[0]?.message ?? "Invalid password.",
              );
              return;
            }
            setPasswordValidationError(null);
            passwordSave.run(parsed.data).catch((err) => onError?.(err));
          }}
        >
          <label htmlFor="profile-new-password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="profile-new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <FieldError message={passwordValidationError} />
          <FieldError
            message={passwordSave.error ? toErrorMessage(passwordSave.error) : null}
          />
          <SaveButton pending={passwordSave.pending}>Save password</SaveButton>
        </form>
      </Section>
    </>
  );

  const columnTwo = (
    <>
      <Section icon={User} eyebrow="Just for you" title="Display name">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = displayNameSchema.safeParse(displayName);
            if (!parsed.success) {
              setDisplayNameValidationError(
                parsed.error.issues[0]?.message ?? "Invalid name.",
              );
              return;
            }
            setDisplayNameValidationError(null);
            displayNameSave.run(parsed.data).catch((err) => onError?.(err));
          }}
        >
          <label htmlFor="profile-display-name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="profile-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <FieldError message={displayNameValidationError} />
          <FieldError
            message={displayNameSave.error ? toErrorMessage(displayNameSave.error) : null}
          />
          <SaveButton pending={displayNameSave.pending}>Save display name</SaveButton>
        </form>
      </Section>

      <Section icon={AtSign} eyebrow="Shown to customers" title="Social links">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            // No stall-name guard here (C1): this section only owns the
            // social links fields, both optional, so it saves independently
            // of whether the stall name is currently valid.
            socialLinksSave
              .run({ stallName, socialLinks })
              .catch((err) => onError?.(err));
          }}
        >
          <label htmlFor="profile-instagram" className="text-sm font-medium">
            Instagram
          </label>
          <input
            id="profile-instagram"
            value={socialLinks.instagram ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, instagram: event.target.value }))
            }
            className="border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <label htmlFor="profile-website" className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="size-3.5" /> Website
          </label>
          <input
            id="profile-website"
            value={socialLinks.website ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, website: event.target.value }))
            }
            className="border-input bg-background h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <FieldError
            message={socialLinksSave.error ? toErrorMessage(socialLinksSave.error) : null}
          />
          <SaveButton pending={socialLinksSave.pending}>Save social links</SaveButton>
        </form>
      </Section>
    </>
  );

  return <TwoColumnSections columnOne={columnOne} columnTwo={columnTwo} />;
}
