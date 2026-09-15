import QRCode from "qrcode";

/**
 * Renders `text` as an inline SVG markup string, for a caller to embed via
 * `dangerouslySetInnerHTML` (e.g. a Telegram deep link, a shop-join QR).
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
