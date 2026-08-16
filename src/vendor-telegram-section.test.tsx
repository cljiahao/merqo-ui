import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VendorTelegramSection } from "./vendor-telegram-section";

describe("VendorTelegramSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disconnected: shows a Connect Telegram action, no QR/link before it's clicked", () => {
    const onConnect = vi.fn();
    render(
      <VendorTelegramSection connected={false} onConnect={onConnect} />,
    );
    expect(
      screen.getByRole("button", { name: /connect telegram/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("disconnected: clicking Connect Telegram mints a token and renders the deep link + QR", async () => {
    const onConnect = vi.fn().mockResolvedValue({
      deepLink: "https://t.me/MerqoNotifyBot?start=abc123",
      qrSvgMarkup: "<svg data-testid='qr' />",
    });
    render(
      <VendorTelegramSection connected={false} onConnect={onConnect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /connect telegram/i }));

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByTestId("qr")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /t\.me\/MerqoNotifyBot/ }),
    ).toHaveAttribute("href", "https://t.me/MerqoNotifyBot?start=abc123");
  });

  it("disconnected: surfaces a connect failure via onError without rendering a link", async () => {
    const onError = vi.fn();
    const onConnect = vi.fn().mockRejectedValue(new Error("mint failed"));
    render(
      <VendorTelegramSection
        connected={false}
        onConnect={onConnect}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /connect telegram/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("connected: shows a connected status and a disconnect action", async () => {
    const onDisconnect = vi.fn().mockResolvedValue(undefined);
    render(
      <VendorTelegramSection connected={true} onDisconnect={onDisconnect} />,
    );

    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect telegram/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  it("connected: surfaces a disconnect failure via onError", async () => {
    const onError = vi.fn();
    const onDisconnect = vi.fn().mockRejectedValue(new Error("boom"));
    render(
      <VendorTelegramSection
        connected={true}
        onDisconnect={onDisconnect}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});
