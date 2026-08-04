import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ImageUploader, type ImageUploaderProps } from "./image-uploader";

function makeFile(
  name = "photo.jpg",
  type = "image/jpeg",
  size = 1024,
): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function baseProps(
  overrides: Partial<ImageUploaderProps> = {},
): ImageUploaderProps {
  return {
    bucket: "vendor-images",
    pathPrefix: "vendor-1",
    value: null,
    onChange: vi.fn(),
    onUpload: vi.fn().mockResolvedValue("https://cdn.example.test/a.webp"),
    ...overrides,
  };
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("no file input rendered");
  return input as HTMLInputElement;
}

async function selectFile(container: HTMLElement, file: File) {
  const input = fileInput(container);
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe("ImageUploader — upload pipeline", () => {
  it("accepts only JPEG, PNG and WebP (SVG deliberately excluded)", () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    expect(fileInput(container)).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });

  it("rejects a non-accepted file type: shows an inline error, calls onError, never uploads", async () => {
    const onUpload = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onError })} />,
    );

    await selectFile(container, makeFile("logo.svg", "image/svg+xml"));

    expect(
      await screen.findByText("Use a JPEG, PNG, or WebP image"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("rejects a file over the default 15 MB cap with a 15 MB message", async () => {
    const onUpload = vi.fn();
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(
      container,
      makeFile("huge.jpg", "image/jpeg", 15 * 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Image must be 15 MB or smaller"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("honours a custom maxBytes and names it in the message (stockkit's 5 MB bucket limit)", async () => {
    const onUpload = vi.fn();
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, maxBytes: 5 * 1024 * 1024 })} />,
    );

    await selectFile(
      container,
      makeFile("big.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    );

    expect(
      await screen.findByText("Image must be 5 MB or smaller"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("a file exactly at the cap is accepted, not rejected (boundary is >, not >=)", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.webp");
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, maxBytes: 1000 })} />,
    );

    await selectFile(container, makeFile("exact.jpg", "image/jpeg", 1000));

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
  });

  it("uploads a resized blob to a uuid path under pathPrefix and reports the returned URL", async () => {
    const onChange = vi.fn();
    const onUpload = vi
      .fn()
      .mockResolvedValue("https://cdn.example.test/final.webp");
    const blob = new Blob(["resized"], { type: "image/webp" });
    const resizeImage = vi
      .fn()
      .mockResolvedValue({ blob, ext: "webp", type: "image/webp" });

    const { container } = render(
      <ImageUploader
        {...baseProps({ onChange, onUpload, resizeImage })}
      />,
    );

    await selectFile(container, makeFile());

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 1000);

    const payload = onUpload.mock.calls[0][0];
    expect(payload.bucket).toBe("vendor-images");
    expect(payload.blob).toBe(blob);
    expect(payload.contentType).toBe("image/webp");
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.webp$/);

    expect(onChange).toHaveBeenCalledWith("https://cdn.example.test/final.webp");
  });

  it("generates a distinct path per upload", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.webp");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    await selectFile(container, makeFile());
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));

    expect(onUpload.mock.calls[0][0].path).not.toBe(
      onUpload.mock.calls[1][0].path,
    );
  });

  it("without a resizeImage prop, uploads the original file with its own extension and type", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.png");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    const file = makeFile("Shot.PNG", "image/png");
    await selectFile(container, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const payload = onUpload.mock.calls[0][0];
    expect(payload.blob).toBe(file);
    expect(payload.contentType).toBe("image/png");
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.png$/);
  });

  it("disables the trigger while uploading and re-enables it after success", async () => {
    let release: (url: string) => void = () => {};
    const onUpload = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeDisabled());

    await act(async () => {
      release("https://cdn.example.test/a.webp");
    });

    await waitFor(() => expect(trigger).toBeEnabled());
  });

  it("REGRESSION: a rejecting resize step resets uploading to false instead of sticking forever", async () => {
    const onError = vi.fn();
    const resizeImage = vi.fn().mockRejectedValue(new Error("decode failed"));
    const { container } = render(
      <ImageUploader {...baseProps({ resizeImage, onError })} />,
    );

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    expect(await screen.findByText("decode failed")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("REGRESSION: a rejecting upload resets uploading to false and surfaces the failure", async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onChange, onError })} />,
    );

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    expect(await screen.findByText("storage 403")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the thrown value is not an Error", async () => {
    const onUpload = vi.fn().mockRejectedValue("nope");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());

    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
  });

  it("clears a previous error once a later upload succeeds", async () => {
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error("storage 403"))
      .mockResolvedValueOnce("https://cdn.example.test/a.webp");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());
    expect(await screen.findByText("storage 403")).toBeInTheDocument();

    await selectFile(container, makeFile());
    await waitFor(() =>
      expect(screen.queryByText("storage 403")).not.toBeInTheDocument(),
    );
  });

  it("resets the input value so re-picking the same file fires another change", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);

    await selectFile(container, makeFile());

    expect(input.value).toBe("");
  });

  it("clicking the trigger opens the file picker", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: /add photo/i }));

    expect(click).toHaveBeenCalledTimes(1);
  });
});
