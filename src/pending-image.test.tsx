import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ImageUploader, type ImageUploaderProps } from "./image-uploader";
import {
  commitPendingImages,
  discardPendingImage,
  isPendingImage,
  PendingImageUploadError,
  registerPendingImage,
} from "./pending-image";

let previewCount = 0;

beforeEach(() => {
  previewCount = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:test/${++previewCount}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const blob = () => new Blob(["x"], { type: "image/webp" });

describe("commitPendingImages", () => {
  it("uploads pending images and passes every other value through, in order", async () => {
    const preview = registerPendingImage(
      blob(),
      vi.fn().mockResolvedValue("https://cdn.test/new.webp"),
    );
    const result = await commitPendingImages([
      "https://cdn.test/saved.webp",
      preview,
      null,
    ]);
    expect(result.urls).toEqual([
      "https://cdn.test/saved.webp",
      "https://cdn.test/new.webp",
      null,
    ]);
    expect(result.uploaded).toEqual(["https://cdn.test/new.webp"]);
  });

  it("uploads nothing when no value is pending", async () => {
    const result = await commitPendingImages(["https://cdn.test/a.webp"]);
    expect(result).toEqual({ urls: ["https://cdn.test/a.webp"], uploaded: [] });
  });

  it("keeps the pending entry after a commit, so a failed save can retry", async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce("https://cdn.test/first.webp")
      .mockResolvedValueOnce("https://cdn.test/second.webp");
    const preview = registerPendingImage(blob(), upload);
    await commitPendingImages([preview]);
    expect(isPendingImage(preview)).toBe(true);
    const retry = await commitPendingImages([preview]);
    expect(retry.urls).toEqual(["https://cdn.test/second.webp"]);
  });

  it("on a failed upload, throws with the URLs that did upload so the caller can delete them", async () => {
    const ok = registerPendingImage(
      blob(),
      vi.fn().mockResolvedValue("https://cdn.test/ok.webp"),
    );
    const bad = registerPendingImage(
      blob(),
      vi.fn().mockRejectedValue(new Error("denied")),
    );
    const error = await commitPendingImages([ok, bad]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PendingImageUploadError);
    expect((error as PendingImageUploadError).uploaded).toEqual([
      "https://cdn.test/ok.webp",
    ]);
    expect((error as PendingImageUploadError).cause).toEqual(new Error("denied"));
  });
});

describe("discardPendingImage", () => {
  it("forgets a pending image and revokes its preview URL", () => {
    const preview = registerPendingImage(blob(), vi.fn());
    discardPendingImage(preview);
    expect(isPendingImage(preview)).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
  });

  it("ignores saved URLs and null", () => {
    discardPendingImage("https://cdn.test/saved.webp");
    discardPendingImage(null);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

function baseProps(
  overrides: Partial<ImageUploaderProps> = {},
): ImageUploaderProps {
  return {
    bucket: "vendor-images",
    pathPrefix: "vendor-1",
    value: null,
    onChange: vi.fn(),
    onUpload: vi.fn().mockResolvedValue("https://cdn.test/a.webp"),
    deferUpload: true,
    ...overrides,
  };
}

async function pick(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("no file input rendered");
  const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe("ImageUploader with deferUpload", () => {
  it("previews a picked image without uploading it", async () => {
    const onUpload = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onChange })} />,
    );
    await pick(container);
    expect(onUpload).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("blob:test/1");
    expect(isPendingImage("blob:test/1")).toBe(true);
  });

  it("uploads on commit, to a fresh path under pathPrefix each time", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.test/a.webp");
    const onChange = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onChange })} />,
    );
    await pick(container);
    const preview = onChange.mock.calls[0]?.[0] as string;
    await commitPendingImages([preview]);
    await commitPendingImages([preview]);
    const paths = onUpload.mock.calls.map(
      (call) => (call[0] as { path: string }).path,
    );
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/^vendor-1\/.+\.jpg$/);
    expect(paths[0]).not.toBe(paths[1]);
  });

  it("discards the pending image when the vendor removes it", () => {
    const preview = registerPendingImage(blob(), vi.fn());
    const onChange = vi.fn();
    render(<ImageUploader {...baseProps({ onChange, value: preview })} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(isPendingImage(preview)).toBe(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
  });

  it("discards the replaced pending image when the vendor picks another", async () => {
    const preview = registerPendingImage(blob(), vi.fn());
    const onChange = vi.fn();
    const { container, rerender } = render(
      <ImageUploader {...baseProps({ onChange, value: null })} />,
    );
    rerender(<ImageUploader {...baseProps({ onChange, value: preview })} />);
    await pick(container);
    expect(isPendingImage(preview)).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith("blob:test/2");
  });

  it("uploads immediately when deferUpload is off", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.test/a.webp");
    const onChange = vi.fn();
    const { container } = render(
      <ImageUploader
        {...baseProps({ onUpload, onChange, deferUpload: false })}
      />,
    );
    await pick(container);
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("https://cdn.test/a.webp");
  });
});

describe("pending-image package entry point", () => {
  it("exports the commit helpers from the package root", async () => {
    const root = await import("./index");
    expect(root.commitPendingImages).toBe(commitPendingImages);
    expect(root.isPendingImage).toBe(isPendingImage);
    expect(root.PendingImageUploadError).toBe(PendingImageUploadError);
  });
});
