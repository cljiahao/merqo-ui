import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  ImageUploader,
  type ImageUploaderProps,
  type ImagePreviewProps,
} from "./image-uploader";

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

  it("derives the extension from file.type, not the filename, when the file has no extension", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.png");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    const file = makeFile("screenshot", "image/png");
    await selectFile(container, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const payload = onUpload.mock.calls[0][0];
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.png$/);
  });

  it("derives the extension from file.type, not a mismatched/malicious filename extension", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.jpg");
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    // Reports as image/jpeg (passes validation) but is named like a script.
    const file = makeFile("payload.php", "image/jpeg");
    await selectFile(container, file);

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const payload = onUpload.mock.calls[0][0];
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.jpg$/);
    expect(payload.path).not.toMatch(/\.php$/);
  });

  it("re-checks the resized blob's size against maxBytes and rejects an oversized result even though the source file was small", async () => {
    const onUpload = vi.fn();
    const onError = vi.fn();
    const oversizedBlob = new Blob(["x"], { type: "image/jpeg" });
    Object.defineProperty(oversizedBlob, "size", {
      value: 5 * 1024 * 1024 + 1,
    });
    // Mirrors stockkit's real resizeToWebp falling back to the original
    // file unmodified when resize/encode fails.
    const resizeImage = vi.fn().mockResolvedValue({
      blob: oversizedBlob,
      ext: "jpg",
      type: "image/jpeg",
    });
    const { container } = render(
      <ImageUploader
        {...baseProps({
          onUpload,
          onError,
          resizeImage,
          maxBytes: 5 * 1024 * 1024,
        })}
      />,
    );

    await selectFile(container, makeFile("small.jpg", "image/jpeg", 1024));

    expect(
      await screen.findByText("Image must be 5 MB or smaller"),
    ).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("normalizes a pathPrefix with a trailing slash so the path never doubles up", async () => {
    const onUpload = vi.fn().mockResolvedValue("https://cdn.example.test/a.webp");
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, pathPrefix: "vendor-1/" })} />,
    );

    await selectFile(container, makeFile());

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const payload = onUpload.mock.calls[0][0];
    expect(payload.path).toMatch(/^vendor-1\/[^/]+\.jpg$/);
    expect(payload.path).not.toContain("//");
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
    // The inline message must be generic — never the raw backend/resize
    // error text — while `onError` still receives the real error unchanged.
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(screen.queryByText("decode failed")).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe("decode failed");
  });

  it("REGRESSION: a rejecting upload resets uploading to false and surfaces a generic failure message", async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const { container } = render(
      <ImageUploader {...baseProps({ onUpload, onChange, onError })} />,
    );

    await selectFile(container, makeFile());

    const trigger = screen.getByRole("button", { name: /add photo/i });
    await waitFor(() => expect(trigger).toBeEnabled());
    // Raw backend error text (e.g. a Supabase RLS message) must never reach
    // the end user inline; onError still gets the original error.
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(screen.queryByText("storage 403")).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe("storage 403");
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
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();

    await selectFile(container, makeFile());
    await waitFor(() =>
      expect(screen.queryByText("Upload failed")).not.toBeInTheDocument(),
    );
  });

  it("clears a previous error when a new value is set from outside (e.g. a successful save elsewhere)", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const { container, rerender } = render(
      <ImageUploader {...baseProps({ onUpload, value: null })} />,
    );

    await selectFile(container, makeFile());
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();

    rerender(
      <ImageUploader
        {...baseProps({ onUpload, value: "https://cdn.example.test/external.webp" })}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByText("Upload failed")).not.toBeInTheDocument(),
    );
  });

  it("clears a previous error when the remove button is clicked", async () => {
    // The hidden file input is a permanent sibling regardless of `value`, so
    // an upload can still be attempted (and fail) while a value/preview is
    // already showing. `onChange` is a stub here, so the `value` prop itself
    // never changes — isolating the remove button's own direct clear from
    // the separate value-change effect.
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const onChange = vi.fn();
    const { container } = render(
      <ImageUploader
        {...baseProps({
          onUpload,
          onChange,
          value: "https://cdn.example.test/external.webp",
        })}
      />,
    );

    await selectFile(container, makeFile());
    expect(await screen.findByText("Upload failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    await waitFor(() =>
      expect(screen.queryByText("Upload failed")).not.toBeInTheDocument(),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("resets the input value so re-picking the same file fires another change", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);

    await selectFile(container, makeFile());

    expect(input.value).toBe("");
  });

  it("the inline error message has role=\"alert\" for assistive tech, consistent with AccountMenu/FeedbackSheet/HelpSheet", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("storage 403"));
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    await selectFile(container, makeFile());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Upload failed");
  });

  it("the trigger has aria-busy=true while uploading and false/absent when idle", async () => {
    let release: (url: string) => void = () => {};
    const onUpload = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { container } = render(<ImageUploader {...baseProps({ onUpload })} />);

    const trigger = screen.getByRole("button", { name: /add photo/i });
    expect(trigger).not.toHaveAttribute("aria-busy", "true");

    await selectFile(container, makeFile());
    await waitFor(() => expect(trigger).toHaveAttribute("aria-busy", "true"));

    await act(async () => {
      release("https://cdn.example.test/a.webp");
    });

    await waitFor(() => expect(trigger).not.toHaveAttribute("aria-busy", "true"));
  });

  it("clicking the trigger opens the file picker", async () => {
    const { container } = render(<ImageUploader {...baseProps()} />);
    const input = fileInput(container);
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: /add photo/i }));

    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("ImageUploader — preview and variants", () => {
  it("renders a preview instead of the trigger when value is set", () => {
    render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/current.webp" })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /add photo/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove image" }),
    ).toBeInTheDocument();
  });

  it("the default preview renderer is a plain <img> pointed at value", () => {
    const { container } = render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/current.webp" })}
      />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.example.test/current.webp");
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders an injected imageComponent (e.g. next/image) with fill and sizes", () => {
    const imageComponent = vi.fn((_props: ImagePreviewProps) => (
      <span data-testid="injected" />
    ));
    render(
      <ImageUploader
        {...baseProps({
          value: "https://cdn.example.test/current.webp",
          imageComponent,
        })}
      />,
    );

    expect(screen.getByTestId("injected")).toBeInTheDocument();
    const props = imageComponent.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(props.src).toBe("https://cdn.example.test/current.webp");
    expect(props.fill).toBe(true);
    expect(props.sizes).toBe("5rem");
  });

  it("passes the wide sizes hint for the banner variant", () => {
    const imageComponent = vi.fn((_props: ImagePreviewProps) => (
      <span data-testid="injected" />
    ));
    render(
      <ImageUploader
        {...baseProps({
          value: "https://cdn.example.test/current.webp",
          variant: "banner",
          imageComponent,
        })}
      />,
    );

    const props = imageComponent.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(props.sizes).toBe("(max-width: 640px) 100vw, 28rem");
  });

  it("the remove button clears the value via onChange(null)", async () => {
    const onChange = vi.fn();
    render(
      <ImageUploader
        {...baseProps({ value: "https://cdn.example.test/a.webp", onChange })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("banner variant renders the booth-banner copy and the wide box", () => {
    render(<ImageUploader {...baseProps({ variant: "banner" })} />);

    const trigger = screen.getByRole("button", { name: /add a booth banner/i });
    expect(trigger).toHaveClass("h-40", "w-full");
    expect(
      screen.getByText("Best at a 3:1 wide ratio (e.g. 1200×400)"),
    ).toBeInTheDocument();
  });

  it("thumb variant renders the square box and short copy", () => {
    render(<ImageUploader {...baseProps()} />);

    const trigger = screen.getByRole("button", { name: /add photo/i });
    expect(trigger).toHaveClass("size-20", "shrink-0");
    expect(screen.getByText("JPG · PNG · WebP")).toBeInTheDocument();
  });

  it("banner variant resizes to 1600 on its longest side", async () => {
    const resizeImage = vi.fn().mockResolvedValue({
      blob: new Blob(["r"], { type: "image/webp" }),
      ext: "webp",
      type: "image/webp",
    });
    const { container } = render(
      <ImageUploader {...baseProps({ variant: "banner", resizeImage })} />,
    );

    await selectFile(container, makeFile());

    await waitFor(() =>
      expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 1600),
    );
  });

  it("an explicit maxDim overrides the variant default", async () => {
    const resizeImage = vi.fn().mockResolvedValue({
      blob: new Blob(["r"], { type: "image/webp" }),
      ext: "webp",
      type: "image/webp",
    });
    const { container } = render(
      <ImageUploader
        {...baseProps({ variant: "banner", maxDim: 640, resizeImage })}
      />,
    );

    await selectFile(container, makeFile());

    await waitFor(() =>
      expect(resizeImage).toHaveBeenCalledWith(expect.any(File), 640),
    );
  });

  it("banner shows the 'Optimizing…' label while an upload is in flight", async () => {
    let release: (url: string) => void = () => {};
    const onUpload = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve)),
    );
    const { container } = render(
      <ImageUploader {...baseProps({ variant: "banner", onUpload })} />,
    );

    await selectFile(container, makeFile());

    expect(await screen.findByText("Optimizing…")).toBeInTheDocument();

    await act(async () => {
      release("https://cdn.example.test/a.webp");
    });
    await waitFor(() =>
      expect(screen.queryByText("Optimizing…")).not.toBeInTheDocument(),
    );
  });

  it("uses no literal colour, font-family or radius values anywhere in the source", async () => {
    // `import.meta.url` is captured before the first `await`: under this
    // project's vitest/jsdom setup on Windows, reading it after an `await`
    // inside an async test resolves to jsdom's `http://localhost:3000/...`
    // instead of the real `file://` URL, which makes `fs.readFile` throw
    // "The URL must be of scheme file" — a vite-node/jsdom quirk unrelated
    // to this component.
    const moduleUrl = import.meta.url;
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./image-uploader.tsx", moduleUrl), "utf-8"),
    );
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgb\(|\bhsl\(|\boklch\(/);
    expect(source).not.toMatch(/rounded-\[/);
    expect(source).not.toMatch(/font-\[/);
  });
});

describe("ImageUploader — package entry point", () => {
  it("is exported from the package root", async () => {
    const pkg = await import("./index");
    expect(pkg.ImageUploader).toBe(ImageUploader);
  });
});
