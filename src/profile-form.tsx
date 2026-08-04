"use client";

import * as React from "react";
import { z } from "zod";
import { AtSign, Globe, Image as ImageIcon, KeyRound, Store, User } from "lucide-react";

import { Section } from "./section";
import { TwoColumnSections } from "./two-column-sections";
import { useAsyncAction } from "./use-async-action";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  ImageUploader,
  type ImageResizeResult,
  type ImageUploaderVariant,
  type ImageUploadPayload,
} from "./image-uploader";

export interface SocialLinks {
  instagram?: string;
  website?: string;
  facebook?: string;
  tiktok?: string;
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
  onSaveAvatar: (url: string | null) => Promise<void>;
  onSavePassword: (newPassword: string) => Promise<void>;
  /** Storage bucket for the avatar image, forwarded to `ImageUploader`. */
  avatarBucket: string;
  /** Directory-style prefix for the generated avatar object path. */
  avatarPathPrefix: string;
  /**
   * Performs the actual avatar storage write and resolves the final public
   * URL. Mirrors `ImageUploader`'s own `onUpload` prop exactly.
   */
  onAvatarUpload: (payload: ImageUploadPayload) => Promise<string>;
  /** Optional browser-side resize/re-encode step for the avatar image. */
  resizeAvatarImage?: (file: File, maxDim: number) => Promise<ImageResizeResult>;
  /** Avatar source-file size cap in bytes. Default 15 MB (see `ImageUploader`). */
  avatarMaxBytes?: number;
  /** Avatar image variant. Default "thumb". */
  avatarVariant?: ImageUploaderVariant;
  /** Longest-side target handed to `resizeAvatarImage`. Defaults per variant. */
  avatarMaxDim?: number;
  /** Optional hook for a consuming kit's own toast/notification on avatar upload failure. */
  onAvatarError?: (error: unknown) => void;
  /** Optional hook for a consuming kit's own toast/notification on async failure. */
  onError?: (error: unknown) => void;
  /**
   * Forwarded verbatim to every one of `ProfileForm`'s 5 internal `Section`
   * calls' own `wrapper` prop — lets a kit apply the same card shell to
   * every section of the composed form. See `Section`'s own `wrapper` prop.
   */
  sectionWrapper?: (content: React.ReactNode) => React.ReactNode;
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
  avatarBucket,
  avatarPathPrefix,
  onAvatarUpload,
  resizeAvatarImage,
  avatarMaxBytes,
  avatarVariant,
  avatarMaxDim,
  onAvatarError,
  onError,
  sectionWrapper,
}: ProfileFormProps) {
  const [stallName, setStallName] = React.useState(initial.stallName);
  const [socialLinks, setSocialLinks] = React.useState(initial.socialLinks);
  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [avatarUrl, setAvatarUrl] = React.useState(initial.avatarUrl ?? null);
  const [password, setPassword] = React.useState("");

  const [stallNameValidationError, setStallNameValidationError] = React.useState<
    string | null
  >(null);
  const [displayNameValidationError, setDisplayNameValidationError] =
    React.useState<string | null>(null);
  const [passwordValidationError, setPasswordValidationError] = React.useState<
    string | null
  >(null);

  // N1 fix: the social-links save must send the last *persisted* stall
  // name, not whatever's currently (possibly unsaved, possibly invalid)
  // typed into the separate stall-name input. `savedStallName` starts at
  // the initial prop value and only advances when the stall-name section's
  // own save actually succeeds - it never reflects a live, unsaved edit.
  const [savedStallName, setSavedStallName] = React.useState(initial.stallName);

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
      setSavedStallName(data.stallName);
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
  const avatarSave = useAsyncAction(async (url: string | null) => {
    await onSaveAvatar(url);
  });
  const passwordSave = useAsyncAction(async (newPassword: string) => {
    await onSavePassword(newPassword);
    setPassword("");
  });

  const columnOne = (
    <>
      <Section
        icon={<Store className="size-5" />}
        eyebrow="Shown to customers"
        title={stallNameLabel}
        wrapper={sectionWrapper}
      >
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
          <Label htmlFor="profile-stall-name">{stallNameLabel}</Label>
          <Input
            id="profile-stall-name"
            value={stallName}
            onChange={(event) => setStallName(event.target.value)}
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

      <Section
        icon={<ImageIcon className="size-5" />}
        eyebrow="Shown to customers"
        title="Profile picture"
        wrapper={sectionWrapper}
      >
        <ImageUploader
          bucket={avatarBucket}
          pathPrefix={avatarPathPrefix}
          value={avatarUrl}
          onChange={(url) => {
            setAvatarUrl(url);
            avatarSave.run(url).catch((err) => onError?.(err));
          }}
          onUpload={onAvatarUpload}
          resizeImage={resizeAvatarImage}
          maxBytes={avatarMaxBytes}
          variant={avatarVariant}
          maxDim={avatarMaxDim}
          onError={onAvatarError}
        />
        <FieldError
          message={avatarSave.error ? toErrorMessage(avatarSave.error) : null}
        />
      </Section>

      <Section
        icon={<KeyRound className="size-5" />}
        eyebrow="Sign-in security"
        title="Change password"
        wrapper={sectionWrapper}
      >
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
          <Label htmlFor="profile-new-password">New password</Label>
          <Input
            id="profile-new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
      <Section
        icon={<User className="size-5" />}
        eyebrow="Just for you"
        title="Display name"
        wrapper={sectionWrapper}
      >
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
          <Label htmlFor="profile-display-name">Display name</Label>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <FieldError message={displayNameValidationError} />
          <FieldError
            message={displayNameSave.error ? toErrorMessage(displayNameSave.error) : null}
          />
          <SaveButton pending={displayNameSave.pending}>Save display name</SaveButton>
        </form>
      </Section>

      <Section
        icon={<AtSign className="size-5" />}
        eyebrow="Shown to customers"
        title="Social links"
        wrapper={sectionWrapper}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            // No stall-name guard here (C1): this section only owns the
            // social links fields, both optional, so it saves independently
            // of whether the stall name is currently valid. It sends the
            // last-persisted stall name (N1), not the live/unsaved value
            // from the separate stall-name input.
            socialLinksSave
              .run({ stallName: savedStallName, socialLinks })
              .catch((err) => onError?.(err));
          }}
        >
          <Label htmlFor="profile-instagram">Instagram</Label>
          <Input
            id="profile-instagram"
            value={socialLinks.instagram ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, instagram: event.target.value }))
            }
          />
          <Label htmlFor="profile-website">
            <Globe className="size-3.5" /> Website
          </Label>
          <Input
            id="profile-website"
            value={socialLinks.website ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, website: event.target.value }))
            }
          />
          <Label htmlFor="profile-facebook">Facebook</Label>
          <Input
            id="profile-facebook"
            value={socialLinks.facebook ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, facebook: event.target.value }))
            }
          />
          <Label htmlFor="profile-tiktok">TikTok</Label>
          <Input
            id="profile-tiktok"
            value={socialLinks.tiktok ?? ""}
            onChange={(event) =>
              setSocialLinks((links) => ({ ...links, tiktok: event.target.value }))
            }
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
