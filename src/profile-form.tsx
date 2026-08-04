"use client";

import * as React from "react";
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
}: ProfileFormProps) {
  const [stallName, setStallName] = React.useState(initial.stallName);
  const [socialLinks, setSocialLinks] = React.useState(initial.socialLinks);
  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [password, setPassword] = React.useState("");

  const stallIdentity = useAsyncAction(
    async (data: { stallName: string; socialLinks: SocialLinks }) => {
      if (!data.stallName.trim()) return;
      await onSaveStallIdentity(data);
    },
  );
  const displayNameSave = useAsyncAction(async (name: string) => {
    if (!name.trim()) return;
    await onSaveDisplayName(name);
  });
  const avatarSave = useAsyncAction(async (file: File) => {
    await onSaveAvatar(file);
  });
  const passwordSave = useAsyncAction(async (newPassword: string) => {
    if (!newPassword) return;
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
            void stallIdentity.run({ stallName, socialLinks });
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
          <SaveButton pending={stallIdentity.pending}>
            Save {stallNameLabel.toLowerCase()}
          </SaveButton>
        </form>
      </Section>

      <Section icon={ImageIcon} eyebrow="Shown to customers" title="Profile picture">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "profile-avatar-file",
            ) as HTMLInputElement;
            const file = input.files?.[0];
            if (file) void avatarSave.run(file);
          }}
        >
          <label htmlFor="profile-avatar-file" className="text-sm font-medium">
            Photo
          </label>
          <input id="profile-avatar-file" name="profile-avatar-file" type="file" accept="image/*" />
          <SaveButton pending={avatarSave.pending}>Save photo</SaveButton>
        </form>
      </Section>

      <Section icon={KeyRound} eyebrow="Sign-in security" title="Change password">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void passwordSave.run(password);
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
            void displayNameSave.run(displayName);
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
          <SaveButton pending={displayNameSave.pending}>Save display name</SaveButton>
        </form>
      </Section>

      <Section icon={AtSign} eyebrow="Shown to customers" title="Social links">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void stallIdentity.run({ stallName, socialLinks });
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
          <SaveButton pending={stallIdentity.pending}>Save social links</SaveButton>
        </form>
      </Section>
    </>
  );

  return <TwoColumnSections columnOne={columnOne} columnTwo={columnTwo} />;
}
